"""Authentication and account administration.

Sign-in, sign-out, self-service password change, and the administrator's
account list. Everything here runs before the records modules exist, so the
only role check performed is the one that matters for the data being
served: an account must be active to get a session at all.

These routes are the first half of the roadmap item "authentication with
hashed passwords and role-based access". The role-to-permission mapping
itself lives on :class:`rcal.models.enums.Role`; this module exposes it
through the :func:`roles_required` decorator rather than re-stating it.
"""

import secrets
from urllib.parse import urljoin, urlparse

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func, or_, select

from . import audit, services
from .extensions import db
from .forms import ChangePasswordForm, LoginForm, UserForm
from .models import ParishEvent, SacramentalRecord, User
from .models.enums import AuditAction, EventStatus, Role

auth_bp = Blueprint("auth", __name__)
admin_bp = Blueprint("admin", __name__)


def roles_required(*roles: Role):
    """Allow the request only for the listed roles.

    Anonymous visitors are sent to the sign-in page; a signed-in account
    without the role gets a 403 rather than a redirect, because silently
    bouncing it to the login form would loop.
    """
    allowed = set(roles)

    def decorator(view):
        from functools import wraps

        @wraps(view)
        @login_required
        def wrapper(*args, **kwargs):
            if current_user.role not in allowed:
                return render_template("errors/403.html"), 403
            return view(*args, **kwargs)

        return wrapper

    return decorator


def staff_required(view):
    """Allow only parish-office roles; parishioners get a 403.

    The blunt counterpart to :func:`roles_required`, for the internal
    modules where every staff role is welcome and the public role is not.
    """
    from functools import wraps

    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user.role.is_staff:
            return render_template("errors/403.html"), 403
        return view(*args, **kwargs)

    return wrapper


#: URL path prefixes that belong to the parish office and must never be
#: reachable by a parishioner account (FR-1.3).
#:
#: Enforcing this per-view would mean trusting every future view to
#: remember the decorator, and one omission would quietly expose the
#: registers. A single check on the path is one rule in one place, and it
#: fails closed: a new internal module added under one of these prefixes
#: is protected by default rather than by remembering.
INTERNAL_PATH_PREFIXES = (
    "/directory",
    "/records",
    "/certificates",
    "/audit",
    "/intentions",
    "/admin",
    "/analytics",
)

#: The only areas a parishioner account may reach.
PARISHIONER_PATH_PREFIXES = ("/portal", "/account", "/logout", "/login")


def register_role_isolation(app) -> None:
    """Install the global parishioner isolation guard on *app*.

    Runs before every request. A parishioner whose path is outside the
    public portal is refused, whether or not the view it is heading for
    happens to carry a decorator.
    """
    from flask import request

    @app.before_request
    def _isolate_parishioners():
        if not current_user.is_authenticated:
            return None
        if current_user.role.is_staff:
            return None

        path = request.path
        if path.startswith(PARISHIONER_PATH_PREFIXES):
            return None
        if path.startswith(INTERNAL_PATH_PREFIXES):
            return render_template("errors/403.html"), 403
        # Static assets and the public pages stay open.
        return None


def landing_url(user=None):
    """Where a signed-in account should land after signing in.

    A parishioner has no dashboard in the internal sense — the staff
    dashboard reads register entries — so sending them there would either
    leak data or, as the isolation guard does, bounce them with a 403 the
    moment they signed in. One function decides this, so every redirect
    agrees.
    """
    from flask import url_for

    user = user or current_user
    if getattr(user, "is_authenticated", False) and user.role.is_parishioner:
        return url_for("portal.dashboard")
    return url_for("auth.dashboard")


