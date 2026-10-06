"""The certified-copy workflow: requested -> verified -> issued.

The certified true copy is the system's real deliverable to a citizen, so
its lifecycle carries a full audit trail: every status change records who
made it and when, and the stamped certificate number makes the issued copy
verifiable afterwards.
"""

from ..extensions import db
from .base import TimestampMixin, enum_column
from .enums import RequestStatus


class CertificateRequest(db.Model, TimestampMixin):
    """A request for a certified copy of one register entry."""

    __tablename__ = "certificate_requests"

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(
        db.Integer, db.ForeignKey("sacramental_records.id"), nullable=False,
        index=True,
    )

    #: Who asked: a signed-in staff member, or a named lay requester when
    #: the staff member files it on someone else's behalf.
    requester_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    requester_name = db.Column(db.String(160), nullable=False)
    requester_contact = db.Column(db.String(255))

    #: Why the copy is needed (e.g. "marriage documentation").
    purpose = db.Column(db.String(255))

    status = db.Column(
        enum_column(RequestStatus),
        nullable=False,
        default=RequestStatus.PENDING,
        index=True,
    )

    #: Stamped when the copy is issued.
    certificate_number = db.Column(db.String(40), unique=True)

    # --- workflow audit trail ------------------------------------------------
    verified_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    verified_at = db.Column(db.DateTime(timezone=True))
    #: Kept separate from verification: the holding parish verifies the
    #: entry, the chancery authorises the issue, and the certificate's
    #: provenance has to show both.
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    approved_at = db.Column(db.DateTime(timezone=True))
    issued_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    issued_at = db.Column(db.DateTime(timezone=True))
    rejected_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    rejected_at = db.Column(db.DateTime(timezone=True))
    rejection_reason = db.Column(db.Text)

    # --- relationships ---------------------------------------------------------
    record = db.relationship("SacramentalRecord", back_populates="certificate_requests")
    requester_user = db.relationship(
        "User",
        foreign_keys=[requester_user_id],
        back_populates="requests_made",
    )
    verified_by_user = db.relationship(
        "User",
        foreign_keys=[verified_by_user_id],
        back_populates="requests_verified",
    )
    approved_by_user = db.relationship(
        "User",
        foreign_keys=[approved_by_user_id],
        back_populates="requests_approved",
    )
    issued_by_user = db.relationship(
        "User",
        foreign_keys=[issued_by_user_id],
        back_populates="requests_issued",
    )
    rejected_by_user = db.relationship(
        "User",
        foreign_keys=[rejected_by_user_id],
        back_populates="requests_rejected",
    )

    @property
    def is_open(self) -> bool:
        """Pending, verified and approved requests still need action."""
        return self.status.is_open

    @property
    def is_document_request(self) -> bool:
        """False for internal certificate requests."""
        return False

    def __repr__(self) -> str:
        return f"<CertificateRequest #{self.id} {self.status.value}>"
