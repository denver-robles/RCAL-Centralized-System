"""Sacramental register entries and their margin notes.

Register entries are **immutable**: once transcribed, a record is never
edited. Everything that happens afterwards is stored as an
:class:`Annotation` — the database row stays exactly as it was written.
"""

from ..extensions import db
from .base import enum_column, utcnow
from .enums import AnnotationType, LegitimacyStatus, SacramentType


class SacramentalRecord(db.Model):
    """One entry in a parish register.

    The citation ``(parish, type, book, page, entry)`` is what makes the
    record legally verifiable, and it is unique archdiocese-wide — two
    entries can never share it.
    """

    __tablename__ = "sacramental_records"
    __table_args__ = (
        db.UniqueConstraint(
            "originating_parish_id",
            "sacrament_type",
            "book_number",
            "page_number",
            "entry_number",
            name="uq_record_citation",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    # --- who the entry is about ---------------------------------------
    person_id = db.Column(db.Integer, db.ForeignKey("persons.id"), nullable=False)
    #: Present for marriage records: the other party.
    spouse_person_id = db.Column(db.Integer, db.ForeignKey("persons.id"))
    sacrament_type = db.Column(enum_column(SacramentType), nullable=False)
    event_date = db.Column(db.Date, nullable=False, index=True)

    # --- register citation (the record's legal handle) ------------------
    book_number = db.Column(db.Integer, nullable=False)
    page_number = db.Column(db.Integer, nullable=False)
    entry_number = db.Column(db.Integer, nullable=False)
    originating_parish_id = db.Column(
        db.Integer, db.ForeignKey("parishes.id"), nullable=False, index=True
    )
    performed_by_clergy_id = db.Column(db.Integer, db.ForeignKey("clergy.id"))

    # --- details as written in the register ------------------------------
    #: Baptism only, historically recorded.
    legitimacy = db.Column(enum_column(LegitimacyStatus))
    godparents = db.Column(db.Text)
    witnesses = db.Column(db.Text)
    place_of_event = db.Column(db.String(160))
    register_notes = db.Column(db.Text)

    #: When the entry was transcribed into the system. Records carry no
    #: ``updated_at`` on purpose — they are never modified.
    created_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, nullable=False
    )

    # --- relationships -----------------------------------------------------
    person = db.relationship(
        "Person", foreign_keys=[person_id], back_populates="records_as_subject"
    )
    spouse = db.relationship(
        "Person", foreign_keys=[spouse_person_id], back_populates="records_as_spouse"
    )
    originating_parish = db.relationship(
        "Parish", back_populates="originating_records"
    )
    performed_by_clergy = db.relationship(
        "Clergy", back_populates="performed_records"
    )
    annotations = db.relationship(
        "Annotation",
        foreign_keys="Annotation.record_id",
        back_populates="record",
        cascade="all, delete-orphan",
    )
    certificate_requests = db.relationship(
        "CertificateRequest", back_populates="record"
    )
    access_logs = db.relationship("AccessLog", back_populates="record")

    @property
    def citation(self) -> str:
        """'Book 3, Page 42, Entry 7' — the short legal citation."""
        return (
            f"Book {self.book_number}, Page {self.page_number}, "
            f"Entry {self.entry_number}"
        )

    def add_annotation(
        self,
        annotation_type: AnnotationType,
        note_text: str,
        *,
        annotated_by=None,
        event_date=None,
        reference_record=None,
    ) -> "Annotation":
        """Append a margin note. The record itself is left untouched."""
        annotation = Annotation(
            record=self,
            annotation_type=annotation_type,
            note_text=note_text,
            annotated_by_user=annotated_by,
            event_date=event_date,
            reference_record=reference_record,
        )
        db.session.add(annotation)
        return annotation

    def __repr__(self) -> str:
        return (
            f"<SacramentalRecord #{self.id} "
            f"{self.sacrament_type.value} ({self.citation})>"
        )


class Annotation(db.Model):
    """An append-only margin note attached to a register entry.

    Notes are never edited either; a correction is recorded as a new note
    (see :class:`~rcal.models.enums.AnnotationType` ``NAME_CORRECTION``).
    """

    __tablename__ = "annotations"

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(
        db.Integer, db.ForeignKey("sacramental_records.id"), nullable=False
    )
    annotation_type = db.Column(enum_column(AnnotationType), nullable=False)
    note_text = db.Column(db.Text, nullable=False)
    #: When the event the note refers to took place, if known.
    event_date = db.Column(db.Date)
    #: When the note points at another register entry (e.g. a baptism
    #: annotated 'married — see marriage register, B1 P5 E2').
    reference_record_id = db.Column(db.Integer, db.ForeignKey("sacramental_records.id"))
    annotated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    created_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, nullable=False
    )

    record = db.relationship(
        "SacramentalRecord",
        foreign_keys=[record_id],
        back_populates="annotations",
    )
    reference_record = db.relationship(
        "SacramentalRecord", foreign_keys=[reference_record_id]
    )
    annotated_by_user = db.relationship("User", back_populates="annotations_made")

    def __repr__(self) -> str:
        return f"<Annotation {self.annotation_type.value} on record {self.record_id}>"
