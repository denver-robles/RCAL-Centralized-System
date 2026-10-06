"""Sacramental register entries: transcription, search, and margin notes.

Two rules govern this module.

**Entries are immutable.** There is no edit or delete route. Once
transcribed, a register entry is corrected only by adding an
:class:`~rcal.models.record.Annotation` — a margin note that references the
later event — so the original transcription survives untouched. The one
exception is an entry created in error, which :func:`void_entry` withdraws
with a recorded reason and leaves the row itself in place.

**Transcription belongs to the holding parish.** A parish may enter into the
registers it keeps; the chancery supervises the province and may enter
anywhere. :func:`can_write_record` is the single place that decides this.
"""

from datetime import date, datetime, time, timedelta, timezone
import re

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from . import audit, services
from .auth import roles_required
from .extensions import db
from .forms import (
    DateField,
    Form,
    IntegerField,
    PhoneField,
    SelectField,
    StringField,
    TextAreaField,
)
from .models import (
    CertificateRequest,
    Clergy,
    MassIntention,
    Parish,
    ParishEvent,
    Person,
    Role,
    SacramentalRecord,
    Venue,
)
from .models.enums import (
    AnnotationType,
    AuditAction,
    EventStatus,
    EventType,
    LegitimacyStatus,
    MassIntentionStatus,
    SacramentType,
    Sex,
)

records_bp = Blueprint("records", __name__)


# --- forms ----------------------------------------------------------------

class RecordForm(Form):
    """Transcribe one entry into a register."""

    first_name = StringField("First name", min_length=1, max_length=80)
    middle_name = StringField("Middle name", max_length=80, required=False)
    last_name = StringField("Surname", min_length=1, max_length=80)
    suffix = StringField("Suffix", max_length=20, required=False)
    sex = SelectField("Sex", {s.value: s for s in Sex})
    date_of_birth = DateField("Date of birth", required=False, allow_future=False)

    spouse_name = StringField("Spouse surname", max_length=80, required=False)
    spouse_first_name = StringField("Spouse first name", max_length=80, required=False)

    sacrament_type = SelectField("Register", {s.value: s for s in SacramentType})
    event_date = DateField("Date of event", required=True, allow_future=False)
    originating_parish_id = SelectField("Parish", validate_choice=False)
    book_number = IntegerField("Book number", min_value=1, max_value=99999)
    page_number = IntegerField("Page number", min_value=1, max_value=99999)
    entry_number = IntegerField("Entry number", min_value=1, max_value=99999)
    performed_by_clergy_id = SelectField("Officiating cleric", validate_choice=False, required=False)

    legitimacy = SelectField("Legitimacy", {s.value: s for s in LegitimacyStatus}, required=False)
    godparents = TextAreaField("Godparents", max_length=500, required=False)
    witnesses = TextAreaField("Witnesses", max_length=500, required=False)
    place_of_event = StringField("Place of event", max_length=160, required=False)
    register_notes = TextAreaField("Register notes", max_length=1000, required=False)

    def validate_on_submit(self) -> None:
        if self.date_of_birth and self.event_date:
            birth = _parse_date(self.date_of_birth)
            event_d = _parse_date(self.event_date)
            if birth and event_d and birth > event_d:
                self._error("date_of_birth", "A person cannot be born after the event date.")

        if self.sacrament_type == SacramentType.MARRIAGE.value:
            if not self.spouse_name or not self.spouse_first_name:
                self._error(
                    "spouse_name",
                    "A marriage entry must name the other party.",
                )
        else:
            self.spouse_name = None
            self.spouse_first_name = None

        if self.sacrament_type != SacramentType.BAPTISM.value:
            # Legitimacy is a baptismal field; asking for it elsewhere
            # would imply a meaning the register does not carry.
            self.legitimacy = None

        if self.legitimacy and self.legitimacy not in LegitimacyStatus.values():
            self._error("legitimacy", "Choose a legitimacy status.")


