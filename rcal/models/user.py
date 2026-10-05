"""Authenticated user accounts."""

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from .base import TimestampMixin, enum_column
from .enums import Role


class User(UserMixin, db.Model, TimestampMixin):
    """A signed-in account.

    ``role`` decides what the account may do (see :mod:`rcal.models.enums`).
    ``home_parish`` scopes parish-level users to a single parish, and
    ``clergy_record`` links a CLERGY account to the person in the clergy
    register.
    """

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True)
    display_name = db.Column(db.String(160))
    role = db.Column(enum_column(Role), nullable=False, default=Role.VIEWER)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    #: The parish a parish-scoped user (staff, clergy) works at.
    home_parish_id = db.Column(db.Integer, db.ForeignKey("parishes.id"), nullable=True)
    #: The person in the clergy register this account belongs to, if any.
    clergy_id = db.Column(db.Integer, db.ForeignKey("clergy.id"), nullable=True)

    home_parish = db.relationship("Parish", back_populates="users")
    clergy_record = db.relationship("Clergy", back_populates="user_accounts")

    #: Records this user has read (access accountability).
    access_logs = db.relationship("AccessLog", back_populates="user")
    #: Margin notes this user has written.
    annotations_made = db.relationship("Annotation", back_populates="annotated_by_user")

    # --- certificate workflow audit trail -----------------------------
    requests_made = db.relationship(
        "CertificateRequest", foreign_keys="CertificateRequest.requester_user_id",
        back_populates="requester_user",
    )
    requests_verified = db.relationship(
        "CertificateRequest", foreign_keys="CertificateRequest.verified_by_user_id",
        back_populates="verified_by_user",
    )
    requests_approved = db.relationship(
        "CertificateRequest", foreign_keys="CertificateRequest.approved_by_user_id",
        back_populates="approved_by_user",
    )
    requests_issued = db.relationship(
        "CertificateRequest", foreign_keys="CertificateRequest.issued_by_user_id",
        back_populates="issued_by_user",
    )
    requests_rejected = db.relationship(
        "CertificateRequest", foreign_keys="CertificateRequest.rejected_by_user_id",
        back_populates="rejected_by_user",
    )

    def set_password(self, password: str) -> None:
        """Store *password* as a salted hash (never the plain text)."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify *password* against the stored hash."""
        return check_password_hash(self.password_hash, password)

    @property
    def is_archdiocese_wide(self) -> bool:
        """Chancery and administrators see every parish, not just their own."""
        return self.role.is_archdiocese_wide

    @property
    def can_issue_certificates(self) -> bool:
        return self.role.can_issue_certificates

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role.label})>"
