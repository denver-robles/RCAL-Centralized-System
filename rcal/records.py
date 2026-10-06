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

from datetime import date

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
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from . import audit, services
from .auth import roles_required
from .extensions import db
from .forms import Form, SelectField, StringField, TextAreaField
from .models import (
    CertificateRequest,
    Clergy,
    MassIntention,
    Parish,
    Person,
    Role,
    SacramentalRecord,
)
from .models.enums import (
    AnnotationType,
    AuditAction,
    LegitimacyStatus,
    MassIntentionStatus,
    SacramentType,
    Sex,
)

records_bp = Blueprint("records", __name__)


# --- forms ----------------------------------------------------------------

class RecordForm(Form):
    """Transcribe one entry into a register."""

    first_name = StringField("First name", max_length=80)
    middle_name = StringField("Middle name", max_length=80, required=False)
    last_name = StringField("Surname", max_length=80)
    suffix = StringField("Suffix", max_length=20, required=False)
    sex = SelectField("Sex", {s.value: s for s in Sex})
    date_of_birth = StringField("Date of birth (YYYY-MM-DD)", required=False)

    spouse_name = StringField("Spouse surname", max_length=80, required=False)
    spouse_first_name = StringField("Spouse first name", max_length=80, required=False)

    sacrament_type = SelectField("Register", {s.value: s for s in SacramentType})
    event_date = StringField("Date of event (YYYY-MM-DD)")
    originating_parish_id = SelectField("Parish", validate_choice=False)
    book_number = StringField("Book number", max_length=10)
    page_number = StringField("Page number", max_length=10)
    entry_number = StringField("Entry number", max_length=10)
    performed_by_clergy_id = StringField("Officiating cleric", required=False)

    legitimacy = SelectField("Legitimacy", {s.value: s for s in LegitimacyStatus}, required=False)
    godparents = TextAreaField("Godparents", required=False)
    witnesses = TextAreaField("Witnesses", required=False)
    place_of_event = StringField("Place of event", max_length=160, required=False)
    register_notes = TextAreaField("Register notes", required=False)

    def validate_on_submit(self) -> None:
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
    note_text = TextAreaField("Note")
    event_date = StringField("Date of the event (YYYY-MM-DD)", required=False)
    reference_record_id = StringField("Related register entry", required=False)

    def validate_on_submit(self) -> None:
        kind = AnnotationType(self.annotation_type) if self.annotation_type else None
        if kind is None:
            return
        if kind.links_to_record and not self.reference_record_id:
            self._error(
                "reference_record_id",
                "A note of this kind must point at the register entry it refers to.",
            )


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
    if request.method == "POST" and form.validate():
        error = _save_record(form)
        if error is None:
            flash("Register entry recorded.", "success")
            return redirect(url_for("records.detail", record_id=form.record_id))
        for field, message in error.items():
            form._error(field, message)

    return render_template(
        "records/record_form.html",
        form=form,
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


# --- mass intentions ------------------------------------------------------

class MassIntentionForm(Form):
    intended_for = StringField("Intention", max_length=300)
    requester_name = StringField("Requested by", max_length=160)
    requester_contact = StringField("Contact", max_length=255, required=False)
    parish_id = SelectField("Parish", validate_choice=False)
    notes = TextAreaField("Notes", required=False)


@records_bp.route("/intentions", methods=["GET", "POST"])
@login_required
def intentions():
    """Request a Mass intention."""
    form = MassIntentionForm()
    if request.method == "POST" and form.validate():
        parish = db.session.get(Parish, _parse_int(form.parish_id) or 0)
        if parish is None:
            form._error("parish_id", "Choose a parish.")
        elif not services.can_write_parish(current_user, parish):
            form._error("parish_id", "Your account may only use its own parish.")
        else:
            db.session.add(
                MassIntention(
                    intended_for=form.intended_for,
                    requester_name=form.requester_name,
                    requester_contact=form.requester_contact or None,
                    parish=parish,
                    notes=form.notes or None,
                    status=MassIntentionStatus.PENDING,
                )
            )
            db.session.commit()
            flash("Mass intention received.", "success")
            return redirect(url_for("records.intentions"))

    rows = db.session.scalars(
        select(MassIntention)
        .where(
            MassIntention.parish_id == current_user.home_parish_id
            if not current_user.is_archdiocese_wide
            else MassIntention.parish_id.is_not(None)
        )
        .order_by(MassIntention.created_at.desc())
    ).unique()

    return render_template(
        "records/intentions.html",
        form=form,
        intentions=rows,
        parishes=_parish_choices(),
        stats=services.mass_intention_stats(),
    )


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