class AnnotationForm(Form):
    """Append a margin note to an existing entry."""

    annotation_type = SelectField("Note", {a.value: a for a in AnnotationType})
    note_text = TextAreaField("Note", max_length=1000)
    event_date = DateField("Date of the event", required=False, allow_future=False)
    reference_record_id = IntegerField("Related register entry ID", required=False, min_value=1)

    def validate_on_submit(self) -> None:
        kind = AnnotationType(self.annotation_type) if self.annotation_type else None
        if kind is None:
            return
        if kind.links_to_record and not self.reference_record_id:
            self._error(
                "reference_record_id",
                "A note of this kind must point at the register entry it refers to.",
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


class StaffScheduleForm(Form):
    """Direct schedule creation by parish staff for liturgies and sacraments."""

    parish_id = SelectField("Parish", validate_choice=False, required=True)
    event_type = SelectField("Sacrament / Ceremony", validate_choice=False, required=True)
    event_date = DateField("Event Date", required=True)
    event_time = StringField("Event Time (e.g. 10:00 AM)", min_length=2, max_length=30, required=True)
    title = StringField("Subject / Intended Person(s)", min_length=3, max_length=200, required=True)
    venue_id = SelectField("Venue", validate_choice=False, required=False)
    presiding_clergy_id = SelectField("Presiding Clergy", validate_choice=False, required=False)
    requester_name = StringField("Requester / Contact Person", max_length=160, required=False)
    requester_contact = StringField("Contact Number", max_length=255, required=False)
    expected_attendees = IntegerField("Expected Attendees", required=False, min_value=1, max_value=5000)
    description = TextAreaField("Notes / Instructions", max_length=1000, required=False)

    def validate_on_submit(self) -> None:
        if self.event_time and not _parse_time(self.event_time):
            self._error("event_time", "Please enter a valid time (e.g. 10:00 AM, 14:00).")


def _parse_date(raw: str):
    try:
        return date.fromisoformat((raw or "").strip())
    except ValueError:
        return None


def _parse_int(raw: str):
    try:
        return int((raw or "").strip())
    except (TypeError, ValueError):
        return None


def _parish_choices() -> dict:
    """Parishes the user may transcribe into.

    A parish-scoped user is only offered their own parish, so a mis-clicked
    form cannot put an entry in the wrong register.
    """
    return {
        str(p.id): p.name for p in services.search_parishes(current_user)
    }


# --- browsing -------------------------------------------------------------

@records_bp.route("/records")
@login_required
def search():
    """Search the registers."""
    name = request.args.get("name", "").strip()
    parish_id = request.args.get("parish", type=int)
    year = request.args.get("year", type=int)
    type_value = request.args.get("type", "").strip()
    sacrament_type = SacramentType(type_value) if type_value in SacramentType.values() else None

    statement = services.records_query(
        current_user,
        name=name,
        sacrament_type=sacrament_type,
        parish_id=parish_id,
        year=year,
    )
    pagination = db.paginate(
        _ordered(statement),
        page=request.args.get("page", 1, type=int),
        per_page=current_app.config["ITEMS_PER_PAGE"],
        error_out=False,
    )

    return render_template(
        "records/search.html",
        pagination=pagination,
        # A blank form, used only so the filter dropdowns reuse the shared
        # select markup; the filters themselves are plain GET params.
        form=RecordForm(),
        name=name,
        parish_id=parish_id,
        year=year,
        sacrament_type=type_value,
        parishes=services.search_parishes(current_user),
        parish_choices={
            str(p.id): p.name for p in services.search_parishes(current_user)
        },
        sacraments=SacramentType,
    )


def _ordered(statement):
    """Records are filed newest first, and ties break on citation."""
    return statement.order_by(
        SacramentalRecord.event_date.desc(), SacramentalRecord.id.desc()
    )


@records_bp.route("/records/<int:record_id>")
@login_required
def detail(record_id: int):
    """One register entry, with its margin notes.

    Opening a record is the personal-data event that RA 10173 makes
    accountable, so every visit writes an access-log row.
    """
    record = db.get_or_404(SacramentalRecord, record_id)
    if not services.can_view_record(current_user, record):
        abort(403)

    services.log_access(current_user, record)
    db.session.commit()

    return render_template(
        "records/detail.html",
        record=record,
        annotation_types=AnnotationType,
        can_write=services.can_write_record(current_user, record),
        requests=db.session.scalars(
            select(CertificateRequest)
            .where(CertificateRequest.record_id == record.id)
            .order_by(CertificateRequest.created_at.desc())
        ).all(),
    )


# --- transcription --------------------------------------------------------

@records_bp.route("/records/new", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def create():
    """Transcribe a new register entry."""
    form = RecordForm()
    from_event_id = request.args.get("from_event_id", type=int) or request.form.get("from_event_id", type=int)
    from_event = None
    if from_event_id:
        from_event = db.session.get(ParishEvent, from_event_id)

    if request.method == "GET" and from_event:
        form.originating_parish_id = str(from_event.parish_id)
        sacrament_map = {
            EventType.BAPTISM.value: SacramentType.BAPTISM.value,
            EventType.CONFIRMATION.value: SacramentType.CONFIRMATION.value,
            EventType.WEDDING.value: SacramentType.MARRIAGE.value,
            EventType.FUNERAL.value: SacramentType.DEATH.value,
        }
        if from_event.event_type.value in sacrament_map:
            form.sacrament_type = sacrament_map[from_event.event_type.value]
        if from_event.starts_at:
            form.event_date = from_event.starts_at.date().isoformat()
        if from_event.venue:
            form.place_of_event = from_event.venue.name
        if from_event.presiding_clergy_id:
            form.performed_by_clergy_id = str(from_event.presiding_clergy_id)
        if from_event.title:
            form.register_notes = f"Scheduled event #{from_event.id}: {from_event.title}. {from_event.description or ''}".strip()

    if request.method == "POST" and form.validate():
        error = _save_record(form)
        if error is None:
            if from_event:
                from_event.record_id = form.record_id
                from_event.status = EventStatus.COMPLETED
                db.session.add(from_event)
                audit.record(
                    AuditAction.UPDATE,
                    subject=from_event,
                    note=f"Linked sacrament schedule #{from_event.id} to register entry #{form.record_id}",
                )
                db.session.commit()
                flash(f"Register entry recorded and linked to schedule #{from_event.id}.", "success")
            else:
                flash("Register entry recorded.", "success")
            return redirect(url_for("records.detail", record_id=form.record_id))
        for field, message in error.items():
            form._error(field, message)

    return render_template(
        "records/record_form.html",
        form=form,
        from_event=from_event,
        parishes=_parish_choices(),
        clergy_list=None,
        sacraments=SacramentType,
        legitimacy_statuses=LegitimacyStatus,
        sex_labels=Sex.labels(),
        legitimacy_labels=LegitimacyStatus.labels(),
        clergy_choices={
            str(c.id): c.titled_name
            for c in db.session.scalars(
                select(Clergy)
                .where(Clergy.is_active.is_(True))
                .order_by(Clergy.last_name)
            )
        },
        editing=False,
    )


def _save_record(form: RecordForm):
    """Validate and persist one register entry.

    Returns ``None`` on success (and stashes the new id on *form*), or a
    dict of field -> message to re-render with.
    """
    errors = {}

    event_date = _parse_date(form.event_date)
    book = _parse_int(form.book_number)
    page = _parse_int(form.page_number)
    entry = _parse_int(form.entry_number)
    birth = _parse_date(form.date_of_birth)

    if event_date is None:
        errors["event_date"] = "Enter the date of the event as YYYY-MM-DD."
    if birth is not None and event_date is not None and birth > event_date:
        errors["date_of_birth"] = "A person cannot be born after the event was recorded."
    for field, raw in (
        ("book_number", book),
        ("page_number", page),
        ("entry_number", entry),
    ):
        if raw is None or raw < 1:
            errors[field] = "Enter a positive whole number."

    parish = db.session.get(Parish, _parse_int(form.originating_parish_id) or 0)
    if parish is None:
        errors["originating_parish_id"] = "Choose the parish holding this register."
    elif not services.can_write_parish(current_user, parish):
        # Transcription is reserved to the parish that keeps the register.
        errors["originating_parish_id"] = (
            "Your account may only transcribe into its own parish's registers."
        )
    elif not parish.is_active:
        errors["originating_parish_id"] = "That parish is no longer active."

    if errors:
        return errors

    person = Person(
        first_name=form.first_name,
        middle_name=form.middle_name or None,
        last_name=form.last_name,
        suffix=form.suffix or None,
        sex=Sex(form.sex),
        date_of_birth=birth,
    )
    db.session.add(person)

    spouse = None
    if form.spouse_name:
        spouse = Person(
            first_name=form.spouse_first_name,
            last_name=form.spouse_name,
            sex=(
                Sex.FEMALE if Sex(form.sex) is Sex.MALE else Sex.MALE
            ),
        )
        db.session.add(spouse)

    record = SacramentalRecord(
        person=person,
        spouse=spouse,
        sacrament_type=SacramentType(form.sacrament_type),
        event_date=event_date,
        book_number=book,
        page_number=page,
        entry_number=entry,
        originating_parish=parish,
        performed_by_clergy=(
            db.session.get(Clergy, int(form.performed_by_clergy_id))
            if form.performed_by_clergy_id
            else None
        ),
        legitimacy=(
            LegitimacyStatus(form.legitimacy) if form.legitimacy else None
        ),
        godparents=form.godparents or None,
        witnesses=form.witnesses or None,
        place_of_event=form.place_of_event or None,
        register_notes=form.register_notes or None,
    )
    db.session.add(record)

    try:
        db.session.flush()
    except IntegrityError:
        # The unique citation constraint is the authority on a clash; the
        # database message is far more useful to a parish secretary than
        # anything the form could have predicted.
        db.session.rollback()
        return {
            "entry_number": (
                f"Book {book}, Page {page}, Entry {entry} is already recorded in "
                f"{parish.name}'s {record.sacrament_type.label.lower()} register."
            )
        }

    db.session.commit()
    form.record_id = record.id

    # The transcription itself is a mutation of a canonical register, so it
    # is recorded with the citation and the parish, which is what makes the
    # entry checkable against the bound book later.
    audit.record(
        AuditAction.CREATE,
        subject=record,
        subject_label=f"{record.sacrament_type.label} — {record.person.full_name}",
        new_values=audit.snapshot(
            record,
            (
                "sacrament_type",
                "event_date",
                "book_number",
                "page_number",
                "entry_number",
                "originating_parish_id",
                "performed_by_clergy_id",
            ),
        ),
        note=f"Transcribed into {parish.name} ({record.citation})",
    )
    db.session.commit()
    return None


# --- annotations ----------------------------------------------------------

@records_bp.route("/records/<int:record_id>/annotate", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def annotate(record_id: int):
    """Append a margin note. This is the only way a record is ever changed."""
    record = db.get_or_404(SacramentalRecord, record_id)
    if not services.can_view_record(current_user, record):
        abort(403)
    if not services.can_write_record(current_user, record):
        abort(403, description="Your account may not annotate this register.")

    form = AnnotationForm()
    if request.method == "POST" and form.validate():
        kind = AnnotationType(form.annotation_type)
        note_date = _parse_date(form.event_date) if form.event_date else None
        reference = (
            db.session.get(SacramentalRecord, int(form.reference_record_id))
            if form.reference_record_id
            else None
        )
        record.add_annotation(
            kind,
            form.note_text,
            annotated_by=current_user,
            event_date=note_date,
            reference_record=reference,
        )
        services.log_access(current_user, record, action="annotate")
        # A margin note is an append to a canonical record: the entry itself
        # is untouched, but the record as evidence has changed.
        audit.record(
            AuditAction.ANNOTATE,
            subject=record,
            subject_label=f"{record.sacrament_type.label} — {record.person.full_name}",
            new_values={
                "annotation_type": kind.value,
                "note_text": form.note_text,
                "event_date": note_date.isoformat() if note_date else None,
                "reference_record_id": reference.id if reference else None,
            },
        )
        db.session.commit()
        flash("Margin note added. The register entry itself is unchanged.", "success")
        return redirect(url_for("records.detail", record_id=record.id))

    return render_template(
        "records/annotate.html",
        form=form,
        record=record,
        annotation_types=AnnotationType,
    )


# --- sacrament schedules (staff management) -------------------------------

@records_bp.route("/records/schedules")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def schedules():
    """Monitor and manage parish sacrament schedule requests."""
    status_filter = request.args.get("status", "").strip().lower()
    parish_id = request.args.get("parish", type=int)

    statement = services.events_query(current_user, parish_id=parish_id)

    if status_filter == "pending":
        statement = statement.where(ParishEvent.status == EventStatus.REQUESTED)
    elif status_filter == "approved":
        statement = statement.where(
            ParishEvent.status.in_([EventStatus.SCHEDULED, EventStatus.CONFIRMED])
        )
    elif status_filter == "completed":
        statement = statement.where(ParishEvent.status == EventStatus.COMPLETED)
    elif status_filter == "unrecorded":
        statement = statement.where(
            ParishEvent.status == EventStatus.COMPLETED,
            ParishEvent.record_id.is_(None),
            ParishEvent.event_type.in_([k for k in EventType if k.is_sacrament]),
        )
    elif status_filter == "cancelled":
        statement = statement.where(ParishEvent.status == EventStatus.CANCELLED)

    page = request.args.get("page", 1, type=int)
    pagination = db.paginate(
        statement.order_by(ParishEvent.starts_at.desc()),
        page=page,
        per_page=current_app.config["ITEMS_PER_PAGE"],
        error_out=False,
    )

    base = services.events_query(current_user)
    pending_count = db.session.scalar(
        select(func.count(ParishEvent.id)).where(
            ParishEvent.id.in_(base.with_only_columns(ParishEvent.id)),
            ParishEvent.status == EventStatus.REQUESTED,
        )
    ) or 0
    unrecorded_count = db.session.scalar(
        select(func.count(ParishEvent.id)).where(
            ParishEvent.id.in_(base.with_only_columns(ParishEvent.id)),
            ParishEvent.status == EventStatus.COMPLETED,
            ParishEvent.record_id.is_(None),
            ParishEvent.event_type.in_([k for k in EventType if k.is_sacrament]),
        )
    ) or 0

    return render_template(
        "records/schedules.html",
        pagination=pagination,
        status_filter=status_filter,
        pending_count=pending_count,
        unrecorded_count=unrecorded_count,
        parishes=_parish_choices(),
        current_parish=parish_id,
    )


@records_bp.route("/records/schedules/new", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def new_schedule():
    """Schedule a sacrament or ceremony directly from the parish office."""
    form = StaffScheduleForm()
    parishes = _parish_choices()
    if not parishes:
        flash("You do not have permission to schedule events for any parish.", "error")
        return redirect(url_for("records.schedules"))

    from .portal import SACRAMENT_CHOICES

    default_parish_id = (
        str(current_user.home_parish_id)
        if current_user.home_parish_id and str(current_user.home_parish_id) in parishes
        else next(iter(parishes.keys()))
    )

    selected_parish_str = str(request.form.get("parish_id") or request.args.get("parish_id") or default_parish_id)
    if selected_parish_str not in parishes:
        selected_parish_str = default_parish_id
    selected_parish_id = int(selected_parish_str)

    parish = db.session.get(Parish, selected_parish_id)
    venues = (
        db.session.scalars(
            select(Venue).where(Venue.parish_id == parish.id, Venue.is_active.is_(True)).order_by(Venue.name)
        ).all()
        if parish
        else []
    )
    clergy_list = db.session.scalars(
        select(Clergy).where(Clergy.is_active.is_(True)).order_by(Clergy.last_name, Clergy.first_name)
    ).all()

    if request.method == "POST" and form.validate():
        target_parish = db.session.get(Parish, int(form.parish_id))
        if not target_parish or not services.can_write_parish(current_user, target_parish):
            form._error("parish_id", "You do not have permission to schedule for this parish.")
        else:
            event_d = _parse_date(form.event_date)
            event_t = _parse_time(form.event_time) or time(9, 0)
            if not event_d:
                form._error("event_date", "Please enter a valid date in YYYY-MM-DD format.")
            else:
                starts_at = datetime.combine(event_d, event_t, tzinfo=timezone.utc)
                ends_at = starts_at + timedelta(hours=1)

                venue_id = _parse_int(form.venue_id) if form.venue_id else None
                clergy_id = _parse_int(form.presiding_clergy_id) if form.presiding_clergy_id else None
                attendees = _parse_int(form.expected_attendees) if form.expected_attendees else None

                clashes = services.event_conflicts(
                    starts_at, ends_at, parish_id=target_parish.id, venue_id=venue_id, clergy_id=clergy_id
                )
                status = EventStatus.CONFIRMED if (venue_id and clergy_id) else EventStatus.SCHEDULED

                event = ParishEvent(
                    parish_id=target_parish.id,
                    event_type=EventType(form.event_type),
                    title=form.title.strip(),
                    starts_at=starts_at,
                    ends_at=ends_at,
                    venue_id=venue_id,
                    presiding_clergy_id=clergy_id,
                    status=status,
                    requester_name=form.requester_name.strip() if form.requester_name else "Parish Office",
                    requester_contact=form.requester_contact.strip() if form.requester_contact else None,
                    expected_attendees=attendees,
                    description=form.description.strip() if form.description else None,
                )
                db.session.add(event)
                db.session.flush()

                audit.record(
                    AuditAction.CREATE,
                    subject=event,
                    subject_label=f"{event.event_type.label} schedule for {event.title}",
                    note=f"Scheduled by {current_user.display_name or current_user.username}",
                )
                db.session.commit()

                if clashes:
                    flash(
                        f"Schedule #{event.id} created, but note: conflicting bookings exist at that time.",
                        "warning",
                    )
                else:
                    flash(f"Sacrament schedule #{event.id} created successfully.", "success")
                return redirect(url_for("records.schedule_detail", event_id=event.id))

    return render_template(
        "records/schedule_form.html",
        form=form,
        parishes=parishes,
        selected_parish_id=selected_parish_id,
        venues=venues,
        clergy_list=clergy_list,
        sacrament_choices=SACRAMENT_CHOICES,
        today=date.today().isoformat(),
    )


@records_bp.route("/records/schedules/<int:event_id>")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def schedule_detail(event_id: int):
    """Review, monitor, and configure an individual sacrament schedule."""
    event = db.get_or_404(ParishEvent, event_id)
    if not services.can_write_parish(current_user, event.parish):
        abort(403)

    venues = db.session.scalars(
        select(Venue)
        .where(Venue.parish_id == event.parish_id, Venue.is_active.is_(True))
        .order_by(Venue.name)
    ).all()
    clergy_list = db.session.scalars(
        select(Clergy).where(Clergy.is_active.is_(True)).order_by(Clergy.last_name)
    ).all()

    conflict_warnings = []
    if event.status.is_open:
        clashes = services.event_conflicts(
            event.starts_at,
            event.ends_at,
            parish_id=event.parish_id,
            venue_id=event.venue_id,
            clergy_id=event.presiding_clergy_id,
            exclude_event_id=event.id,
        )
        for c in clashes:
            conflict_warnings.append(
                services.describe_conflict(c, event.venue_id, event.presiding_clergy_id)
            )

    return render_template(
        "records/schedule_detail.html",
        event=event,
        venues=venues,
        clergy_list=clergy_list,
        conflict_warnings=conflict_warnings,
    )


@records_bp.post("/records/schedules/<int:event_id>/approve")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def approve_schedule(event_id: int):
    """Approve and confirm a sacrament schedule request."""
    event = db.get_or_404(ParishEvent, event_id)
    if not services.can_write_parish(current_user, event.parish):
        abort(403)

    venue_id = _parse_int(request.form.get("venue_id"))
    clergy_id = _parse_int(request.form.get("presiding_clergy_id"))
    if venue_id:
        event.venue_id = venue_id
    if clergy_id:
        event.presiding_clergy_id = clergy_id

    event.status = EventStatus.CONFIRMED
    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=event,
        note=f"Schedule approved and confirmed by {current_user.display_name or current_user.username}",
    )
    db.session.commit()
    flash(f"Schedule #{event.id} ({event.title}) has been confirmed.", "success")
    return redirect(url_for("records.schedule_detail", event_id=event.id))


@records_bp.post("/records/schedules/<int:event_id>/complete")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def complete_schedule(event_id: int):
    """Mark a sacrament schedule completed and direct immediately to the register."""
    event = db.get_or_404(ParishEvent, event_id)
    if not services.can_write_parish(current_user, event.parish):
        abort(403)

    event.status = EventStatus.COMPLETED
    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=event,
        note=f"Ceremony completed, directing to register transcription",
    )
    db.session.commit()
    flash(
        f"Sacrament ceremony completed! Please transcribe it into the canonical register.",
        "info",
    )
    return redirect(url_for("records.create", from_event_id=event.id))


@records_bp.post("/records/schedules/<int:event_id>/cancel")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def cancel_schedule(event_id: int):
    """Cancel a sacrament schedule with a stated reason."""
    event = db.get_or_404(ParishEvent, event_id)
    if not services.can_write_parish(current_user, event.parish):
        abort(403)

    reason = request.form.get("reason", "").strip() or "Cancelled by parish office."
    event.status = EventStatus.CANCELLED
    event.cancellation_reason = reason
    audit.record(
        AuditAction.STATUS_CHANGE,
        subject=event,
        note=f"Schedule cancelled: {reason}",
    )
    db.session.commit()
    flash(f"Schedule #{event.id} has been cancelled.", "info")
    return redirect(url_for("records.schedule_detail", event_id=event.id))


@records_bp.route("/intentions", methods=["GET", "POST"])
@login_required
def intentions():
    """Redirect legacy intentions route to sacrament schedules."""
    return redirect(url_for("records.schedules"))


# --- analytics ------------------------------------------------------------

@records_bp.route("/records/analytics")
@roles_required(Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF, Role.CLERGY)
def analytics():
    """Database-driven figures, for the signed-in staff who may see them."""
    scoped = None if current_user.is_archdiocese_wide else current_user.home_parish_id
    return render_template(
        "records/analytics.html",
        counts=services.archdiocese_counts(),
        sacraments=services.sacrament_counts(current_user),
        activity=services.parish_activity(scoped),
        certificates=services.certificate_stats(),
        scoped_parish=services.visible_parish(current_user),
    )