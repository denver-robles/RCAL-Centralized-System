"""The certified-copy workflow: requested -> verified -> approved -> issued.

This is the system's actual deliverable. A citizen does not receive a
screenshot of a database row; they receive a certificate whose number can be
checked against the register it came from, years later.

Three rules are enforced here rather than left to the templates.

**The verification step cannot be skipped.** Each move is checked against
``RequestStatus.TRANSITIONS``, so a request cannot jump from pending straight
to issued, and an already-issued request cannot be reopened.

**Every step is attributed.** Verified, approved, issued and rejected each
record who did it and when, because the certificate is evidence and its
provenance has to survive.

**Issuing is reserved to the roles that may certify.** A read-only account
can request a copy but cannot issue one.
"""

from flask import (
    Blueprint,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from . import audit, services
from .auth import roles_required
from .extensions import db
from .forms import Form, SelectField, StringField, TextAreaField
from .models import CertificateRequest, DocumentRequest, Role, SacramentalRecord
from .models.base import utcnow
from .models.enums import AuditAction, DocumentRequestStatus, RequestStatus

certificates_bp = Blueprint("certificates", __name__)


class CertificateRequestForm(Form):
    """File a request for a certified copy."""

    record_id = SelectField("Register entry", validate_choice=False, required=True)
    requester_name = StringField("Requested by", min_length=2, max_length=160, required=True)
    requester_contact = StringField("Contact", max_length=255, required=False)
    purpose = StringField("Purpose", min_length=2, max_length=255, required=False)

    def validate_on_submit(self) -> None:
        if not self.requester_name or not str(self.requester_name).strip():
            self._error(
                "requester_name",
                "Name the person the certificate is for.",
            )


class RejectForm(Form):
    """Close a request with a stated reason."""

    reason = TextAreaField("Reason", min_length=3, max_length=1000, required=True)


def _can_certify(user) -> bool:
    """Whether *user* may verify, approve or issue certificates."""
    return user.can_issue_certificates


class SimplePagination:
    """Lightweight in-memory pagination compatible with pagination_nav."""

    def __init__(self, items: list, page: int = 1, per_page: int = 25):
        self.total = len(items)
        self.per_page = per_page
        self.pages = max(1, (self.total + per_page - 1) // per_page)
        self.page = min(max(1, page), self.pages)
        start = (self.page - 1) * per_page
        self.items = items[start : start + per_page]

    @property
    def has_prev(self) -> bool:
        return self.page > 1

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def prev_num(self) -> int:
        return self.page - 1

    @property
    def next_num(self) -> int:
        return self.page + 1

    def iter_pages(self):
        for p in range(1, self.pages + 1):
            yield p


@certificates_bp.route("/certificates")
@login_required
def index():
    """The certificate and parishioner request queue."""
    view = request.args.get("view", "all").strip().lower()
    if view not in ("all", "parishioner", "internal"):
        view = "all"

    status_value = request.args.get("status", "").strip()
    open_only = request.args.get("open") == "1"

    cert_stmt = services.requests_query(current_user)
    doc_stmt = services.document_requests_query(current_user)

    cert_items = list(db.session.scalars(cert_stmt).all())
    doc_items = list(db.session.scalars(doc_stmt).all())

    # Build status choices for filter dropdown
    status_choices = {
        "pending": "Pending / New",
        "verified": "Verified",
        "approved": "Approved",
        "processing": "Processing / Being prepared",
        "ready": "Ready for pickup",
        "issued": "Completed / Issued",
        "rejected": "Rejected",
        "cancelled": "Cancelled",
    }
    if view == "parishioner":
        status_choices = {s.value: s.label for s in DocumentRequestStatus}
    elif view == "internal":
        status_choices = {s.value: s.label for s in RequestStatus}

    # Filter items
    if open_only:
        cert_items = [c for c in cert_items if c.is_open]
        doc_items = [d for d in doc_items if d.is_open]

    if status_value:
        def _matches_status(item, val):
            if val == "pending":
                return item.status.value in ("pending", "submitted", "under_review")
            if val == "issued":
                return item.status.value in ("issued", "completed")
            return item.status.value == val

        cert_items = [c for c in cert_items if _matches_status(c, status_value)]
        doc_items = [d for d in doc_items if _matches_status(d, status_value)]

    if view == "parishioner":
        combined_items = sorted(doc_items, key=lambda x: x.created_at, reverse=True)
    elif view == "internal":
        combined_items = sorted(cert_items, key=lambda x: x.created_at, reverse=True)
    else:
        combined_items = sorted(doc_items + cert_items, key=lambda x: x.created_at, reverse=True)

    page = request.args.get("page", 1, type=int)
    pagination = SimplePagination(combined_items, page=page, per_page=25)
    stats = services.combined_request_stats(current_user)

    return render_template(
        "certificates/index.html",
        pagination=pagination,
        stats=stats,
        statuses=status_choices,
        selected_status=status_value,
        open_only=open_only,
        view=view,
        can_certify=_can_certify(current_user),
    )


@certificates_bp.route("/certificates/new", methods=["GET", "POST"])
@login_required
def create():
    """File a request for a certified copy of one register entry."""
    form = CertificateRequestForm()

    if request.method == "POST" and form.validate():
        record = db.session.get(SacramentalRecord, int(form.record_id or 0))
        if record is None:
            form._error("record_id", "Choose a register entry.")
        elif not services.can_view_record(current_user, record):
            form._error("record_id", "That entry is not in a register you may read.")
        else:
            services.log_access(current_user, record, action="certificate_request")
            item = CertificateRequest(
                record=record,
                requester_user=current_user,
                requester_name=form.requester_name,
                requester_contact=form.requester_contact or None,
                purpose=form.purpose or None,
                status=RequestStatus.PENDING,
            )
            db.session.add(item)
            db.session.commit()
            flash("Certificate request filed.", "success")
            return redirect(url_for("certificates.detail", request_id=item.id))

    statement = services.records_query(current_user)
    records = {
        str(record.id): (
            f"{record.person.full_name} — {record.sacrament_type.label}, "
            f"{record.event_date:%d %b %Y} — {record.originating_parish.name} "
            f"({record.citation})"
        )
        for record in db.session.scalars(statement.limit(200)).unique()
    }

    return render_template(
        "certificates/request_form.html",
        form=form,
        records=records,
    )


def _can_view(user, item: CertificateRequest) -> bool:
    """Whether *user* may open a certificate request."""
    return services.can_view_request(user, item)


@certificates_bp.route("/certificates/<int:request_id>")
@login_required
def detail(request_id: int):
    """One request, with its audit trail and the steps still available."""
    item = db.get_or_404(CertificateRequest, request_id)
    if not _can_view(current_user, item):
        abort(403)

    return render_template(
        "certificates/detail.html",
        item=item,
        # The template asks the workflow which steps exist rather than
        # re-deriving them from the status, so the page can never offer a
        # step the server would refuse.
        step_actions=[
            _ACTION_FOR[status]
            for status in item.status.allowed_transitions()
            if status in _ACTION_FOR
        ],
        can_certify=_can_certify(current_user),
        can_approve=current_user.role in (Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF),
        reject_form=RejectForm(),
    )


@certificates_bp.post("/certificates/<int:request_id>/<string:action>")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def transition(request_id: int, action: str):
    """Move a request to its next status, recording who did it.

    One route for every step, because the audit fields each step needs are the same shape; only the status and the actor column differ, and
        those are named in :data:`_ACTION_FOR`.
        """
    item = db.get_or_404(CertificateRequest, request_id)
    if not _can_view(current_user, item):
        abort(403)
    if not _can_certify(current_user):
        abort(403)

    target = _resolve_action(action)
    if target is None:
        abort(404)

    # Captured before the change so the trail can show the transition.
    old_status = item.status

    if not item.status.can_transition_to(target):
        flash(
            f"A request that is {item.status.label.lower()} cannot be moved to "
            f"{target.label.lower()}.",
            "error",
        )
        return redirect(url_for("certificates.detail", request_id=item.id))

    # Approval can be done by admin, chancery, or parish staff
    if target is RequestStatus.APPROVED and not current_user.role in (
        Role.ADMIN,
        Role.CHANCERY,
        Role.PARISH_STAFF,
    ):
        abort(403, description="Only authorized staff may approve an issue.")

    reason = request.form.get("reason", "").strip()
    if target is RequestStatus.REJECTED and not reason:
        flash("A rejected request must state the reason.", "error")
        return redirect(url_for("certificates.detail", request_id=item.id))

    item.status = target
    now = utcnow()
    previous = old_status

    if target is RequestStatus.VERIFIED:
        item.verified_by_user = current_user
        item.verified_at = now
    elif target is RequestStatus.APPROVED:
        item.approved_by_user = current_user
        item.approved_at = now
    elif target is RequestStatus.ISSUED:
        number = services.next_certificate_number()
        try:
            item.certificate_number = number
            db.session.flush()
        except IntegrityError:
            # Two clerks issued at the same moment; the number is retried
            # rather than handing out a duplicate.
            db.session.rollback()
            item = db.get_or_404(CertificateRequest, request_id)
            item.certificate_number = services.next_certificate_number() + "-R"
            db.session.flush()
        item.issued_by_user = current_user
        item.issued_at = now
        linked_doc = db.session.scalar(
            select(DocumentRequest).where(DocumentRequest.certificate_request_id == item.id)
        )
        if linked_doc:
            linked_doc.status = DocumentRequestStatus.COMPLETED
    elif target is RequestStatus.REJECTED:
        item.rejected_by_user = current_user
        item.rejected_at = now
        item.rejection_reason = reason
        linked_doc = db.session.scalar(
            select(DocumentRequest).where(DocumentRequest.certificate_request_id == item.id)
        )
        if linked_doc:
            linked_doc.status = DocumentRequestStatus.REJECTED
            linked_doc.rejection_reason = reason
    elif target is RequestStatus.CANCELLED:
        item.rejected_by_user = current_user
        item.rejected_at = now
        item.rejection_reason = reason or "Cancelled."
        linked_doc = db.session.scalar(
            select(DocumentRequest).where(DocumentRequest.certificate_request_id == item.id)
        )
        if linked_doc:
            linked_doc.status = DocumentRequestStatus.CANCELLED
            linked_doc.rejection_reason = reason or "Cancelled."

    services.log_access(current_user, item.record, action=f"certificate_{action}")

    # A status change is the audit event FR-1.4 is most concerned with: it
    # moves a citizen's document along, and it has to be attributable.
    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=item,
        subject_label=f"Certificate request #{item.id}",
        old_values={"status": previous.value},
        new_values={"status": target.value},
        note=reason or None,
    )
    db.session.commit()
    flash(f"Request {item.status.label.lower()}.", "success")
    return redirect(url_for("certificates.detail", request_id=item.id))


#: Which URL segment moves a request to which status. The workflow's own
#: ``can_transition_to`` remains the authority on whether the move is legal;
#: this only maps a button to the row it should update.
_ACTION_FOR = {
    RequestStatus.VERIFIED: "verify",
    RequestStatus.APPROVED: "approve",
    RequestStatus.ISSUED: "issue",
    RequestStatus.REJECTED: "reject",
    RequestStatus.CANCELLED: "cancel",
}


def _resolve_action(action: str) -> RequestStatus | None:
    """Map a URL segment to the status it moves to."""
    return {
        "verify": RequestStatus.VERIFIED,
        "approve": RequestStatus.APPROVED,
        "issue": RequestStatus.ISSUED,
        "reject": RequestStatus.REJECTED,
        "cancel": RequestStatus.CANCELLED,
    }.get(action)


@certificates_bp.route("/certificates/<int:request_id>/certificate")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def print_certificate(request_id: int):
    """The printable certified copy — the real deliverable.

    Only an issued request can produce one, because the certificate number
    and the signature block must exist before anything is handed over.
    """
    item = db.get_or_404(CertificateRequest, request_id)
    if not _can_view(current_user, item):
        abort(403)
    if item.status is not RequestStatus.ISSUED:
        abort(404)

    services.log_access(current_user, item.record, action="certificate_print")
    # Printing a certificate is a distinct, accountable act: it is the
    # moment a certified copy leaves the building.
    audit.record(
        AuditAction.PRINT,
        subject=item,
        subject_label=f"Certificate {item.certificate_number}",
        note=f"Printed the certified copy for {item.requester_name}",
    )
    db.session.commit()

    return render_template("certificates/certificate.html", item=item)



# --- parishioner document-request inbox ------------------------------------
#
# The portal creates DocumentRequest rows. Staff need to see them, match
# them to a register entry, and either create a CertificateRequest or
# close them. These routes are the bridge between the two models.


@certificates_bp.route("/certificates/parishioner-requests")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def document_requests():
    """The inbox: document requests filed through the parishioner portal."""
    status_value = request.args.get("status", "").strip()
    status = (
        DocumentRequestStatus(status_value)
        if status_value in DocumentRequestStatus.values()
        else None
    )

    statement = services.document_requests_query(current_user, status=status)
    pagination = db.paginate(
        statement.order_by(DocumentRequest.created_at.desc()),
        page=request.args.get("page", 1, type=int),
        per_page=25,
        error_out=False,
    )

    return render_template(
        "certificates/document_requests.html",
        pagination=pagination,
        stats=services.document_request_stats(current_user),
        statuses=DocumentRequestStatus,
        selected_status=status_value,
    )


@certificates_bp.route("/certificates/parishioner-requests/<int:request_id>")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def document_request_detail(request_id: int):
    """Review a single parishioner request and decide what to do with it."""
    item = db.get_or_404(DocumentRequest, request_id)
    if not services.can_view_document_request(current_user, item):
        abort(403)

    # Mark as under review the first time staff open it.
    if item.status is DocumentRequestStatus.SUBMITTED:
        item.status = DocumentRequestStatus.UNDER_REVIEW
        audit.record(
            AuditAction.STATUS_CHANGE,
            subject=item,
            subject_label=f"Document request #{item.id}",
            old_values={"status": DocumentRequestStatus.SUBMITTED.value},
            new_values={"status": DocumentRequestStatus.UNDER_REVIEW.value},
            note="Opened by staff for review",
        )
        db.session.commit()

    # Build the register-entry choices for the match form.
    # Allow staff to view and match records across the archdiocese just like admin
    records_stmt = select(SacramentalRecord)
    if item.sacrament_type:
        records_stmt = records_stmt.order_by(
            (SacramentalRecord.sacrament_type == item.sacrament_type).desc(),
            SacramentalRecord.created_at.desc(),
        )
    else:
        records_stmt = records_stmt.order_by(SacramentalRecord.created_at.desc())

    records = {
        str(record.id): (
            f"{record.person.full_name} — {record.sacrament_type.label}, "
            f"{record.event_date:%d %b %Y} — {record.originating_parish.name} "
            f"({record.citation})"
        )
        for record in db.session.scalars(records_stmt.limit(200)).unique()
    }

    return render_template(
        "certificates/document_request_detail.html",
        item=item,
        records=records,
        can_handle=current_user.role.can_handle_requests,
    )


@certificates_bp.post(
    "/certificates/parishioner-requests/<int:request_id>/match"
)
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def match_document_request(request_id: int):
    """Match a parishioner claim to a register entry and spawn a CertificateRequest."""
    item = db.get_or_404(DocumentRequest, request_id)
    if not services.can_view_document_request(current_user, item):
        abort(403)
    if item.certificate_request_id is not None:
        flash("This request has already been matched.", "error")
        return redirect(
            url_for("certificates.document_request_detail", request_id=item.id)
        )

    record_id = request.form.get("record_id", type=int)
    record = db.session.get(SacramentalRecord, record_id) if record_id else None
    if record is None:
        flash("Choose a register entry to match.", "error")
        return redirect(
            url_for("certificates.document_request_detail", request_id=item.id)
        )
    if not (services.can_view_record(current_user, record) or current_user.role in (Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)):
        flash("That entry is not in a register you may read.", "error")
        return redirect(
            url_for("certificates.document_request_detail", request_id=item.id)
        )

    # Create the internal certificate request linked to the register entry.
    services.log_access(current_user, record, action="document_request_match")
    cert_req = CertificateRequest(
        record=record,
        requester_user=item.parishioner,
        requester_name=item.parishioner.display_name or item.parishioner.username,
        requester_contact=item.parishioner.email,
        purpose=item.purpose,
        status=RequestStatus.PENDING,
    )
    db.session.add(cert_req)
    db.session.flush()

    # Link the document request to the matched record and certificate request.
    item.matched_record_id = record.id
    item.certificate_request_id = cert_req.id
    item.status = DocumentRequestStatus.PROCESSING
    item.internal_note = request.form.get("internal_note", "").strip() or None

    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=item,
        subject_label=f"Document request #{item.id}",
        new_values={
            "status": DocumentRequestStatus.PROCESSING.value,
            "matched_record_id": record.id,
            "certificate_request_id": cert_req.id,
        },
        note=f"Matched to record #{record.id} and certificate request #{cert_req.id}",
    )
    db.session.commit()

    flash(
        f"Request matched to {record.person.full_name}. "
        f"Certificate request #{cert_req.id} created.",
        "success",
    )
    return redirect(url_for("certificates.detail", request_id=cert_req.id))


