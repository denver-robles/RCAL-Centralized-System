"""Accountability log: who read which record, and when.

These registers hold personal data that is also legal evidence, so under
RA 10173 access to them must be accountable. Canon law decides who may
look; this table records that staff did look.
"""

from ..extensions import db
from .base import utcnow


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
