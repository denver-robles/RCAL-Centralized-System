"""Mass intentions and blessings requested through the archdiocese."""

from ..extensions import db
from .base import TimestampMixin, enum_column
from .enums import MassIntentionStatus


class MassIntention(db.Model, TimestampMixin):
    """A requested Mass.

    ``parish`` and ``scheduled_date`` stay null until the intention has
    actually been scheduled somewhere; until then the intention is simply
    pending.
    """

    __tablename__ = "mass_intentions"

    id = db.Column(db.Integer, primary_key=True)

    #: Who or what the Mass is for ("for the repose of the soul of ...").
    intended_for = db.Column(db.String(255), nullable=False)
    intention_text = db.Column(db.Text)
    requester_name = db.Column(db.String(160), nullable=False)
    requester_contact = db.Column(db.String(255))

    parish_id = db.Column(db.Integer, db.ForeignKey("parishes.id"))
    parish = db.relationship("Parish", back_populates="mass_intentions")

    scheduled_date = db.Column(db.DateTime(timezone=True))
    status = db.Column(
        enum_column(MassIntentionStatus),
        nullable=False,
        default=MassIntentionStatus.PENDING,
        index=True,
    )

    @property
    def is_completed(self) -> bool:
        return self.status is MassIntentionStatus.COMPLETED

    def __repr__(self) -> str:
        return f"<MassIntention #{self.id} {self.status.value}>"
