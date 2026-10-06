"""Writing to the audit trail (FR-1.4).

One function, :func:`record`, is the only way an ``AuditLog`` row is
created. Views do not construct the model directly, because the whole
value of an audit trail is that it is uniform: every entry has an actor,
a time, an origin, and — where data changed — the values before and after.

Two design points worth stating.

**The IP address is resolved here, not passed in.** Flask can report the
address from the request in more than one way depending on whether the app
sits behind a proxy, and getting that wrong records the load balancer's
address for every action. Centralising it means one place to fix.

**Recording never raises.** An audit write happens inside a request that
has already done its real work. If the trail could raise, a logging
failure would roll back a legitimate certificate issue. Failures are
swallowed and surfaced on the app logger instead, so a broken trail is
visible without breaking the parish's work.
"""

import json
import logging

from flask import has_request_context, request
from flask_login import current_user

from .extensions import db
from .models import AuditLog
from .models.enums import AuditAction

logger = logging.getLogger(__name__)

#: Header order matters. The leftmost is the original client; the others
#: are proxies the request passed through.
_FORWARDED_HEADERS = ("X-Forwarded-For", "X-Real-IP")


def client_ip() -> str | None:
    """The originating client address for the current request.

    Prefers the proxy headers, because in the intended deployment the
    application sits behind a reverse proxy and ``request.remote_addr``
    would otherwise record the proxy for every single action.
    """
    if not has_request_context():
        return None

    for header in _FORWARDED_HEADERS:
        value = request.headers.get(header)
        if value:
            # X-Forwarded-For may be a chain: "client, proxy1, proxy2".
            return value.split(",")[0].strip()

    return request.remote_addr


def _as_json(values) -> str | None:
    """Serialise a snapshot for storage, or ``None`` when there is none.

    Dates and enums are converted because neither is JSON-serialisable and
    both appear in nearly every snapshot of a register entry.
    """
    if values is None:
        return None
    if isinstance(values, str):
        return values
    try:
        return json.dumps(values, default=str, sort_keys=True)
    except (TypeError, ValueError):
        # A snapshot that cannot be serialised is still worth recording as
        # a readable string rather than losing the entry entirely.
        return str(values)


def record(
    action: AuditAction,
    *,
    subject=None,
    subject_type: str | None = None,
    subject_id: int | None = None,
    subject_label: str | None = None,
    old_values=None,
    new_values=None,
    note: str | None = None,
    user=None,
    actor_username: str | None = None,
    commit: bool = False,
) -> AuditLog | None:
    """Append one row to the audit trail.

    *subject* is any model instance; its class name and primary key are
    used unless overridden. *user* defaults to the signed-in account, and
    *actor_username* to that account's username — but a failed sign-in has
    neither, which is why both can be supplied explicitly.

    Returns the entry, or ``None`` if it could not be written.
    """
    try:
        if subject is not None:
            # Unwrap before naming: a LocalProxy reports its own class name.
            subject = _unwrap(subject)
            subject_type = subject_type or type(subject).__name__
            subject_id = subject_id if subject_id is not None else getattr(subject, "id", None)
            if subject_label is None:
                subject_label = _label_for(subject)

        actor = user
        if actor is None and has_request_context() and current_user.is_authenticated:
            actor = current_user
        actor = _unwrap(actor) if actor is not None else None

        if actor_username is None and actor is not None:
            actor_username = getattr(actor, "username", None)

        entry = AuditLog(
            user_id=getattr(actor, "id", None),
            actor_username=actor_username,
            action=action,
            subject_type=subject_type,
            subject_id=subject_id,
            subject_label=subject_label,
            old_values=_as_json(old_values),
            new_values=_as_json(new_values),
            note=note,
            ip_address=client_ip(),
            user_agent=(request.user_agent.string[:255] if has_request_context() else None),
            request_path=(request.path[:255] if has_request_context() else None),
            request_method=(request.method if has_request_context() else None),
        )
        db.session.add(entry)
        if commit:
            db.session.commit()
        return entry
    except Exception:  # noqa: BLE001 - see module docstring
        logger.exception("Could not write audit entry for %s", action)
        return None


def _unwrap(subject):
    """Resolve a Flask-Login ``LocalProxy`` to the object it points at.

    Passing ``current_user`` gives a proxy, not the ``User``. Its class
    name is ``LocalProxy`` and attribute access is forwarded, so the trail
    recorded subjects as ``LocalProxy`` with no id — which is precisely
    the information an audit trail exists to capture. Unwrapping here
    means every caller can pass ``current_user`` without knowing this.
    """
    # ``_get_current_object`` is the documented way to unwrap a werkzeug
    # proxy; anything else is already a real object.
    getter = getattr(subject, "_get_current_object", None)
    if callable(getter):
        try:
            return getter()
        except RuntimeError:
            return subject
    return subject


def _label_for(subject) -> str | None:
    """A human-readable name for *subject*, if it has an obvious one."""
    subject = _unwrap(subject)
    for attribute in ("full_name", "sort_name", "name", "username", "title"):
        value = getattr(subject, attribute, None)
        if isinstance(value, str) and value:
            return value[:255]
    return None


def snapshot(instance, fields) -> dict:
    """The current values of *fields*, for storing as an old/new snapshot.

    Enums are reduced to their stored value and dates to ISO strings, so
    the snapshot reads the same way in the database as it does in the
    application.
    """
    values = {}
    for field in fields:
        value = getattr(instance, field, None)
        if hasattr(value, "value"):  # a LabelledEnum member
            value = value.value
        elif hasattr(value, "isoformat"):  # date or datetime
            value = value.isoformat()
        values[field] = value
    return values


def changes(old: dict, new: dict) -> dict:
    """Only the fields that actually differ between two snapshots.

    Storing an unchanged field on every edit would bury the one line that
    matters, which is the opposite of what an audit trail is for.
    """
    return {
        field: {"from": old.get(field), "to": new.get(field)}
        for field in new
        if old.get(field) != new.get(field)
    }
