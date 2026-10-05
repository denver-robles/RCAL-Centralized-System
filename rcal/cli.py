"""Command-line interface, attached to the app in the factory.

Usage::

    flask --app rcal init-db --seed
"""

import os

import click
from sqlalchemy import select

from .extensions import db
from .models import User
from .models.enums import Role


def seed_admin_user() -> User | None:
    """Create the initial administrator from the ``RCAL_ADMIN_*``
    environment variables.

    Returns the new user, or ``None`` when a user with that username
    already exists (seeding is never run twice).
    """
    username = os.environ.get("RCAL_ADMIN_USERNAME", "admin")
    password = os.environ.get("RCAL_ADMIN_PASSWORD")
    if not password:
        raise click.ClickException(
            "RCAL_ADMIN_PASSWORD must be set (see .env.example) before seeding."
        )

    existing = db.session.scalar(select(User).where(User.username == username))
    if existing is not None:
        return None

    admin = User(
        username=username,
        display_name=os.environ.get("RCAL_ADMIN_NAME", "Chancery Administrator"),
        email=os.environ.get("RCAL_ADMIN_EMAIL"),
        role=Role.ADMIN,
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    return admin


@click.command("init-db")
@click.option("--seed", is_flag=True, help="Also create the initial administrator.")
def init_db_command(seed: bool) -> None:
    """Create all database tables, then optionally seed the admin user."""
    db.create_all()
    click.echo("Database tables created.")

    if seed:
        user = seed_admin_user()
        if user is not None:
            click.echo(f"Initial administrator '{user.username}' created.")
        else:
            click.echo("Administrator already exists; seeding skipped.")
