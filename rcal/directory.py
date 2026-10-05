"""The parish directory: vicariates, parishes, and clergy.

Reading the directory is open to any signed-in account; changing it is
reserved to the chancery, which maintains the archdiocesan directory of
record. Parish staff consult it but do not edit it.
"""

from datetime import date

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required
from sqlalchemy import or_, select

from . import services
from .auth import roles_required
from .extensions import db
from .forms import Form, SelectField, StringField
from .models import Clergy, ClergyAssignment, Parish, Role, Vicariate
from .models.enums import AssignmentRole

directory_bp = Blueprint("directory", __name__)


class ParishForm(Form):
    """Create and edit a parish."""

    name = StringField("Parish name", max_length=160)
    vicariate_id = SelectField("Vicariate", validate_choice=False)
    municipality = StringField("City / Municipality", max_length=120, required=False)
    address = StringField("Address", max_length=300, required=False)
    phone = StringField("Telephone", max_length=30, required=False)
    email = StringField("Email", max_length=255, required=False)


class AssignmentForm(Form):
    """Appoint a cleric to a parish."""

    role = SelectField("Appointment", {r.value: r for r in AssignmentRole})
    assigned_from = StringField("From (YYYY-MM-DD)")
    assigned_to = StringField("To (YYYY-MM-DD)", required=False)


def _vicariate_choices() -> dict:
    """Vicariate id -> name, for the form's dropdown."""
    return {
        str(vicariate.id): vicariate.name
        for vicariate in db.session.scalars(select(Vicariate).order_by(Vicariate.name))
    }


def _can_see_parish(user, parish: Parish) -> bool:
    """Whether *user* may open *parish*'s directory entry."""
    if user.is_archdiocese_wide:
        return True
    return user.home_parish_id == parish.id


def _parse_date(raw: str):
    """Parse an ISO date from a form field, or return ``None``."""
    try:
        return date.fromisoformat((raw or "").strip())
    except ValueError:
        return None


@directory_bp.route("/directory/parishes")
@login_required
def parishes():
    """Browse the parish directory."""
    query = request.args.get("q", "").strip()
    vicariate_id = request.args.get("vicariate", type=int)

    # The scoping helper is what keeps a parish-scoped user inside their own
    # parish, exactly as it does for record searches.
    statement = services.parish_filter(select(Parish), current_user, Parish.id)
    if query:
        pattern = f"%{query}%"
        statement = statement.where(
            or_(
                Parish.name.ilike(pattern),
                Parish.municipality.ilike(pattern),
                Parish.address.ilike(pattern),
            )
        )
    if vicariate_id:
        statement = statement.where(Parish.vicariate_id == vicariate_id)

    pagination = db.paginate(
        statement.order_by(Parish.name),
        page=request.args.get("page", 1, type=int),
        per_page=current_app.config["ITEMS_PER_PAGE"],
        error_out=False,
    )

    return render_template(
        "directory/parishes.html",
        pagination=pagination,
        # A blank form is passed only so the filter dropdown can reuse the
        # shared select markup; it is never submitted here.
        form=ParishForm(),
        vicariates=db.session.scalars(select(Vicariate).order_by(Vicariate.name)).all(),
        # Jinja has no dict comprehension, so the dropdown choices are built
        # here rather than in the template.
        vicariate_choices={
            str(vicariate.id): vicariate.name
            for vicariate in db.session.scalars(
                select(Vicariate).order_by(Vicariate.name)
            )
        },
        selected_vicariate=vicariate_id,
        query=query,
    )


@directory_bp.route("/directory/parishes/<int:parish_id>")
@login_required
def parish_detail(parish_id: int):
    """One parish: its details, its current clergy, and its staff accounts."""
    parish = db.get_or_404(Parish, parish_id)
    if not _can_see_parish(current_user, parish):
        abort(403)

    assignments = sorted(
        (a for a in parish.clergy_assignments if a.is_current),
        key=lambda a: a.clergy.sort_name,
    )
    past = sorted(
        (a for a in parish.clergy_assignments if not a.is_current),
        key=lambda a: a.assigned_from,
    )
    return render_template(
        "directory/parish_detail.html",
        parish=parish,
        assignments=assignments,
        past_assignments=past,
        record_count=len(parish.originating_records),
        can_edit=current_user.role in (Role.ADMIN, Role.CHANCERY),
    )


@directory_bp.route("/directory/clergy")
@login_required
def clergy():
    """Browse the clergy directory."""
    query = request.args.get("q", "").strip()

    statement = select(Clergy).where(Clergy.is_active.is_(True))
    if query:
        pattern = f"%{query}%"
        statement = statement.where(
            or_(Clergy.first_name.ilike(pattern), Clergy.last_name.ilike(pattern))
        )

    # A parish-scoped user sees the clergy who serve their parish, because
    # those are the people whose registers they will handle.
    scoped = services.visible_parish(current_user)
    if scoped is not None:
        assigned = select(ClergyAssignment.clergy_id).where(
            ClergyAssignment.parish_id == scoped.id
        )
        statement = statement.where(Clergy.id.in_(assigned))

    pagination = db.paginate(
        statement.order_by(Clergy.last_name, Clergy.first_name),
        page=request.args.get("page", 1, type=int),
        per_page=current_app.config["ITEMS_PER_PAGE"],
        error_out=False,
    )

    return render_template(
        "directory/clergy.html",
        pagination=pagination,
        query=query,
    )


