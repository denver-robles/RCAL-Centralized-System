"""Vicariates and parishes — the directory of the archdiocese."""

from ..extensions import db
from .base import TimestampMixin


class Vicariate(db.Model, TimestampMixin):
    """An administrative grouping of parishes."""

    __tablename__ = "vicariates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), unique=True, nullable=False)
    description = db.Column(db.Text)

    parishes = db.relationship(
        "Parish", back_populates="vicariate", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vicariate {self.name}>"


class Parish(db.Model, TimestampMixin):
    """A single parish, the origin of its own sacramental registers.

    A parish's records are cited by book, page and entry *within* this
    parish — the citation is unique only inside one parish.
    """

    __tablename__ = "parishes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), unique=True, nullable=False, index=True)
    address = db.Column(db.String(300))
    municipality = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    email = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    vicariate_id = db.Column(
        db.Integer, db.ForeignKey("vicariates.id"), nullable=False
    )
    vicariate = db.relationship("Vicariate", back_populates="parishes")

    clergy_assignments = db.relationship(
        "ClergyAssignment", back_populates="parish", cascade="all, delete-orphan"
    )
    originating_records = db.relationship(
        "SacramentalRecord", back_populates="originating_parish"
    )
    users = db.relationship("User", back_populates="home_parish")
    mass_intentions = db.relationship("MassIntention", back_populates="parish")

    def __repr__(self) -> str:
        return f"<Parish {self.name}>"
