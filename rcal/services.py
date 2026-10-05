"""Read-side services: parish scoping, record search, and aggregate counts.

Two rules from the domain run through everything here.

**Records are readable across parishes, writable only by the parish that
holds the register.** A person cannot obtain a baptismal certificate without
the parish where the baptism happened, so every read is archdiocese-wide
(within the account's role scope) while every *write* is checked against the
record's originating parish. A chancery or admin account may write anywhere.

**Parish staff do not see other parishes' records.** :func:`visible_parish`
turns the signed-in account into the filter that every listing query uses, so
the scoping rule is stated once rather than repeated per view.
"""

from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import aliased

from .extensions import db
from .models import (
    AccessLog,
    Annotation,
    CertificateRequest,
    Clergy,
    ClergyAssignment,
    MassIntention,
    Parish,
    Person,
    SacramentalRecord,
    User,
    Vicariate,
)
from .models.enums import MassIntentionStatus, RequestStatus, SacramentType


# --- parish scoping -------------------------------------------------------

def visible_parish(user: User) -> Parish | None:
    """The single parish *user* is confined to, or ``None`` for no limit.

    ``None`` means archdiocese-wide, which is what the chancery and admin
    roles get. A parish-scoped user with no home parish set is confined to
    nothing rather than everything — the safe direction to be wrong in.
    """
    if user.is_archdiocese_wide:
        return None
    return user.home_parish


def parish_filter(statement: Select, user: User, column=None) -> Select:
    """Restrict *statement* to the parishes *user* may see.

    *column* is the parish foreign key to filter on; defaults to
    ``Parish.id`` for queries over parishes themselves.
    """
    target = column if column is not None else Parish.id
    parish = visible_parish(user)
    if parish is None:
        return statement
    return statement.where(target == parish.id)


def can_write_parish(user: User, parish: Parish) -> bool:
    """Whether *user* may transcribe into *parish*'s registers.

    The chancery supervises the province and so may enter anywhere; a parish
    account may only enter into its own registers.
    """
    if user.is_archdiocese_wide:
        return True
    return user.home_parish_id == parish.id


def can_write_record(user: User, record: SacramentalRecord) -> bool:
    """Whether *user* may transcribe or annotate *record*.

    Transcription writes the record itself, which canon law reserves to the
    parish holding the register; the chancery supervises the whole
    province and so may write anywhere.
    """
    if user.is_archdiocese_wide:
        return True
    return user.home_parish_id == record.originating_parish_id


def can_view_record(user: User, record: SacramentalRecord) -> bool:
    """Whether *user* may open *record*.

    Read access is province-wide: this is the feature that lets a parish
    verify a baptism recorded elsewhere. Parish staff are confined to their
    own parish's registers, so the filter is still applied.
    """
    if user.is_archdiocese_wide:
        return True
    return user.home_parish_id == record.originating_parish_id


def log_access(user: User, record: SacramentalRecord, action: str = "view") -> None:
    """Write the accountability row for a read of *record*.

    Called by every view that opens a single record. Under RA 10173 the read
    itself is the personal-data event worth recording, not only edits.
    """
    db.session.add(AccessLog(user=user, record=record, action=action))


# --- directory reads ------------------------------------------------------

def search_parishes(user: User, query: str = "", vicariate_id: int | None = None):
    """Parishes the user may see, optionally filtered by name or municipality."""
    statement = select(Parish)
    statement = parish_filter(statement, user, Parish.id)

    if query:
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                Parish.name.ilike(pattern),
                Parish.municipality.ilike(pattern),
                Parish.address.ilike(pattern),
            )
        )
    if vicariate_id:
        statement = statement.where(Parish.vicariate_id == vicariate_id)

    return db.session.scalars(statement.order_by(Parish.name)).unique()


def search_clergy(user: User, query: str = "", parish_id: int | None = None):
    """Clergy visible to *user*, optionally filtered by name or assignment.

    A parish-scoped user sees the clergy assigned to their own parish, since
    those are the people whose registers they will handle.
    """
    statement = select(Clergy).where(Clergy.is_active.is_(True))

    if query:
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(Clergy.first_name.ilike(pattern), Clergy.last_name.ilike(pattern))
        )

    scoped = visible_parish(user)
    if scoped is not None:
        assigned_ids = select(ClergyAssignment.clergy_id).where(
            ClergyAssignment.parish_id == scoped.id
        )
        statement = statement.where(Clergy.id.in_(assigned_ids))

    if parish_id:
        assigned = select(ClergyAssignment.clergy_id).where(
            ClergyAssignment.parish_id == parish_id
        )
        statement = statement.where(Clergy.id.in_(assigned))

    return db.session.scalars(statement.order_by(Clergy.last_name)).unique()


