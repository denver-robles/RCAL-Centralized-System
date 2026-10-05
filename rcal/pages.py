"""Public, unauthenticated routes."""

from flask import Blueprint, render_template

from . import services

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def home():
    """Serve the landing page.

    The Analytics figures are computed from the database rather than typed
    into the template, so they are true on the day the page is viewed. An
    empty database reports zeros, which is honest, rather than the plausible
    placeholder numbers a hardcoded figure would keep showing.
    """
    return render_template(
        "index.html",
        counts=services.archdiocese_counts(),
    )
