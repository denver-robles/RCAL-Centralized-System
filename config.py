"""Application configuration.

Everything that varies between a developer's laptop and a parish server is
read from the environment, so the same code runs on SQLite locally and on
MySQL or PostgreSQL in deployment without a single code change.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

#: Project root — the directory this file lives in.
BASE_DIR = Path(__file__).resolve().parent

#: Where the SQLite database and other runtime files are kept.
INSTANCE_DIR = BASE_DIR / "instance"

load_dotenv(BASE_DIR / ".env")


class Config:
    """Settings shared by every environment."""

    APP_NAME = "RCAL Centralized System"
    ORGANISATION = "Roman Catholic Archdiocese of Lipa"

    # --- Security -------------------------------------------------------
    # Overridden by SECRET_KEY in .env. The fallback is deliberately
    # obvious so nobody ships it by accident.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-not-for-production")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # flipped to True in ProductionConfig
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"

    # --- Database -------------------------------------------------------
    # Default: a SQLite file inside instance/. Set DATABASE_URL to e.g.
    #   mysql+mysqlconnector://root:@localhost/rcal
    #   postgresql+psycopg://rcal:secret@localhost/rcal
    # and nothing else changes.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{INSTANCE_DIR / 'rcal.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # --- Application behaviour ------------------------------------------
    ITEMS_PER_PAGE = int(os.environ.get("ITEMS_PER_PAGE", "25"))
    # Sacramental records are never hard-deleted; they are annotated.
    ALLOW_RECORD_DELETION = False

    @staticmethod
    def init_app(app):
        """Hook for environment-specific setup."""


class DevelopmentConfig(Config):
    DEBUG = True
    TEMPLATES_AUTO_RELOAD = True


class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True

    @staticmethod
    def init_app(app):
        if app.config["SECRET_KEY"] == "dev-only-not-for-production":
            raise RuntimeError(
                "SECRET_KEY must be set in the environment before running "
                "in production."
            )


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config(name: str | None = None):
    """Return the configuration class named by *name* (or FLASK_ENV)."""
    resolved = name or os.environ.get("FLASK_ENV", "default")
    return CONFIGS.get(resolved, DevelopmentConfig)
