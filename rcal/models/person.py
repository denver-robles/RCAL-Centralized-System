"""Persons named in the registers."""

from ..extensions import db
from .base import NameMixin, TimestampMixin, enum_column
from .enums import Sex


class Person(NameMixin, db.Model, TimestampMixin):
    """The person a register entry is about.

    Identity is deliberately *not* unique on the name: a woman is baptised
    under her maiden name and married under her husband's, so the same
    person may appear under different surnames in different registers.
    Records link to a Person, and duplicates are resolved deliberately, not
    by the database.
    """

    __tablename__ = "persons"

    id = db.Column(db.Integer, primary_key=True)
    sex = db.Column(enum_column(Sex), nullable=False)
    date_of_birth = db.Column(db.Date)
    date_of_death = db.Column(db.Date)

    records_as_subject = db.relationship(
        "SacramentalRecord",
        back_populates="person",
        foreign_keys="SacramentalRecord.person_id",
    )
    records_as_spouse = db.relationship(
        "SacramentalRecord",
        back_populates="spouse",
        foreign_keys="SacramentalRecord.spouse_person_id",
    )

    @property
    def is_deceased(self) -> bool:
        return self.date_of_death is not None

    def __repr__(self) -> str:
        return f"<Person {self.full_name}>"
