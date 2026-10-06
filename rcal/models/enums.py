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


#: The roles belonging to the parish office, as opposed to the public.
#: Defined at module level because a plain tuple inside an enum class body
#: is treated as another member, not as a constant.
STAFF_ROLE_VALUES = ("admin", "chancery", "parish_staff", "clergy", "viewer")


class Role(LabelledEnum):
    """What a signed-in user is permitted to do.

    There are two populations here, and the separation is a security
    boundary rather than a convenience (FR-1.3). Staff roles see the
    internal registers; ``PARISHIONER`` is a member of the public who may
    only file and track their own document requests, and must never reach
    a register, an analytics figure, or a schedule.
    """

    ADMIN = ("admin", "System Administrator")
    CHANCERY = ("chancery", "Chancery Office")
    PARISH_STAFF = ("parish_staff", "Parish Staff")
    CLERGY = ("clergy", "Clergy")
    VIEWER = ("viewer", "Read-only")
    PARISHIONER = ("parishioner", "Parishioner")

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

    @property
    def is_parishioner(self) -> bool:
        """True for the public portal role, which sees no internal module."""
        return self is Role.PARISHIONER

    @property
    def is_staff(self) -> bool:
        """True for every parish-office role.

        The inverse of :attr:`is_parishioner`. Stated as its own property
        so that a new staff role added later does not silently become a
        parishioner by omission from one list but not the other.
        """
        return self is not Role.PARISHIONER

    @property
    def can_view_registers(self) -> bool:
        """Whether the role may read canonical records at all (FR-1.3)."""
        return self.is_staff

    @property
    def can_view_analytics(self) -> bool:
        """Reports and analytics are internal-only (FR-2.7, FR-2.8)."""
        return self in {
            Role.ADMIN,
            Role.CHANCERY,
            Role.PARISH_STAFF,
            Role.CLERGY,
        }

    @property
    def can_manage_schedules(self) -> bool:
        """Who may create and change parish events (FR-2.1)."""
        return self in {Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF}

    @property
    def can_handle_requests(self) -> bool:
        """Who may review the document-request queue (FR-2.9, FR-2.10)."""
        return self in {Role.ADMIN, Role.CHANCERY, Role.PARISH_STAFF}

    @property
    def can_view_audit_log(self) -> bool:
        """The audit trail is for the chancery, not for every clerk
        (FR-1.4)."""
        return self in {Role.ADMIN, Role.CHANCERY}


class AuditAction(LabelledEnum):
    """What a user did, for the comprehensive audit trail (FR-1.4).

    The spec requires the log to distinguish a view from a creation from an
    edit from a print from a status change, because those carry different
    weight when the register is being tampered with. Storing the action as
    a controlled value rather than a free string is what makes that
    distinction reliably reportable.
    """

    LOGIN = ("login", "Signed in")
    LOGIN_FAILED = ("login_failed", "Sign-in failed")
    LOGOUT = ("logout", "Signed out")

    VIEW = ("view", "Viewed")
    CREATE = ("create", "Created")
    UPDATE = ("update", "Edited")
    PRINT = ("print", "Printed")
    EXPORT = ("export", "Exported")
    STATUS_CHANGE = ("status_change", "Status changed")
    ANNOTATE = ("annotate", "Margin note added")
    UPLOAD = ("upload", "Document uploaded")
    DELETE = ("delete", "Deleted")

    @property
    def is_mutation(self) -> bool:
        """True for actions that changed stored data.

        A read and a write are not equally serious, so reports and alerts
        filter on this rather than treating every row alike.
        """
        return self in {
            AuditAction.CREATE,
            AuditAction.UPDATE,
            AuditAction.STATUS_CHANGE,
            AuditAction.ANNOTATE,
            AuditAction.DELETE,
            AuditAction.UPLOAD,
        }


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
#: FR-2.9 names the stages as Pending Verification, Verified/Awaiting
#: Payment, Processing, Ready for Pickup or Out for Delivery, Completed,
#: Rejected. The online-payment stages are optional in the spec, so they
#: are reachable but not mandatory: a walk-in request goes straight from
#: approved to issued. Both paths are legal, and neither can skip
#: verification.
#:
#: Defined at module level rather than inside the enum because a class body
#: cannot refer to itself while it is being created.
REQUEST_TRANSITIONS = {
    "pending": ("verified", "rejected", "cancelled"),
    # The chancery authorises, then the request either waits for an online
    # payment or goes straight to being prepared.
    "verified": ("approved", "awaiting_payment", "rejected", "cancelled"),
    "awaiting_payment": ("processing", "rejected", "cancelled"),
    "approved": ("processing", "issued", "rejected", "cancelled"),
    "processing": ("ready", "out_for_delivery", "issued", "rejected", "cancelled"),
    "ready": ("issued", "out_for_delivery", "cancelled"),
    "out_for_delivery": ("issued", "cancelled"),
    # Terminal states. An issued certificate is evidence, so its request
    # is never reopened.
    "issued": (),
    "rejected": (),
    "cancelled": (),
}


