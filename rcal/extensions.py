"""Shared extension instances.

These live outside the application factory so that models and blueprints can
import them without importing the app, which would be circular.
"""

from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()


def configure_login_manager() -> LoginManager:
    """Apply the settings that describe how sign-in behaves."""
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please sign in to continue."
    login_manager.login_message_category = "warning"
    # "strong" invalidates the session when the client fingerprint changes,
    # which is the right default for records containing personal data.
    login_manager.session_protection = "strong"
    return login_manager