def is_safe_url(target: str) -> bool:
    """True when *target* points back at this site.

    Guards the ``?next=`` parameter against open-redirects: a crafted link
    to another host would otherwise hand the user straight off a page they
    just trusted with their password. An absolute URL is only safe when it
    names this very host, so ``http://evil.example`` is rejected outright
    rather than being treated as a relative path.
    """
    if not target:
        return False
    host = urlparse(request.host_url)
    candidate = urlparse(urljoin(request.host_url, target))
    return candidate.scheme in ("http", "https") and host.netloc == candidate.netloc


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """Sign in with a username or an email address."""
    if current_user.is_authenticated:
        return redirect(landing_url())

    form = LoginForm()
    if request.method == "POST" and form.validate():
        identifier = (form.identifier or "").lower()
        user = db.session.scalar(
            select(User).where(
                or_(User.username == form.identifier, func.lower(User.email) == identifier)
            )
        )
        # One message for both cases: distinguishing them would confirm which
        # usernames and addresses exist.
        if user is None or not user.check_password(form.password or ""):
            # A failed sign-in is the most interesting event in the trail, so
            # it is recorded even though there is no authenticated actor. The
            # attempted identifier is kept, which is what makes credential
            # stuffing visible in the log.
            audit.record(
                AuditAction.LOGIN_FAILED,
                subject_type="User",
                actor_username=form.identifier,
                note=("unknown account" if user is None else "wrong password"),
            )
            db.session.commit()
            flash("Incorrect username or password.", "error")
        elif not user.is_active:
            audit.record(
                AuditAction.LOGIN_FAILED,
                subject=user,
                note="account deactivated",
            )
            db.session.commit()
            flash("This account has been deactivated.", "error")
        else:
            login_user(user, remember=bool(form.remember))
            audit.record(AuditAction.LOGIN, subject=user)
            db.session.commit()
            next_url = request.args.get("next")
            flash(f"Welcome back, {user.display_name or user.username}.", "success")
            return redirect(
                next_url if is_safe_url(next_url) else landing_url(user)
            )

    return render_template("auth/login.html", form=form)


@auth_bp.post("/logout")
@login_required
def logout():
    """Sign out.

    POST-only: a GET link would let a third-party page end the user's
    session through a plain <img> tag.
    """
    # Captured before logout_user() clears current_user.
    audit.record(AuditAction.LOGOUT, subject=current_user)
    db.session.commit()
    logout_user()
    flash("You have been signed out.", "success")
    return redirect(url_for("auth.login"))


@auth_bp.route("/account/password", methods=["GET", "POST"])
@login_required
def change_password():
    """Let a user rotate their own password."""
    form = ChangePasswordForm()
    if request.method == "POST" and form.validate():
        if not current_user.check_password(form.current_password or ""):
            flash("Your current password is not correct.", "error")
        elif form.new_password == form.current_password:
            flash("The new password must be different from the current one.", "error")
        else:
            current_user.set_password(form.new_password)
            # The password itself is never written to the trail; only the
            # fact that it was rotated, by whom, and from where.
            audit.record(
                AuditAction.UPDATE,
                subject=current_user,
                note="password changed by the account holder",
            )
            db.session.commit()
            flash("Your password has been changed.", "success")
            return redirect(landing_url())

    return render_template("auth/change_password.html", form=form)


@auth_bp.route("/dashboard")
@login_required
def dashboard():
    """The signed-in landing page: what this account may actually do.

    Staff only. A parishioner is sent to their own portal by
    :func:`landing_url`, and the isolation guard would refuse them here in
    any case.
    """
    if not current_user.role.is_staff:
        return redirect(landing_url())

    recent = services.recent_records(current_user, 5)

    pending_sched_query = services.events_query(current_user, status=EventStatus.REQUESTED)
    pending_schedules = list(
        db.session.scalars(pending_sched_query.order_by(ParishEvent.created_at.desc()).limit(5)).all()
    )
    pending_schedules_count = db.session.scalar(
        select(func.count(ParishEvent.id)).where(
            ParishEvent.id.in_(pending_sched_query.with_only_columns(ParishEvent.id))
        )
    ) or 0

    unrecorded_events = list(services.awaiting_register_entry(current_user))
    unrecorded_count = len(unrecorded_events)

    req_stats = services.combined_request_stats(current_user)
    open_requests_count = req_stats.get("open", 0)

    records_count = db.session.scalar(
        select(func.count(SacramentalRecord.id)).where(
            SacramentalRecord.id.in_(
                services.records_query(current_user).with_only_columns(SacramentalRecord.id)
            )
        )
    ) or 0

    return render_template(
        "auth/dashboard.html",
        recent=recent,
        pending_schedules=pending_schedules,
        pending_schedules_count=pending_schedules_count,
        unrecorded_count=unrecorded_count,
        open_requests_count=open_requests_count,
        records_count=records_count,
    )


