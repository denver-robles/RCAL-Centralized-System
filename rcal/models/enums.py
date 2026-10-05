"""Domain vocabulary.

Every controlled list in the system is declared once, here. The database
columns, the forms and the templates all read from these definitions, so a
new status or sacrament type is added in exactly one place.
"""

from enum import Enum


class LabelledEnum(Enum):
    """An enum whose members carry both a stored value and a display label.

    Declared as ``MEMBER = ("stored_value", "Display label")``.
    """

    def __new__(cls, value: str, label: str):
        member = object.__new__(cls)
        member._value_ = value
        member.label = label
        return member

    def __str__(self) -> str:  # pragma: no cover - convenience for templates
        return self.label

    @classmethod
    def values(cls) -> list[str]:
        """Every stored value, for populating a dropdown."""
        return [member.value for member in cls]

    @classmethod
    def labels(cls) -> dict[str, str]:
        """Value -> label, the shape a form's dropdown needs."""
        return {member.value: member.label for member in cls}


class Role(LabelledEnum):
    """What a signed-in user is permitted to do."""

    ADMIN = ("admin", "System Administrator")
    CHANCERY = ("chancery", "Chancery Office")
    PARISH_STAFF = ("parish_staff", "Parish Staff")
    CLERGY = ("clergy", "Clergy")
    VIEWER = ("viewer", "Read-only")

    @property
    def can_manage_users(self) -> bool:
        return self is Role.ADMIN

    @property
    def can_issue_certificates(self) -> bool:
        return self in {Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF}

    @property
    def is_archdiocese_wide(self) -> bool:
        """Chancery and administrators see every parish, not just their own."""
        return self in {Role.ADMIN, Role.CHANCERY}


class Sex(LabelledEnum):
    """Recorded sex, as it appears on the sacramental registers."""

    MALE = ("male", "Male")
    FEMALE = ("female", "Female")


class SacramentType(LabelledEnum):
    """The parish registers covered by this system.

    Burial is not itself a sacrament, but the dead are recorded in the same
    parish books and certificates for them are requested the same way, so
    the registers are managed together.
    """

    BAPTISM = ("baptism", "Baptism")
    CONFIRMATION = ("confirmation", "Confirmation")
    MARRIAGE = ("marriage", "Marriage")
    DEATH = ("death", "Death / Burial")


class LegitimacyStatus(LabelledEnum):
    """A child's status at baptism.

    Historically recorded on the baptismal register because it carried
    consequences for later marriage dispensations. Kept optional, because
    modern practice increasingly omits it.
    """

    LEGITIMATE = ("legitimate", "Legitimate")
    ILLEGITIMATE = ("illegitimate", "Illegitimate")


class AnnotationType(LabelledEnum):
    """Margin notes added to a record after it was written.

    Records are annotated, never altered. Each note references the later
    event so that a certificate reissued decades later is still correct.
    """

    MARRIAGE = ("marriage", "Marriage")
    CONFIRMATION = ("confirmation", "Confirmation")
    ORDINATION = ("ordination", "Ordination")
    RELIGIOUS_PROFESSION = ("religious_profession", "Religious Profession")
    FULL_COMMUNION = ("full_communion", "Received into Full Communion")
    DEATH = ("death", "Death")
    NAME_CORRECTION = ("name_correction", "Name Correction")
    OTHER = ("other", "Other")

    @property
    def links_to_record(self) -> bool:
        """True when the note should point at another register entry."""
        return self in {
            AnnotationType.MARRIAGE,
            AnnotationType.CONFIRMATION,
            AnnotationType.ORDINATION,
            AnnotationType.DEATH,
        }


#: Which status each status may move to. Declaring the lifecycle as data
#: means a view can never accidentally skip the verification step, and a
#: request that is already issued cannot be silently reopened.
#:
#: Defined at module level rather than inside the enum because a class body
#: cannot refer to itself while it is being created.
REQUEST_TRANSITIONS = {
    "pending": ("verified", "rejected", "cancelled"),
    "verified": ("approved", "rejected", "cancelled"),
    "approved": ("issued", "rejected", "cancelled"),
    "issued": (),
    "rejected": (),
    "cancelled": (),
}


class RequestStatus(LabelledEnum):
    """Lifecycle of a request for a certified copy."""

    PENDING = ("pending", "Pending")
    VERIFIED = ("verified", "Verified")
    APPROVED = ("approved", "Approved")
    ISSUED = ("issued", "Issued")
    REJECTED = ("rejected", "Rejected")
    CANCELLED = ("cancelled", "Cancelled")

    @property
    def is_open(self) -> bool:
        return self in {
            RequestStatus.PENDING,
            RequestStatus.VERIFIED,
            RequestStatus.APPROVED,
        }

    @property
    def is_closed(self) -> bool:
        return not self.is_open

    @classmethod
    def open_values(cls):
        """The stored values of every status that still needs action.

        Used as a SQL filter, where the enum members themselves cannot be
        passed to ``in_()``.
        """
        return [member.value for member in cls if member.is_open]

    @classmethod
    def closed_values(cls):
        return [member.value for member in cls if member.is_closed]

    def allowed_transitions(self) -> list["RequestStatus"]:
        """The statuses this one may move to."""
        return [
            type(self)(target) for target in REQUEST_TRANSITIONS.get(self.value, ())
        ]

    def can_transition_to(self, target: "RequestStatus") -> bool:
        """Whether the workflow may move from this status to *target*."""
        return target in self.allowed_transitions()


class MassIntentionStatus(LabelledEnum):
    """Lifecycle of a requested Mass."""

    PENDING = ("pending", "Pending")
    SCHEDULED = ("scheduled", "Scheduled")
    COMPLETED = ("completed", "Completed")
    CANCELLED = ("cancelled", "Cancelled")


class ClergyTitle(LabelledEnum):
    """The honorific used when addressing a member of the clergy."""

    ARCHBISHOP = ("archbishop", "Most Rev.")
    BISHOP = ("bishop", "Most Rev.")
    MONSIGNOR = ("monsignor", "Msgr.")
    FATHER = ("father", "Rev. Fr.")
    DEACON = ("deacon", "Rev. Mr.")


class AssignmentRole(LabelledEnum):
    """A member of the clergy's post at a parish."""

    PARISH_PRIEST = ("parish_priest", "Parish Priest")
    ASSISTANT_PRIEST = ("assistant_priest", "Assistant Priest")
    PARISH_ADMINISTRATOR = ("parish_administrator", "Parish Administrator")
    CHAPLAIN = ("chaplain", "Chaplain")
    DEACON = ("deacon", "Deacon")
    RETIRED = ("retired", "Retired")