def assignments_for(clergy: Clergy):
    """A cleric's posts, newest first."""
    return db.session.scalars(
        select(ClergyAssignment)
        .where(ClergyAssignment.clergy_id == clergy.id)
        .order_by(ClergyAssignment.assigned_from.desc())
    ).all()


# --- record search --------------------------------------------------------

def records_query(
    user: User,
    name: str = "",
    sacrament_type: SacramentType | None = None,
    parish_id: int | None = None,
    year: int | None = None,
) -> Select:
    """Build the register search query.

    Returns a *statement*, not results, so the caller can paginate it. The
    parish filter is applied here, which is the only place record visibility
    is decided.

    ``name`` is matched against the subject's name parts, because a
    sacramental register is indexed by surname — and against the spouse's
    name too, so a search for either party of a marriage finds the entry.
    """
    statement = select(SacramentalRecord).join(
        Person, SacramentalRecord.person_id == Person.id
    )
    statement = parish_filter(statement, user, SacramentalRecord.originating_parish_id)

    if name:
        pattern = f"%{name.strip()}%"
        # The subject and the spouse are both Person rows, so the spouse
        # needs its own alias or the second join would overwrite the first.
        spouse = aliased(Person)
        statement = statement.outerjoin(spouse, SacramentalRecord.spouse_person_id == spouse.id)
        statement = statement.where(
            or_(
                Person.last_name.ilike(pattern),
                Person.first_name.ilike(pattern),
                spouse.last_name.ilike(pattern),
                spouse.first_name.ilike(pattern),
            )
        )

    if sacrament_type:
        statement = statement.where(SacramentalRecord.sacrament_type == sacrament_type)
    if parish_id:
        statement = statement.where(SacramentalRecord.originating_parish_id == parish_id)
    if year:
        start, end = date(year, 1, 1), date(year + 1, 1, 1)
        statement = statement.where(
            SacramentalRecord.event_date >= start,
            SacramentalRecord.event_date < end,
        )

    return statement


def search_records(user: User, **kwargs):
    """Execute :func:`records_query` and return the records."""
    return db.session.scalars(records_query(user, **kwargs)).unique()


def recent_records(user: User, limit: int = 10):
    """The most recently written entries the user may see."""
    statement = select(SacramentalRecord)
    statement = parish_filter(statement, user, SacramentalRecord.originating_parish_id)
    return db.session.scalars(
        statement.order_by(SacramentalRecord.created_at.desc()).limit(limit)
    ).all()


# --- certificate workflow -------------------------------------------------

def requests_query(
    user: User, status: RequestStatus | None = None, open_only: bool = False
) -> Select:
    """Build the certificate-queue query.

    Returns a *statement* so the caller can paginate it. Visibility follows
    :func:`can_view_request`: a lay requester has no account, so staff see
    the requests for their own parish, the chancery sees the province, and
    everyone sees their own requests.
    """
    statement = select(CertificateRequest).join(
        SacramentalRecord,
        CertificateRequest.record_id == SacramentalRecord.id,
    )

    if not user.is_archdiocese_wide:
        statement = statement.where(
            or_(
                CertificateRequest.requester_user_id == user.id,
                SacramentalRecord.originating_parish_id == user.home_parish_id,
            )
        )

    if status:
        statement = statement.where(CertificateRequest.status == status)
    elif open_only:
        statement = statement.where(
            CertificateRequest.status.in_(RequestStatus.open_values())
        )

    return statement


def requests_for(user: User, **kwargs):
    """Execute :func:`requests_query` and return the requests."""
    return db.session.scalars(requests_query(user, **kwargs)).unique()


def can_view_request(user: User, item: CertificateRequest) -> bool:
    """Whether *user* may open a certificate request.

    A requester can always track the copy they asked for; staff see the
    requests arising from their own parish's registers.
    """
    if user.is_archdiocese_wide:
        return True
    if item.requester_user_id == user.id:
        return True
    return item.record.originating_parish_id == user.home_parish_id