@admin_bp.route("/admin/users")
@roles_required(Role.ADMIN)
def users():
    """List accounts with optional role filtering."""
    page = request.args.get("page", 1, type=int)
    role_filter = request.args.get("role", "all").strip().lower()

    # Aggregate counts for quick tabs
    total_count = db.session.scalar(select(func.count(User.id))) or 0
    staff_count = db.session.scalar(
        select(func.count(User.id)).where(User.role != Role.PARISHIONER)
    ) or 0
    parishioner_count = db.session.scalar(
        select(func.count(User.id)).where(User.role == Role.PARISHIONER)
    ) or 0

    statement = select(User)
    if role_filter == "parishioner":
        statement = statement.where(User.role == Role.PARISHIONER)
    elif role_filter == "staff":
        statement = statement.where(User.role != Role.PARISHIONER)

    statement = statement.order_by(User.username)
    pagination = db.paginate(statement, page=page, per_page=50, error_out=False)
    return render_template(
        "admin/users.html",
        pagination=pagination,
        role_filter=role_filter,
        total_count=total_count,
        staff_count=staff_count,
        parishioner_count=parishioner_count,
    )


@admin_bp.route("/admin/users/new", methods=["GET", "POST"])
@admin_bp.route("/admin/users/<int:user_id>/edit", methods=["GET", "POST"])
@roles_required(Role.ADMIN)
def create_user(user_id: int | None = None):
    """Create an account, or edit an existing one."""
    user = db.session.get(User, user_id) if user_id else None
    if user_id and user is None:
        flash("No such account.", "error")
        return redirect(url_for("admin.users"))

    form = UserForm()
    editing = user is not None

    if request.method == "POST" and form.validate():
        clash = db.session.scalar(
            select(User).where(
                User.username == form.username,
                User.id != (user.id if user else 0),
            )
        )
        email_clash = form.email and db.session.scalar(
            select(User).where(
                func.lower(User.email) == form.email.lower(),
                User.id != (user.id if user else 0),
            )
        )
        if clash:
            form._error("username", "That username is already taken.")
        if email_clash:
            form._error("email", "That email address is already registered.")

        if not form.errors:
            target = user or User()
            target.username = form.username
            target.email = form.email or None
            target.display_name = form.display_name or None
            target.role = Role(form.role) if form.role else Role.VIEWER
            if form.password:
                target.set_password(form.password)
            elif not editing:
                form._error("password", "A password is required for a new account.")
            if not form.errors:
                db.session.add(target)
                db.session.commit()
                flash(f"Account '{target.username}' saved.", "success")
                return redirect(url_for("admin.users"))

    return render_template(
        "admin/user_form.html",
        form=form,
        user=user,
        roles=Role,
        editing=editing,
    )


@admin_bp.post("/admin/users/<int:user_id>/toggle")
@roles_required(Role.ADMIN)
def toggle_user(user_id: int):
    """Activate or deactivate an account."""
    user = db.session.get(User, user_id)
    if user is None:
        flash("No such account.", "error")
    elif user.id == current_user.id:
        flash("You cannot deactivate your own account.", "error")
    else:
        user.is_active = not user.is_active
        db.session.commit()
        flash(
            f"Account '{user.username}' is now "
            f"{'active' if user.is_active else 'deactivated'}.",
            "success",
        )
    return redirect(url_for("admin.users"))


@admin_bp.post("/admin/users/<int:user_id>/reset-password")
@roles_required(Role.ADMIN)
def reset_password(user_id: int):
    """Set a temporary password on someone's behalf.

    The temporary value is shown once and never stored in clear text.
    """
    user = db.session.get(User, user_id)
    if user is None:
        flash("No such account.", "error")
        return redirect(url_for("admin.users"))

    temporary = secrets.token_urlsafe(9)
    user.set_password(temporary)
    db.session.commit()
    flash(
        f"Temporary password for '{user.username}': {temporary} — "
        "hand it over directly, and ask them to change it on first sign-in.",
        "success",
    )
    return redirect(url_for("admin.users"))