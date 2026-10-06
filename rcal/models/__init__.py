"""Database models, re-exported in one place.

Import from ``rcal.models`` so that blueprints, the CLI and the tests
never reach into individual model modules.
"""

from .enums import (
    AnnotationType,
    AssignmentRole,
    AuditAction,
    ClergyTitle,
    DocumentRequestStatus,
    EventStatus,
    EventType,
    LabelledEnum,
    LegitimacyStatus,
    MassIntentionStatus,
    RequestStatus,
    Role,
    SacramentType,
    Sex,
)
from .user import User
from .parish import Vicariate, Parish
from .clergy import Clergy, ClergyAssignment
from .person import Person
from .record import SacramentalRecord, Annotation
from .request import CertificateRequest
from .mass import MassIntention
from .audit import AccessLog, AuditLog
from .document_request import DocumentRequest
from .event import ParishEvent, Venue

__all__ = [
    # enums
    "LabelledEnum",
    "Role",
    "Sex",
    "SacramentType",
    "LegitimacyStatus",
    "AnnotationType",
    "AuditAction",
    "DocumentRequestStatus",
    "EventType",
    "EventStatus",
    "RequestStatus",
    "MassIntentionStatus",
    "ClergyTitle",
    "AssignmentRole",
    # models
    "User",
    "Vicariate",
    "Parish",
    "Clergy",
    "ClergyAssignment",
    "Person",
    "SacramentalRecord",
    "Annotation",
    "CertificateRequest",
    "MassIntention",
    "AccessLog",
    "AuditLog",
    "DocumentRequest",
    "Venue",
    "ParishEvent",
]