@directory_bp.route("/directory/clergy/<int:clergy_id>")
@login_required
def clergy_detail(clergy_id: int):
    """One cleric: their posts and the entries they have performed."""
    person = db.get_or_404(Clergy, clergy_id)

    scoped = services.visible_parish(current_user)
    if scoped is not None and not any(
        a.parish_id == scoped.id for a in person.assignments
    ):
        abort(403)

    return render_template(
        "directory/clergy_detail.html",
        person=person,
        assignments=services.assignments_for(person),
    )


# --- maintenance (chancery only) -----------------------------------------

@directory_bp.route("/directory/parishes/new", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY)
def create_parish():
    """Add a parish to the directory."""
    form = ParishForm()
    if request.method == "POST" and form.validate():
        vicariate = db.session.get(Vicariate, int(form.vicariate_id or 0))
        if db.session.scalar(select(Parish).where(Parish.name == form.name)):
            form._error("name", "A parish with that name already exists.")
        elif vicariate is None:
            form._error("vicariate_id", "Choose a vicariate.")
        else:
            parish = Parish(
                name=form.name,
                vicariate=vicariate,
                municipality=form.municipality or None,
                address=form.address or None,
                phone=form.phone or None,
                email=form.email or None,
            )
            db.session.add(parish)
            db.session.commit()
            flash(f"Parish '{parish.name}' added.", "success")
            return redirect(url_for("directory.parish_detail", parish_id=parish.id))

    return render_template(
        "directory/parish_form.html",
        form=form,
        vicariates=_vicariate_choices(),
    )


@directory_bp.route("/directory/parishes/<int:parish_id>/edit", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY)
def edit_parish(parish_id: int):
    """Amend a parish's details.

    A parish is deactivated rather than deleted: its register citations have
    to stay resolvable for as long as the records exist.
    """
    parish = db.get_or_404(Parish, parish_id)
    form = ParishForm()

    if request.method == "POST" and form.validate():
        clash = db.session.scalar(
            select(Parish).where(Parish.name == form.name, Parish.id != parish.id)
        )
        vicariate = db.session.get(Vicariate, int(form.vicariate_id or 0))
        if clash:
            form._error("name", "A parish with that name already exists.")
        elif vicariate is None:
            form._error("vicariate_id", "Choose a vicariate.")
        else:
            parish.name = form.name
            parish.vicariate = vicariate
            parish.municipality = form.municipality or None
            parish.address = form.address or None
            parish.phone = form.phone or None
            parish.email = form.email or None
            db.session.commit()
            flash(f"Parish '{parish.name}' updated.", "success")
            return redirect(url_for("directory.parish_detail", parish_id=parish.id))

    return render_template(
        "directory/parish_form.html",
        form=form,
        parish=parish,
        editing=True,
        vicariates=_vicariate_choices(),
    )


@directory_bp.post("/directory/parishes/<int:parish_id>/toggle")
@roles_required(Role.ADMIN, Role.CHANCERY)
def toggle_parish(parish_id: int):
    """Activate or deactivate a parish without losing its registers."""
    parish = db.get_or_404(Parish, parish_id)
    parish.is_active = not parish.is_active
    db.session.commit()
    flash(
        f"Parish '{parish.name}' is now "
        f"{'active' if parish.is_active else 'inactive'}.",
        "success",
    )
    return redirect(url_for("directory.parish_detail", parish_id=parish.id))


@directory_bp.route("/directory/parishes/<int:parish_id>/assign", methods=["GET", "POST"])
@roles_required(Role.ADMIN, Role.CHANCERY)
def assign_clergy(parish_id: int):
    """Appoint a cleric to a parish.

    Any post the cleric already holds is closed on the day the new one
    begins, rather than deleted, so a career history stays on file.
    """
    parish = db.get_or_404(Parish, parish_id)
    form = AssignmentForm()

    if request.method == "POST" and form.validate():
        cleric = db.session.get(Clergy, request.form.get("clergy_id", type=int))
        start = _parse_date(form.assigned_from)
        end = _parse_date(form.assigned_to) if form.assigned_to else None

        if cleric is None:
            form._error("clergy_id", "Choose a member of the clergy.")
        elif start is None:
            form._error("assigned_from", "Enter the start date as YYYY-MM-DD.")
        elif end is not None and end <= start:
            form._error("assigned_to", "The end date must fall after the start date.")
        elif db.session.scalar(
            select(ClergyAssignment).where(
                ClergyAssignment.clergy_id == cleric.id,
                ClergyAssignment.parish_id == parish.id,
                ClergyAssignment.assigned_to.is_(None),
            )
        ):
            form._error(
                "clergy_id",
                f"{cleric.titled_name} already holds a current post here.",
            )
        else:
            for assignment in cleric.assignments:
                if assignment.is_current:
                    assignment.assigned_to = start
            db.session.add(
                ClergyAssignment(
                    clergy=cleric,
                    parish=parish,
                    role=(
                        AssignmentRole(form.role)
                        if form.role
                        else AssignmentRole.PARISH_PRIEST
                    ),
                    assigned_from=start,
                    assigned_to=end,
                )
            )
            db.session.commit()
            flash(f"{cleric.titled_name} assigned to {parish.name}.", "success")
            return redirect(url_for("directory.parish_detail", parish_id=parish.id))

    clergy_list = db.session.scalars(
        select(Clergy).where(Clergy.is_active.is_(True)).order_by(Clergy.last_name)
    ).all()

    return render_template(
        "directory/assign_clergy.html",
        form=form,
        parish=parish,
        clergy_list=clergy_list,
        roles=AssignmentRole,
    )