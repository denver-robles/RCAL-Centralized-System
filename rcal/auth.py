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

from . import services
from .extensions import db
from .forms import ChangePasswordForm, LoginForm, UserForm
from .models import User
from .models.enums import Role

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
        return redirect(url_for("auth.dashboard"))

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
            flash("Incorrect username or password.", "error")
        elif not user.is_active:
            flash("This account has been deactivated.", "error")
        else:
            login_user(user, remember=bool(form.remember))
            next_url = request.args.get("next")
            flash(f"Welcome back, {user.display_name or user.username}.", "success")
            return redirect(next_url if is_safe_url(next_url) else url_for("auth.dashboard"))

    return render_template("auth/login.html", form=form)


@auth_bp.post("/logout")
@login_required
def logout():
    """Sign out.

    POST-only: a GET link would let a third-party page end the user's
    session through a plain <img> tag.
    """
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
            db.session.commit()
            flash("Your password has been changed.", "success")
            return redirect(url_for("auth.dashboard"))

    return render_template("auth/change_password.html", form=form)


@auth_bp.route("/dashboard")
@login_required
def dashboard():
    """The signed-in landing page: what this account may actually do."""
    recent = services.recent_records(current_user, 5)
    return render_template("auth/dashboard.html", recent=recent)


@admin_bp.route("/admin/users")
@roles_required(Role.ADMIN)
def users():
    """List every account, newest first."""
    page = request.args.get("page", 1, type=int)
    statement = select(User).order_by(User.username)
    pagination = db.paginate(statement, page=page, per_page=50, error_out=False)
    return render_template("admin/users.html", pagination=pagination)


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