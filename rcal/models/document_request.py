"""Document requests filed by parishioners through the public portal.

This is the *claim*. A parishioner says "I was baptised at San Sebastian
in 1995 under this name"; the parish then verifies that against the
register and matches it to a specific entry (FR-2.11).

Kept separate from :class:`~rcal.models.CertificateRequest` on purpose.
That model requires a real ``record_id``, which only exists once staff
have found the entry. If a portal submission wrote a
``CertificateRequest`` directly, the row would have to invent a register
link — exactly the thing verification exists to establish.

The lifecycle is deliberately simpler than the internal certificate
workflow: a parishioner can submit and then watch. They cannot verify,
approve, or issue, and nothing in the portal changes the request's
status.
"""

from ..extensions import db
from .base import TimestampMixin, enum_column
from .enums import DocumentRequestStatus, SacramentType


class DocumentRequest(db.Model, TimestampMixin):
    """One parishioner's request for a church document."""

    __tablename__ = "document_requests"

    id = db.Column(db.Integer, primary_key=True)

    #: The account that filed it. Not nullable: a request submitted without
    #: a traceable requester could not be verified or delivered.
    parishioner_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )

    # --- what is being asked for ---------------------------------------
    sacrament_type = db.Column(enum_column(SacramentType), nullable=False)
    #: The name as the requester believes it appears on the record.
    name_on_record = db.Column(db.String(160), nullable=False)
    date_of_birth = db.Column(db.Date)
    date_of_sacrament = db.Column(db.Date)
    #: Free text: a parishioner knows the church, not our parish ids.
    place_of_sacrament = db.Column(db.String(160))
    parents_or_spouse = db.Column(db.String(255))
    purpose = db.Column(db.String(255))

    #: Optionally, the parish they believe holds the record. Used to route
    #: the request to the right office; the staff still confirm it.
    targeted_parish_id = db.Column(db.Integer, db.ForeignKey("parishes.id"))

    # --- consent (FR-3.2) ------------------------------------------------
    #: Stamped rather than a boolean, because "they agreed" is only useful
    #: evidence if it says when and to what.
    consent_given_at = db.Column(db.DateTime(timezone=True))
    consent_version = db.Column(db.String(20), default="1.0")

    # --- outcome ---------------------------------------------------------
    status = db.Column(
        enum_column(DocumentRequestStatus),
        nullable=False,
        default=DocumentRequestStatus.SUBMITTED,
        index=True,
    )
    #: Set once staff have matched this claim to a real register entry.
    #: Null until then, which is what distinguishes an unverified claim
    #: from a confirmed one.
    matched_record_id = db.Column(
        db.Integer, db.ForeignKey("sacramental_records.id")
    )
    #: The internal certificate workflow spawned from this request.
    certificate_request_id = db.Column(
        db.Integer, db.ForeignKey("certificate_requests.id")
    )
    rejection_reason = db.Column(db.Text)

    #: Staff-facing note, never shown in the portal.
    internal_note = db.Column(db.Text)

    # --- relationships ---------------------------------------------------
    parishioner = db.relationship("User", back_populates="document_requests")
    targeted_parish = db.relationship("Parish")
    matched_record = db.relationship("SacramentalRecord")
    certificate_request = db.relationship("CertificateRequest")

    @property
    def is_open(self) -> bool:
        """True while the parishioner is still waiting."""
        return self.status.is_open

    @property
    def is_matched(self) -> bool:
        """True once a register entry has been linked by staff."""
        return self.matched_record_id is not None

    @property
    def is_document_request(self) -> bool:
        """True for parishioner portal requests."""
        return True

    def wants(self) -> str:
        """A one-line description, for lists and notifications."""
        year = self.date_of_sacrament.year if self.date_of_sacrament else "year unknown"
        return f"{self.sacrament_type.label} — {self.name_on_record} ({year})"

    def __repr__(self) -> str:
        return (
            f"<DocumentRequest #{self.id} {self.sacrament_type.value} "
            f"{self.status.value}>"
        )