class RequestStatus(LabelledEnum):
    """Lifecycle of a request for a certified copy.

    The first four stages are the original walk-in workflow; the rest were
    added for the parishioner portal, where a request may be paid for
    online and delivered by courier (FR-2.9).
    """

    PENDING = ("pending", "Pending Verification")
    VERIFIED = ("verified", "Verified")
    AWAITING_PAYMENT = ("awaiting_payment", "Awaiting Payment")
    APPROVED = ("approved", "Approved")
    PROCESSING = ("processing", "Processing")
    READY = ("ready", "Ready for Pickup")
    OUT_FOR_DELIVERY = ("out_for_delivery", "Out for Delivery")
    ISSUED = ("issued", "Completed")
    REJECTED = ("rejected", "Rejected")
    CANCELLED = ("cancelled", "Cancelled")

    @property
    def is_open(self) -> bool:
        """True while the request still needs someone to act on it.

        The physical delivery stages count as open: the parishioner is
        still waiting for the document.
        """
        return self in {
            RequestStatus.PENDING,
            RequestStatus.VERIFIED,
            RequestStatus.AWAITING_PAYMENT,
            RequestStatus.APPROVED,
            RequestStatus.PROCESSING,
            RequestStatus.READY,
            RequestStatus.OUT_FOR_DELIVERY,
        }

    @property
    def is_closed(self) -> bool:
        return not self.is_open

    @property
    def needs_online_payment(self) -> bool:
        """True at the stage where a fee is still owed (FR-2.9)."""
        return self is RequestStatus.AWAITING_PAYMENT

    @property
    def is_fulfilled(self) -> bool:
        """True only when the certificate has actually been completed."""
        return self is RequestStatus.ISSUED

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


class DocumentRequestStatus(LabelledEnum):
    """Lifecycle of a parishioner's document request in the public portal.

    Simpler than the internal certificate workflow (FR-2.9) by design. The
    parishioner sees only the stages that concern them; what the office
    does internally — verifying, approving, printing — is tracked on the
    certificate request this spawns.
    """

    SUBMITTED = ("submitted", "Submitted")
    UNDER_REVIEW = ("under_review", "Being verified")
    RECORD_NOT_FOUND = ("record_not_found", "Record not found")
    PROCESSING = ("processing", "Being prepared")
    READY = ("ready", "Ready for pickup")
    OUT_FOR_DELIVERY = ("out_for_delivery", "Out for delivery")
    COMPLETED = ("completed", "Completed")
    REJECTED = ("rejected", "Rejected")
    CANCELLED = ("cancelled", "Cancelled")

    @property
    def is_open(self) -> bool:
        return self in {
            DocumentRequestStatus.SUBMITTED,
            DocumentRequestStatus.UNDER_REVIEW,
            DocumentRequestStatus.PROCESSING,
            DocumentRequestStatus.READY,
            DocumentRequestStatus.OUT_FOR_DELIVERY,
        }

    @property
    def is_closed(self) -> bool:
        return not self.is_open

    @property
    def is_outcome(self) -> bool:
        """True for the terminal states, which the portal shows as a
        result rather than as progress."""
        return self in {
            DocumentRequestStatus.COMPLETED,
            DocumentRequestStatus.REJECTED,
            DocumentRequestStatus.CANCELLED,
            DocumentRequestStatus.RECORD_NOT_FOUND,
        }


class EventType(LabelledEnum):
    """What kind of parish activity is being scheduled (FR-2.1).

    The specification lists parish events, masses, sacraments and office
    activities. Sacraments are distinguished from the rest because they
    are the ones that must appear in the register, so scheduling one and
    recording it are two steps of the same real-world act.
    """

    MASS = ("mass", "Mass")
    BAPTISM = ("baptism", "Baptism")
    CONFIRMATION = ("confirmation", "Confirmation")
    WEDDING = ("wedding", "Wedding")
    FUNERAL = ("funeral", "Funeral / Burial")
    BLESSING = ("blessing", "Blessing")
    MEETING = ("meeting", "Meeting")
    OFFICE_ACTIVITY = ("office_activity", "Office Activity")
    OTHER = ("other", "Other")

    @property
    def is_sacrament(self) -> bool:
        """True when the event should result in a register entry."""
        return self in {
            EventType.BAPTISM,
            EventType.CONFIRMATION,
            EventType.WEDDING,
            EventType.FUNERAL,
        }

    @property
    def requires_clergy(self) -> bool:
        """True when a priest or deacon must be present.

        A meeting does not need one; a Mass or a sacrament does. Used to
        decide whether the absence of clergy on an event is a problem or
        simply not applicable.
        """
        return self in {
            EventType.MASS,
            EventType.BAPTISM,
            EventType.CONFIRMATION,
            EventType.WEDDING,
            EventType.FUNERAL,
            EventType.BLESSING,
        }


class EventStatus(LabelledEnum):
    """Lifecycle of a scheduled parish activity."""

    SCHEDULED = ("scheduled", "Scheduled")
    CONFIRMED = ("confirmed", "Confirmed")
    COMPLETED = ("completed", "Completed")
    CANCELLED = ("cancelled", "Cancelled")

    @property
    def is_open(self) -> bool:
        """True while the event is still going to happen."""
        return self in {EventStatus.SCHEDULED, EventStatus.CONFIRMED}

    @property
    def is_closed(self) -> bool:
        return not self.is_open


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
