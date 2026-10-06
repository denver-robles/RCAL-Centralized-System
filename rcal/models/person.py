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

    # --- parents (FR-2.5) -------------------------------------------
    #: The registers record parents by name, and the specification asks
    #: for records to be searchable by them. Stored both as free text,
    #: because that is how the register actually reads, and as links to
    #: other Person rows where the same family appears repeatedly.
    #: A baptismal certificate is commonly requested by a parent's name,
    #: so this is searched far more often than it looks.
    father_name = db.Column(db.String(160))
    mother_name = db.Column(db.String(160))
    father_id = db.Column(db.Integer, db.ForeignKey("persons.id"))
    mother_id = db.Column(db.Integer, db.ForeignKey("persons.id"))

    father = db.relationship(
        "Person", remote_side=[id], foreign_keys=[father_id], backref="children_as_father"
    )
    mother = db.relationship(
        "Person", remote_side=[id], foreign_keys=[mother_id], backref="children_as_mother"
    )

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

    @property
    def parent_names(self) -> str:
        """'Juan Dela Cruz and Maria Santos' — the parents as the register
        writes them, for display and search."""
        parts = [name for name in (self.father_name, self.mother_name) if name]
        return " and ".join(parts)

    def __repr__(self) -> str:
        return f"<Person {self.full_name}>"
