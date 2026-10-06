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

from datetime import date, datetime, time, timedelta, timezone
import re

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
from .forms import (
    BooleanField,
    DateField,
    EmailField,
    Form,
    IntegerField,
    PasswordField,
    PhoneField,
    SelectField,
    StringField,
    TextAreaField,
)
from .models import DocumentRequest, Parish, ParishEvent, User
from .models.enums import AuditAction, EventStatus, EventType, Role, SacramentType

portal_bp = Blueprint("portal", __name__)


class RegistrationForm(Form):
    """Self-registration for a parishioner account."""

    first_name = StringField("First name", min_length=1, max_length=80)
    last_name = StringField("Surname", min_length=1, max_length=80)
    email = EmailField("Email")
    phone = PhoneField("Mobile number", required=False)
    address = TextAreaField("Home address", max_length=500, required=False)
    password = PasswordField("Password", min_length=8)


class DocumentRequestForm(Form):
    """FR-3.1: what the parishioner claims about the record they want."""

    sacrament_type = SelectField("Document needed", {s.value: s.label for s in SacramentType})
    targeted_parish_id = SelectField("Parish holding the record", validate_choice=False, required=True)
    name_on_record = StringField("Name as it appears on the record", min_length=2, max_length=160)
    date_of_birth = DateField("Date of birth", required=True, allow_future=False)
    date_of_sacrament = DateField("Date of the sacrament", required=False, allow_future=False)
    place_of_sacrament = StringField("Church where it took place", max_length=160, required=False)
    parents_or_spouse = StringField("Parents' or spouse's names", max_length=255, required=False)
    purpose = StringField("Purpose of the request", max_length=255, required=False)
    consent = BooleanField("Data privacy consent")

    def validate_on_submit(self) -> None:
        if not self.targeted_parish_id or not str(self.targeted_parish_id).strip():
            self._error("targeted_parish_id", "Please select the parish holding the record.")
        else:
            try:
                p_id = int(str(self.targeted_parish_id).strip())
                parish = db.session.get(Parish, p_id)
                if not parish or not parish.is_active:
                    self._error("targeted_parish_id", "Please select an active parish from the list.")
            except (ValueError, TypeError):
                self._error("targeted_parish_id", "Invalid parish selected.")

        if self.sacrament_type not in SacramentType.values():
            self._error("sacrament_type", "Choose the kind of document you need.")

        if self.date_of_birth and self.date_of_sacrament:
            dob = _parse_date(self.date_of_birth)
            dos = _parse_date(self.date_of_sacrament)
            if dob and dos and dob > dos:
                self._error("date_of_sacrament", "Date of sacrament cannot be before the date of birth.")

        if not getattr(self, "consent", None):
            self._error(
                "consent",
                "You must accept the data privacy notice to submit a request.",
            )


def _parse_time(raw: str) -> time | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p", "%H:%M:%S", "%I %p", "%I%p"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            pass
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(am|pm)?$", raw, re.IGNORECASE)
    if m:
        h, mn, ampm = int(m.group(1)), int(m.group(2)), m.group(3)
        if ampm:
            ampm = ampm.lower()
            if ampm == "pm" and h < 12:
                h += 12
            elif ampm == "am" and h == 12:
                h = 0
        if 0 <= h <= 23 and 0 <= mn <= 59:
            return time(h, mn)
    m_hour = re.match(r"^(\d{1,2})\s*(am|pm)$", raw, re.IGNORECASE)
    if m_hour:
        h, ampm = int(m_hour.group(1)), m_hour.group(2).lower()
        if ampm == "pm" and h < 12:
            h += 12
        elif ampm == "am" and h == 12:
            h = 0
        if 0 <= h <= 23:
            return time(h, 0)
    return None


SACRAMENT_CHOICES = {
    "baptism": "Baptism",
    "confirmation": "Confirmation",
    "wedding": "Wedding",
    "funeral": "Funeral / Burial",
    "blessing": "Blessing",
    "eucharist": "First Holy Communion",
    "anointing": "Anointing of the Sick",
    "reconciliation": "Reconciliation / Confession",
}


