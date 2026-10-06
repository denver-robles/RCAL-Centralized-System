"""Accountability log: who read which record, and when.

These registers hold personal data that is also legal evidence, so under
RA 10173 access to them must be accountable. Canon law decides who may
look; this table records that staff did look.
"""

from ..extensions import db
from .base import enum_column, utcnow
from .enums import AuditAction


class AccessLog(db.Model):
    """One immutable row recording a single act of access to a record."""

    __tablename__ = "access_logs"
    __table_args__ = (
        db.Index("ix_access_logs_record_created", "record_id", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    record_id = db.Column(
        db.Integer, db.ForeignKey("sacramental_records.id"), nullable=False
    )
    #: "view" for now; further actions (issue, export, ...) as the app grows.
    action = db.Column(db.String(40), nullable=False, default="view")
    created_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, nullable=False
    )

    user = db.relationship("User", back_populates="access_logs")
    record = db.relationship("SacramentalRecord", back_populates="access_logs")

    def __repr__(self) -> str:
        return (
            f"<AccessLog user={self.user_id} record={self.record_id} "
            f"{self.action}>"
        )


class AuditLog(db.Model):
    """One immutable row recording a single act by a single user.

    The comprehensive trail required by FR-1.4. Where :class:`AccessLog`
    answers "did staff open this register entry?", this answers "what has
    been done in this system, by whom, from where, and how did the data
    change?".
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        # The trail is read by actor and time, by the thing acted on, and
        # by action type for reports.
        db.Index("ix_audit_logs_user_created", "user_id", "created_at"),
        db.Index("ix_audit_logs_subject", "subject_type", "subject_id"),
        db.Index("ix_audit_logs_action_created", "action", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)

    #: Nullable: a failed sign-in has no authenticated user, but an audit
    #: trail that omitted failed attempts would miss the most interesting
    #: event in it. The attempted identifier is kept separately.
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    actor_username = db.Column(db.String(80))

    action = db.Column(enum_column(AuditAction), nullable=False, index=True)

    #: What was acted on, named loosely so the trail covers every module (a
    #: sacramental record, a request, a parish, an account) without needing
    #: a foreign key column per module.
    subject_type = db.Column(db.String(60))
    subject_id = db.Column(db.Integer)
    #: A human-readable label captured at the time, so the trail can still
    #: be read after the subject has been renamed or removed.
    subject_label = db.Column(db.String(255))

    #: The changing values, as text rather than JSON: SQLite and MySQL
    #: differ in their JSON support, and this has to run on whichever
    #: database the parish server uses.
    old_values = db.Column(db.Text)
    new_values = db.Column(db.Text)

    #: Where the act came from. Under RA 10173 an access has to be
    #: attributable to a location, not only to an account.
    ip_address = db.Column(db.String(45))  # 45 chars fits an IPv6 address
    user_agent = db.Column(db.String(255))
    request_path = db.Column(db.String(255))
    request_method = db.Column(db.String(10))

    #: Free-text reason, for changes that need justifying (a rejected
    #: request, a withdrawn register entry).
    note = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    user = db.relationship("User", back_populates="audit_entries")

    @property
    def is_mutation(self) -> bool:
        """True when this entry records a change to stored data."""
        return self.action.is_mutation

    def __repr__(self) -> str:
        return (
            f"<AuditLog {self.action.value} {self.subject_type}"
            f"#{self.subject_id} by {self.actor_username or self.user_id}>"
        )