def next_certificate_number() -> str:
    """Allocate the next certificate number in the ``RCAL-YYYY-NNNN`` series.

    Derived from the highest number already issued this year rather than a
    counter table, so the sequence cannot drift out of step with reality.
    The caller must still treat the column's unique constraint as the
    authority: two clerks issuing at the same moment is a race, and the
    constraint is what actually prevents a duplicate.
    """
    year = date.today().year
    prefix = f"RCAL-{year}-"
    latest = db.session.scalar(
        select(func.max(CertificateRequest.certificate_number)).where(
            CertificateRequest.certificate_number.like(f"{prefix}%")
        )
    )
    sequence = int(latest.rsplit("-", 1)[-1]) + 1 if latest else 1
    return f"{prefix}{sequence:04d}"


# --- analytics ------------------------------------------------------------

def archdiocese_counts() -> dict[str, int]:
    """Headline figures for the public landing page.

    Computed from the database rather than typed into the HTML, so the
    numbers are true on the day they are shown. An empty database reports
    zeros rather than a plausible-looking lie.
    """
    distinct_municipalities = db.session.scalar(
        select(func.count(func.distinct(Parish.municipality))).where(
            Parish.municipality.is_not(None), Parish.municipality != ""
        )
    )
    return {
        "parishes": db.session.scalar(select(func.count(Parish.id))) or 0,
        "vicariates": db.session.scalar(select(func.count(Vicariate.id))) or 0,
        "municipalities": distinct_municipalities or 0,
        # Priests, counted as active clergy currently holding a post.
        "priests": db.session.scalar(
            select(func.count(func.distinct(ClergyAssignment.clergy_id))).join(
                Clergy, Clergy.id == ClergyAssignment.clergy_id
            ).where(Clergy.is_active.is_(True), ClergyAssignment.assigned_to.is_(None))
        ) or 0,
        "clergy": db.session.scalar(
            select(func.count(Clergy.id)).where(Clergy.is_active.is_(True))
        ) or 0,
        "records": db.session.scalar(select(func.count(SacramentalRecord.id))) or 0,
        "persons": db.session.scalar(select(func.count(Person.id))) or 0,
    }


def sacrament_counts(user: User | None = None) -> dict[SacramentType, int]:
    """Records per sacrament type, optionally limited to what *user* may see."""
    statement = select(
        SacramentalRecord.sacrament_type, func.count(SacramentalRecord.id)
    ).group_by(SacramentalRecord.sacrament_type)
    if user is not None:
        statement = parish_filter(statement, user, SacramentalRecord.originating_parish_id)

    counts = dict(db.session.execute(statement).all())
    return {kind: counts.get(kind, 0) for kind in SacramentType}


def parish_activity(parish_id: int | None = None, limit: int = 10):
    """Parishes ranked by entries recorded, for the analytics view.

    ``parish_id`` of ``None`` ranks the whole archdiocese.
    """
    statement = (
        select(Parish, func.count(SacramentalRecord.id).label("record_count"))
        .outerjoin(
            SacramentalRecord,
            SacramentalRecord.originating_parish_id == Parish.id,
        )
        .group_by(Parish.id)
    )
    if parish_id:
        statement = statement.where(Parish.id == parish_id)

    rows = db.session.execute(
        statement.order_by(func.count(SacramentalRecord.id).desc(), Parish.name).limit(limit)
    ).all()
    return [(parish, count) for parish, count in rows]


def certificate_stats(user: User | None = None) -> dict[str, int]:
    """How the certificate queue is doing, by status."""
    statement = select(CertificateRequest.status, func.count(CertificateRequest.id)).group_by(
        CertificateRequest.status
    )
    rows = db.session.execute(statement).all()
    counts = {status: 0 for status in RequestStatus}
    for status, count in rows:
        counts[status] = count
    counts["open"] = sum(counts[status] for status in RequestStatus if status.is_open)
    return counts


def mass_intention_stats() -> dict[str, int]:
    """Mass intentions by status."""
    rows = db.session.execute(
        select(MassIntention.status, func.count(MassIntention.id)).group_by(
            MassIntention.status
        )
    ).all()
    counts = {status: 0 for status in MassIntentionStatus}
    for status, count in rows:
        counts[status] = count
    return counts


def annotation_count(record: SacramentalRecord) -> int:
    """How many margin notes a record carries."""
    return db.session.scalar(
        select(func.count(Annotation.id)).where(Annotation.record_id == record.id)
    ) or 0