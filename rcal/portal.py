"""The parishioner portal (FR-1.2, FR-3.1, FR-3.3).

The public side of the system. A parishioner registers an account, files a
request for a church document, and tracks it. They see their own requests
and nothing else — not the registers the requests are matched against,
not another parishioner's request, not a single internal figure.

The isolation is enforced in two independent places on purpose:

1. :func:`rcal.auth.register_role_isolation` refuses any parishioner
   request whose path falls under an internal module prefix.
2. Every query in this module filters on ``requester_user_id``, so even if
   a parishioner somehow reached a portal view, the data returned to them
   is only ever their own.

The first stops the request; the second means the data was never loaded.
Either alone would be a single point of failure.

The document request itself is intentionally *not* a
:class:`~rcal.models.CertificateRequest`. That model requires a register
entry to exist and be linked, which is exactly what staff establish during
verification (FR-2.11). A parishioner files a claim about a record; staff
match it to one. Keeping them as separate rows means a portal submission
cannot fabricate a link to a register entry it has not been matched to.
"""

from datetime import date, datetime, timezone

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
from sqlalchemy import func, or_, select

from . import audit
from .extensions import db
from .forms import BooleanField, Form, StringField, TextAreaField
from .models import DocumentRequest, Parish, User
from .models.enums import AuditAction, Role, SacramentType

portal_bp = Blueprint("portal", __name__)


class RegistrationForm(Form):
    """Self-registration for a parishioner account.

    Deliberately narrow. A parishioner chooses only their own contact
    details; the role is set by the server, never submitted by the form,
    so a crafted POST cannot grant itself a staff role.
    """

    first_name = StringField("First name", max_length=80)
    last_name = StringField("Surname", max_length=80)
    email = StringField("Email", max_length=255)
    phone = StringField("Mobile number", max_length=30, required=False)
    address = TextAreaField("Home address", max_length=500, required=False)
    password = StringField("Password")

    def validate_on_submit(self) -> None:
        if self.email and "@" not in self.email:
            self._error("email", "Enter a valid email address.")
        if not self.email:
            self._error("email", "An email address is required so we can reach you.")
        if self.password and len(self.password) < 8:
            self._error("password", "Password must be at least 8 characters.")


class DocumentRequestForm(Form):
    """FR-3.1: what the parishioner claims about the record they want.

    These are claims, not facts. Staff verify them against the register
    (FR-2.11); nothing here is trusted as a record lookup.
    """

    sacrament_type = StringField("Document needed")
    name_on_record = StringField("Name as it appears on the record", max_length=160)
    date_of_birth = StringField("Date of birth (YYYY-MM-DD)", required=False)
    date_of_sacrament = StringField("Date of the sacrament (YYYY-MM-DD)", required=False)
    #: Optional: a parishioner often does not know which parish holds the
    #: old register, and refusing the request over it would block exactly
    #: the people the portal exists to help.
    place_of_sacrament = StringField("Parish where it was recorded", max_length=160, required=False)
    parents_or_spouse = StringField("Parents' or spouse's names", max_length=255, required=False)
    purpose = StringField("Purpose of the request", max_length=255, required=False)
    #: Declared so the checkbox has something to be read into; validated in
    #: validate_on_submit below.
    consent = BooleanField("Data privacy consent")

    def validate_on_submit(self) -> None:
        if self.sacrament_type not in SacramentType.values():
            self._error("sacrament_type", "Choose the kind of document you need.")

        # Consent is checked here, alongside the other fields, rather than
        # in the view after validate() succeeds. Otherwise an unrelated
        # error elsewhere on the form would pre-empt this check and the
        # parishioner would never be told what is actually missing.
        if not getattr(self, "consent", None):
            self._error(
                "consent",
                "You must accept the data privacy notice to submit a request.",
            )


def _current_parishioner() -> User:
    """The signed-in parishioner, or 403.

    Belt and braces on top of the global guard: a staff account that
    reached a portal view would otherwise act as a parishioner.
    """
    if not current_user.is_authenticated or not current_user.role.is_parishioner:
        abort(403)
    return current_user


# --- registration and access -------------------------------------------


