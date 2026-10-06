"""Parish scheduling: venues, events, and the conflict rule (FR-2.1–2.3).

Three things live here.

**Venues** (``Venue``) are the bookable spaces inside a parish: the main
church, a chapel, the parish hall. FR-2.2 names these explicitly, and a
venue needs to exist as a row rather than a free-text field or two events
in "the parish hall" could be booked in the same slot by spelling it two
ways.

**Events** (``ParishEvent``) are the things that occupy a venue at a time:
masses, sacraments, meetings. An event has a start and an *end*, not just
a start. Without an end there is no interval, and without an interval
conflict detection is impossible — two events at 10:00 are not a clash if
one ends at 11:00 and the other begins at 11:00.

**Conflicts** are computed by :mod:`rcal.services`, not stored. A stored
"has_conflict" flag would go stale the moment an adjacent event moved, so
the check is a query over the interval rather than a column.
"""

from ..extensions import db
from .base import TimestampMixin, enum_column
from .enums import EventStatus, EventType


class Venue(db.Model, TimestampMixin):
    """A bookable space belonging to a parish."""

    __tablename__ = "venues"
    __table_args__ = (
        # A parish cannot have two venues with the same name; different
        # parishes obviously can, hence the pair rather than the name alone.
        db.UniqueConstraint("parish_id", "name", name="uq_venue_parish_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    parish_id = db.Column(
        db.Integer, db.ForeignKey("parishes.id"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    #: Rough capacity, for choosing between the church and the chapel.
    capacity = db.Column(db.Integer)
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    parish = db.relationship("Parish", back_populates="venues")
    events = db.relationship("ParishEvent", back_populates="venue")

    def __repr__(self) -> str:
        return f"<Venue {self.name} (parish {self.parish_id})>"


class ParishEvent(db.Model, TimestampMixin):
    """One scheduled parish activity.

    ``ends_at`` is required and must fall after ``starts_at``; the service
    layer enforces the ordering, and conflict detection depends on it.
    """

    __tablename__ = "parish_events"
    __table_args__ = (
        # The schedule is read by parish and time, almost always together.
        db.Index("ix_parish_events_parish_start", "parish_id", "starts_at"),
        db.Index("ix_parish_events_clergy_start", "presiding_clergy_id", "starts_at"),
    )

    id = db.Column(db.Integer, primary_key=True)

    parish_id = db.Column(
        db.Integer, db.ForeignKey("parishes.id"), nullable=False, index=True
    )
    venue_id = db.Column(db.Integer, db.ForeignKey("venues.id"))
    #: Nullable: a meeting or an office activity needs no cleric, and
    #: insisting on one would produce fake assignments just to satisfy a
    #: form. Whether it *should* have one is decided by the event type.
    presiding_clergy_id = db.Column(db.Integer, db.ForeignKey("clergy.id"))

    event_type = db.Column(enum_column(EventType), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # Stored as a datetime, not a date plus a time: the conflict rule is
    # about overlapping instants, and splitting them would mean
    # reconstructing one on every comparison.
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=False)

    status = db.Column(
        enum_column(EventStatus),
        nullable=False,
        default=EventStatus.SCHEDULED,
        index=True,
    )

    #: Who asked for it: parishioner account when filed through portal
    requester_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    requester_name = db.Column(db.String(160))
    requester_contact = db.Column(db.String(255))
    expected_attendees = db.Column(db.Integer)

    #: Set once the sacrament has been transcribed into the register, so
    #: staff can see which completed ceremonies still need recording.
    #: This is the link between the schedule and the registers.
    record_id = db.Column(db.Integer, db.ForeignKey("sacramental_records.id"))

    cancellation_reason = db.Column(db.Text)

    parish = db.relationship("Parish", back_populates="events")
    venue = db.relationship("Venue", back_populates="events")
    presiding_clergy = db.relationship("Clergy", back_populates="presided_events")
    requester_user = db.relationship("User", foreign_keys=[requester_user_id])
    record = db.relationship("SacramentalRecord")

    @property
    def duration_minutes(self) -> int:
        """Length in whole minutes, or 0 if the interval is malformed."""
        if not (self.starts_at and self.ends_at):
            return 0
        return max(0, int((self.ends_at - self.starts_at).total_seconds() // 60))

    @property
    def is_past(self) -> bool:
        """True once the event has finished, as at the time of asking."""
        from .base import utcnow

        return bool(self.ends_at and self.ends_at < utcnow())

    @property
    def needs_register_entry(self) -> bool:
        """A completed sacrament that has not yet been transcribed.

        This is the queue FR-2.3 implies: ceremonies that really happened
        and are still missing from the books.
        """
        return (
            self.event_type.is_sacrament
            and self.status is EventStatus.COMPLETED
            and self.record_id is None
        )

    def __repr__(self) -> str:
        return f"<ParishEvent #{self.id} {self.event_type.value} {self.starts_at}>"