class ScheduleRequestForm(Form):
    """Parishioner request for a sacrament schedule (baptism, wedding, etc.)."""

    parish_id = SelectField("Parish", validate_choice=False, required=True)
    event_type = SelectField("Sacrament", SACRAMENT_CHOICES, required=True)
    preferred_date = DateField("Preferred date", required=True, allow_past=False)
    preferred_time = StringField("Preferred time (e.g. 10:00 AM)", min_length=2, max_length=30, required=True)
    title = StringField("Title / Intended person(s)", min_length=3, max_length=200, required=True)
    requester_name = StringField("Contact person", min_length=2, max_length=160, required=True)
    requester_contact = PhoneField("Contact phone number", required=True)
    expected_attendees = IntegerField("Expected attendees", required=False, min_value=1, max_value=5000)
    description = TextAreaField("Details / Special requests", max_length=1000, required=False)

    @property
    def event_type_choices(self) -> dict:
        return SACRAMENT_CHOICES

    def validate_on_submit(self) -> None:
        if not self.parish_id or not str(self.parish_id).strip():
            self._error("parish_id", "Please select a parish for the schedule.")
        else:
            try:
                p_id = int(str(self.parish_id).strip())
                parish = db.session.get(Parish, p_id)
                if not parish or not parish.is_active:
                    self._error("parish_id", "Please select an active parish.")
            except (ValueError, TypeError):
                self._error("parish_id", "Invalid parish selected.")

        if self.preferred_time and not _parse_time(self.preferred_time):
            self._error("preferred_time", "Please enter a valid time (e.g. 10:00 AM, 14:00).")


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

    schedules = db.session.scalars(
        select(ParishEvent)
        .where(ParishEvent.requester_user_id == parishioner.id)
        .order_by(ParishEvent.starts_at.desc())
    ).all()

    audit.record(AuditAction.VIEW, subject=parishioner, note="Viewed own portal")
    db.session.commit()

    return render_template(
        "portal/dashboard.html",
        requests=requests,
        schedules=schedules,
        open_count=sum(1 for r in requests if r.is_open),
        pending_schedules_count=sum(1 for s in schedules if s.status == EventStatus.REQUESTED),
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
        targeted_id = _parse_int(request.form.get("targeted_parish_id"))
        if not targeted_id and form.place_of_sacrament:
            matched_parish = db.session.scalar(
                select(Parish).where(Parish.name.ilike(f"%{form.place_of_sacrament.strip()}%"))
            )
            if matched_parish:
                targeted_id = matched_parish.id

        item = DocumentRequest(
            parishioner=parishioner,
            sacrament_type=SacramentType(form.sacrament_type),
            name_on_record=form.name_on_record,
            date_of_birth=_parse_date(form.date_of_birth),
            date_of_sacrament=_parse_date(form.date_of_sacrament),
            place_of_sacrament=form.place_of_sacrament,
            parents_or_spouse=form.parents_or_spouse or None,
            purpose=form.purpose or None,
            targeted_parish_id=targeted_id,
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


# --- sacrament schedules ----------------------------------------------


@portal_bp.route("/portal/schedules")
@login_required
def schedules():
    """Track the parishioner's sacrament schedule requests."""
    parishioner = _current_parishioner()
    items = db.session.scalars(
        select(ParishEvent)
        .where(ParishEvent.requester_user_id == parishioner.id)
        .order_by(ParishEvent.starts_at.desc())
    ).all()

    audit.record(AuditAction.VIEW, subject=parishioner, note="Viewed own schedule requests")
    db.session.commit()

    return render_template(
        "portal/schedules.html",
        events=items,
        pending_count=sum(1 for e in items if e.status == EventStatus.REQUESTED),
    )


@portal_bp.route("/portal/schedules/new", methods=["GET", "POST"])
@login_required
def new_schedule():
    """Request a schedule for any sacrament."""
    parishioner = _current_parishioner()
    form = ScheduleRequestForm()
    parishes = db.session.scalars(
        select(Parish).where(Parish.is_active.is_(True)).order_by(Parish.name)
    ).all()

    if request.method == "GET":
        if not form.requester_name:
            form.requester_name = parishioner.display_name or parishioner.username
        if not form.requester_contact and parishioner.phone:
            form.requester_contact = parishioner.phone

    if request.method == "POST" and form.validate():
        try:
            parish = db.session.get(Parish, int(str(form.parish_id).strip()))
        except (ValueError, TypeError):
            parish = None

        if not parish:
            form._error("parish_id", "Please select a valid parish.")
            return render_template(
                "portal/schedule_form.html",
                form=form,
                parishes=parishes,
                sacrament_choices=SACRAMENT_CHOICES,
                today=date.today().isoformat(),
            )

        pref_date = _parse_date(form.preferred_date)
        if not pref_date:
            form._error("preferred_date", "Please enter a valid calendar date (YYYY-MM-DD).")
            return render_template(
                "portal/schedule_form.html",
                form=form,
                parishes=parishes,
                sacrament_choices=SACRAMENT_CHOICES,
                today=date.today().isoformat(),
            )

        pref_time = _parse_time(form.preferred_time) or time(9, 0)
        starts_at = datetime.combine(pref_date, pref_time, tzinfo=timezone.utc)
        ends_at = starts_at + timedelta(hours=1)

        attendees = None
        if form.expected_attendees and str(form.expected_attendees).strip():
            try:
                attendees = int(str(form.expected_attendees).strip())
            except (ValueError, TypeError):
                attendees = None

        event = ParishEvent(
            parish_id=parish.id,
            event_type=EventType(form.event_type),
            title=form.title.strip(),
            starts_at=starts_at,
            ends_at=ends_at,
            status=EventStatus.REQUESTED,
            requester_user_id=parishioner.id,
            requester_name=form.requester_name.strip(),
            requester_contact=form.requester_contact.strip(),
            expected_attendees=attendees,
            description=form.description.strip() if form.description else None,
        )
        db.session.add(event)
        db.session.flush()

        audit.record(
            AuditAction.CREATE,
            subject=event,
            subject_label=f"{event.event_type.label} request for {event.title}",
            note="Sacrament schedule requested through parishioner portal",
        )
        db.session.commit()
        flash("Your sacrament schedule request has been submitted for parish staff review.", "success")
        return redirect(url_for("portal.schedules"))

    return render_template(
        "portal/schedule_form.html",
        form=form,
        parishes=parishes,
        sacrament_choices=SACRAMENT_CHOICES,
        today=date.today().isoformat(),
    )


@portal_bp.route("/portal/schedules/<int:event_id>")
@login_required
def schedule_detail(event_id: int):
    """Track one of the parishioner's sacrament schedule requests."""
    parishioner = _current_parishioner()
    event = db.session.scalar(
        select(ParishEvent).where(
            ParishEvent.id == event_id,
            ParishEvent.requester_user_id == parishioner.id,
        )
    )
    if event is None:
        abort(404)

    return render_template("portal/schedule_detail.html", event=event)


@portal_bp.post("/portal/schedules/<int:event_id>/cancel")
@login_required
def cancel_schedule(event_id: int):
    """Cancel a pending sacrament schedule request."""
    parishioner = _current_parishioner()
    event = db.session.scalar(
        select(ParishEvent).where(
            ParishEvent.id == event_id,
            ParishEvent.requester_user_id == parishioner.id,
        )
    )
    if event is None:
        abort(404)

    if event.status not in (EventStatus.REQUESTED, EventStatus.SCHEDULED):
        flash("This schedule request cannot be cancelled at this stage.", "error")
        return redirect(url_for("portal.schedule_detail", event_id=event.id))

    event.status = EventStatus.CANCELLED
    event.cancellation_reason = "Cancelled by parishioner."
    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=event,
        note="Schedule request cancelled by parishioner",
    )
    db.session.commit()
    flash("Your schedule request has been cancelled.", "info")
    return redirect(url_for("portal.schedules"))


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
