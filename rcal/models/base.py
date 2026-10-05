"""Infrastructure shared by every model: timestamps, enum columns, mixins."""

from datetime import datetime, timezone

from ..extensions import db


def utcnow() -> datetime:
    """Current time in UTC.

    Sacramental records are legal documents that may be checked years later
    from a different timezone, so every timestamp is stored in UTC and
    rendered in Philippine time at display time.
    """
    return datetime.now(timezone.utc)


def enum_column(enum_class, **kwargs):
    """A portable enum column that stores the human-readable value.

    ``native_enum=False`` produces the same DDL on SQLite and MySQL, and
    ``values_callable`` makes the database contain ``parish_staff`` rather
    than ``PARISH_STAFF``, which keeps raw queries and reports readable.
    """
    return db.Enum(
        enum_class,
        values_callable=lambda cls: [member.value for member in cls],
        native_enum=False,
        validate_strings=True,
        **kwargs,
    )


class TimestampMixin:
    """Adds ``created_at`` and ``updated_at`` columns to a model."""

    created_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )


class NameMixin:
    """Filipino name parts, stored separately so records can be searched.

    The split matters for this domain: a baptismal register is indexed by
    surname, and the same person may appear under different surnames in
    different registers — a woman is baptised under her maiden name and
    married under her husband's.
    """

    first_name = db.Column(db.String(80), nullable=False, index=True)
    middle_name = db.Column(db.String(80))
    last_name = db.Column(db.String(80), nullable=False, index=True)
    suffix = db.Column(db.String(20))

    @property
    def full_name(self) -> str:
        """'Juan Santos Dela Cruz Jr.' — the name as it is written out."""
        parts = (self.first_name, self.middle_name, self.last_name, self.suffix)
        return " ".join(part for part in parts if part)

    @property
    def sort_name(self) -> str:
        """'Dela Cruz, Juan Santos Jr.' — the name as it is filed."""
        given = " ".join(
            part for part in (self.first_name, self.middle_name, self.suffix) if part
        )
        return f"{self.last_name}, {given}" if given else self.last_name