@portal_bp.route("/portal/register", methods=["GET", "POST"])
def register():
    """Sign up for a parishioner account (FR-1.2)."""
    if current_user.is_authenticated:
        if current_user.role.is_parishioner:
            return redirect(url_for("portal.dashboard"))
        return redirect(url_for("auth.dashboard"))

    form = RegistrationForm()
    if request.method == "POST" and form.validate():
        email = form.email.lower()
        # Both columns are checked because both are unique: the username is
        # derived from the email, so a match on either means the account
        # already exists. Checking only one would let the other constraint
        # fail with an unhandled IntegrityError.
        existing = db.session.scalar(
            select(User).where(
                or_(func.lower(User.email) == email, func.lower(User.username) == email)
            )
        )
        if existing is not None:
            # Deliberately vague: confirming "that email is registered"
            # would turn this form into a way to check who has an account.
            flash(
                "If that email is not already registered, the account is now "
                "ready. Try signing in.",
                "success",
            )
            return redirect(url_for("auth.login"))

        account = User(
            username=email,
            email=email,
            display_name=f"{form.first_name} {form.last_name}".strip(),
            # Set here, not read from the form: the role must never be
            # something the client can choose.
            role=Role.PARISHIONER,
            phone=form.phone or None,
            postal_address=form.address or None,
            is_active=True,
            email_verified=False,
        )
        account.set_password(form.password)
        db.session.add(account)
        db.session.commit()

        audit.record(
            AuditAction.CREATE,
            subject=account,
            note="Parishioner self-registration",
            # Recorded after the account exists, so no email address is
            # written to the trail for a registration that failed.
            user=account,
        )
        db.session.commit()

        flash("Your account has been created. Please sign in.", "success")
        return redirect(url_for("auth.login"))

    return render_template("portal/register.html", form=form)


@portal_bp.route("/portal")
@login_required
def dashboard():
    """The parishioner's own requests and their status (FR-3.3)."""
    parishioner = _current_parishioner()

    requests = db.session.scalars(
        select(DocumentRequest)
        .where(DocumentRequest.parishioner_id == parishioner.id)
        .order_by(DocumentRequest.created_at.desc())
    ).all()

    audit.record(AuditAction.VIEW, subject=parishioner, note="Viewed own portal")
    db.session.commit()

    return render_template(
        "portal/dashboard.html",
        requests=requests,
        open_count=sum(1 for r in requests if r.is_open),
    )


# --- document requests -------------------------------------------------


@portal_bp.route("/portal/requests/new", methods=["GET", "POST"])
@login_required
def new_request():
    """File a request for a church document (FR-3.1, FR-3.2, FR-3.3)."""
    parishioner = _current_parishioner()
    form = DocumentRequestForm()
    parishes = db.session.scalars(
        select(Parish).where(Parish.is_active.is_(True)).order_by(Parish.name)
    ).all()

    if request.method == "POST" and form.validate():
        item = DocumentRequest(
            parishioner=parishioner,
            sacrament_type=SacramentType(form.sacrament_type),
            name_on_record=form.name_on_record,
            date_of_birth=_parse_date(form.date_of_birth),
            date_of_sacrament=_parse_date(form.date_of_sacrament),
            place_of_sacrament=form.place_of_sacrament,
            parents_or_spouse=form.parents_or_spouse or None,
            purpose=form.purpose or None,
            targeted_parish_id=_parse_int(request.form.get("targeted_parish_id")),
            # Consent is stamped with a time, because "they agreed" is only
            # useful evidence if it says when. The checkbox itself is
            # validated by the form, alongside the other fields.
            consent_given_at=datetime.now(timezone.utc),
        )
        db.session.add(item)
        db.session.flush()

        audit.record(
            AuditAction.CREATE,
            subject=item,
            subject_label=f"{item.sacrament_type.label} for {item.name_on_record}",
            new_values={
                "sacrament_type": item.sacrament_type.value,
                "name_on_record": item.name_on_record,
                "purpose": item.purpose,
            },
            note="Submitted through the parishioner portal",
        )
        db.session.commit()
        flash("Your request has been submitted for verification.", "success")
        return redirect(url_for("portal.dashboard"))

    return render_template(
        "portal/request_form.html",
        form=form,
        parishes=parishes,
        sacraments=SacramentType,
        today=date.today().isoformat(),
    )


@portal_bp.route("/portal/requests/<int:request_id>")
@login_required
def request_detail(request_id: int):
    """Track one of the parishioner's own requests (FR-3.3)."""
    parishioner = _current_parishioner()

    # The ownership filter is part of the query, not a check afterwards:
    # another parishioner's request is never loaded, so there is no row to
    # leak by a mistake in the template.
    item = db.session.scalar(
        select(DocumentRequest).where(
            DocumentRequest.id == request_id,
            DocumentRequest.parishioner_id == parishioner.id,
        )
    )
    if item is None:
        abort(404)

    return render_template("portal/request_detail.html", item=item)


def _parse_date(raw: str):
    try:
        return date.fromisoformat((raw or "").strip())
    except ValueError:
        return None


def _parse_int(raw):
    try:
        return int((raw or "").strip())
    except (TypeError, ValueError):
        return None
