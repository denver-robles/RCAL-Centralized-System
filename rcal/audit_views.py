"""The audit trail viewer (FR-1.4).

The trail itself is written by :mod:`rcal.audit` from wherever an action
happens; this module only reads it. Nothing here can edit or delete an
entry — an audit log that the application could rewrite would not be an
audit log.

Access is restricted to the chancery and administrators. A parish clerk
who could read the whole province's trail would learn about other
parishes' records, so the restriction is about the contents, not just
about tidiness.
"""

import csv
import io
from datetime import date, datetime, timedelta, timezone

from flask import (
    Blueprint,
    Response,
    current_app,
    render_template,
    request,
)
from flask_login import current_user
from sqlalchemy import select

from . import audit as audit_service
from . import services
from .auth import roles_required
from .extensions import db
from .models import AuditLog, User
from .models.enums import AuditAction, Role

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("/audit")
@roles_required(Role.ADMIN, Role.CHANCERY)
def index():
    """Browse the trail, newest first."""
    action_value = request.args.get("action", "").strip()
    action = (
        AuditAction(action_value)
        if action_value in AuditAction.values()
        else None
    )
    user_id = request.args.get("user", type=int)
    subject_type = request.args.get("subject", "").strip() or None
    days = request.args.get("days", type=int)
    mutations_only = request.args.get("mutations") == "1"

    since = None
    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)

    statement = services.audit_query(
        action=action,
        user_id=user_id,
        subject_type=subject_type,
        mutations_only=mutations_only,
        since=since,
    )
    pagination = db.paginate(
        statement.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()),
        page=request.args.get("page", 1, type=int),
        per_page=current_app.config["ITEMS_PER_PAGE"],
        error_out=False,
    )

    return render_template(
        "audit/index.html",
        pagination=pagination,
        stats=services.audit_stats(),
        actions=AuditAction,
        accounts=db.session.scalars(select(User).order_by(User.username)).all(),
        subject_types=_subject_types(),
        selected_action=action_value,
        selected_user=user_id,
        selected_subject=subject_type,
        selected_days=days,
        mutations_only=mutations_only,
    )


def _subject_types() -> list[str]:
    """The distinct subject types present in the trail, for the filter."""
    return [
        value
        for (value,) in db.session.execute(
            select(AuditLog.subject_type).distinct().order_by(AuditLog.subject_type)
        ).all()
        if value
    ]


@audit_bp.route("/audit/<int:entry_id>")
@roles_required(Role.ADMIN, Role.CHANCERY)
def detail(entry_id: int):
    """One entry, with its before/after values."""
    entry = db.get_or_404(AuditLog, entry_id)

    # Everything else that happened to the same object, so a single change
    # can be read in the context of the history around it.
    related = []
    if entry.subject_type and entry.subject_id:
        related = db.session.scalars(
            select(AuditLog)
            .where(
                AuditLog.subject_type == entry.subject_type,
                AuditLog.subject_id == entry.subject_id,
                AuditLog.id != entry.id,
            )
            .order_by(AuditLog.created_at.desc())
            .limit(20)
        ).all()

    return render_template(
        "audit/detail.html",
        entry=entry,
        related=related,
        old_values=_parse(entry.old_values),
        new_values=_parse(entry.new_values),
    )


def _parse(raw: str | None) -> dict | None:
    """Decode a stored snapshot for display, tolerating a plain string."""
    if not raw:
        return None
    import json

    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {"value": raw}
    return parsed if isinstance(parsed, dict) else {"value": parsed}


@audit_bp.route("/audit/export.csv")
@roles_required(Role.ADMIN, Role.CHANCERY)
def export_csv():
    """Download the trail as CSV.

    FR-2.8 asks for exportable summaries; a trail that can only be read on
    screen is not much use to an auditor. The export is itself recorded in
    the trail, because exporting personal data is an accountable act.
    """
    action_value = request.args.get("action", "").strip()
    action = (
        AuditAction(action_value) if action_value in AuditAction.values() else None
    )
    statement = services.audit_query(
        action=action,
        user_id=request.args.get("user", type=int),
        mutations_only=request.args.get("mutations") == "1",
    ).order_by(AuditLog.created_at.desc())

    rows = db.session.scalars(statement).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "created_at_utc",
            "actor",
            "action",
            "subject_type",
            "subject_id",
            "subject_label",
            "ip_address",
            "request_method",
            "request_path",
            "note",
            "old_values",
            "new_values",
        ]
    )
    for entry in rows:
        writer.writerow(
            [
                entry.id,
                entry.created_at.isoformat() if entry.created_at else "",
                entry.actor_username or "",
                entry.action.value,
                entry.subject_type or "",
                entry.subject_id if entry.subject_id is not None else "",
                entry.subject_label or "",
                entry.ip_address or "",
                entry.request_method or "",
                entry.request_path or "",
                entry.note or "",
                entry.old_values or "",
                entry.new_values or "",
            ]
        )

    audit_service.record(
        AuditAction.EXPORT,
        subject_type="AuditLog",
        subject_label=f"{len(rows)} entries",
        note="Audit trail exported as CSV",
    )
    db.session.commit()

    filename = f"rcal-audit-{date.today().isoformat()}.csv"
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
