"""Clergy and their parish assignments."""

from ..extensions import db
from .base import NameMixin, TimestampMixin, enum_column
from .enums import AssignmentRole, ClergyTitle, Sex


class Clergy(NameMixin, db.Model, TimestampMixin):
    """A member of the clergy as held in the archdiocesan personnel files.

    A cleric is a person in their own right; they are not required to have
    a sign-in account, so accounts reference this model rather than the
    other way round.
    """

    __tablename__ = "clergy"

    id = db.Column(db.Integer, primary_key=True)
    sex = db.Column(enum_column(Sex), nullable=False)
    title = db.Column(
        enum_column(ClergyTitle), nullable=False, default=ClergyTitle.FATHER
    )
    date_of_birth = db.Column(db.Date)
    ordination_date = db.Column(db.Date)
    date_of_death = db.Column(db.Date)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    assignments = db.relationship(
        "ClergyAssignment", back_populates="clergy", cascade="all, delete-orphan"
    )
    performed_records = db.relationship(
        "SacramentalRecord", back_populates="performed_by_clergy"
    )
    user_accounts = db.relationship("User", back_populates="clergy_record")

    @property
    def titled_name(self) -> str:
        """'Rev. Fr. Juan Santos Dela Cruz Jr.' — the address form."""
        return f"{self.title.label} {self.full_name}"

    def __repr__(self) -> str:
        return f"<Clergy {self.full_name}>"


class ClergyAssignment(db.Model, TimestampMixin):
    """A post held by a cleric at a parish.

    Clergy move between parishes, so a single cleric accumulates several
    assignments over a career; the one with no end date is the current one.
    """

    __tablename__ = "clergy_assignments"

    id = db.Column(db.Integer, primary_key=True)
    clergy_id = db.Column(
        db.Integer, db.ForeignKey("clergy.id"), nullable=False
    )
    parish_id = db.Column(
        db.Integer, db.ForeignKey("parishes.id"), nullable=False
    )
    role = db.Column(
        enum_column(AssignmentRole),
        nullable=False,
        default=AssignmentRole.PARISH_PRIEST,
    )
    assigned_from = db.Column(db.Date, nullable=False)
    #: Null means the assignment is still in force.
    assigned_to = db.Column(db.Date)

    clergy = db.relationship("Clergy", back_populates="assignments")
    parish = db.relationship("Parish", back_populates="clergy_assignments")

    @property
    def is_current(self) -> bool:
        return self.assigned_to is None

    def __repr__(self) -> str:
        return (
            f"<ClergyAssignment {self.clergy_id} @ {self.parish_id} "
            f"({self.role.value})>"
        )
