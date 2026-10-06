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
from .models import CertificateRequest, Role, SacramentalRecord
from .models.base import utcnow
from .models.enums import AuditAction, RequestStatus

certificates_bp = Blueprint("certificates", __name__)


class CertificateRequestForm(Form):
    """File a request for a certified copy."""

    record_id = SelectField("Register entry", validate_choice=False)
    requester_name = StringField("Requested by", max_length=160)
    requester_contact = StringField("Contact", max_length=255, required=False)
    purpose = StringField("Purpose", max_length=255, required=False)

    def validate_on_submit(self) -> None:
        if not self.requester_name:
            self._error(
                "requester_name",
                "Name the person the certificate is for.",
            )


class RejectForm(Form):
    """Close a request with a stated reason."""

    reason = TextAreaField("Reason")


def _can_certify(user) -> bool:
    """Whether *user* may verify, approve or issue certificates."""
    return user.can_issue_certificates


@certificates_bp.route("/certificates")
@login_required
def index():
    """The certificate queue."""
    status_value = request.args.get("status", "").strip()
    status = (
        RequestStatus(status_value) if status_value in RequestStatus.values() else None
    )
    open_only = request.args.get("open") == "1"

    statement = services.requests_query(
        current_user, status=status, open_only=open_only
    )
    pagination = db.paginate(
        statement.order_by(CertificateRequest.created_at.desc()),
        page=request.args.get("page", 1, type=int),
        per_page=25,
        error_out=False,
    )

    return render_template(
        "certificates/index.html",
        pagination=pagination,
        stats=services.certificate_stats(),
        statuses=RequestStatus,
        selected_status=status_value,
        open_only=open_only,
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
        can_approve=current_user.role in (Role.ADMIN, Role.CHANCERY),
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

    # Approval is a chancery act: a parish verifies, the chancery authorises.
    if target is RequestStatus.APPROVED and not current_user.role in (
        Role.ADMIN,
        Role.CHANCERY,
    ):
        abort(403, description="Only the chancery may approve an issue.")

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
    elif target is RequestStatus.REJECTED:
        item.rejected_by_user = current_user
        item.rejected_at = now
        item.rejection_reason = reason
    elif target is RequestStatus.CANCELLED:
        item.rejected_by_user = current_user
        item.rejected_at = now
        item.rejection_reason = reason or "Cancelled."

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