@certificates_bp.post(
    "/certificates/parishioner-requests/<int:request_id>/reject"
)
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF)
def reject_document_request(request_id: int):
    """Close a parishioner request as not found or rejected."""
    item = db.get_or_404(DocumentRequest, request_id)
    if not services.can_view_document_request(current_user, item):
        abort(403)
    if item.status.is_closed:
        flash("This request is already closed.", "error")
        return redirect(
            url_for("certificates.document_request_detail", request_id=item.id)
        )

    action = request.form.get("action", "")
    reason = request.form.get("reason", "").strip()

    if action == "record_not_found":
        item.status = DocumentRequestStatus.RECORD_NOT_FOUND
    elif action == "rejected":
        if not reason:
            flash("A rejection must state the reason.", "error")
            return redirect(
                url_for(
                    "certificates.document_request_detail", request_id=item.id
                )
            )
        item.status = DocumentRequestStatus.REJECTED
    else:
        flash("Choose an action.", "error")
        return redirect(
            url_for("certificates.document_request_detail", request_id=item.id)
        )

    item.rejection_reason = reason or None

    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=item,
        subject_label=f"Document request #{item.id}",
        new_values={"status": item.status.value},
        note=reason or None,
    )
    db.session.commit()

    flash(f"Request {item.status.label.lower()}.", "success")
    return redirect(
        url_for("certificates.document_request_detail", request_id=item.id)
    )