"""RCAL Centralized System — application package.

Run the development server with either::

    flask --app rcal run
    python run.py
"""

from flask import Flask

from config import INSTANCE_DIR, get_config

from .extensions import configure_login_manager, csrf, db, login_manager


def create_app(config_name: str | None = None) -> Flask:
    """Build the application.

    ``config_name`` selects one of the classes in
    ``config.CONFIGS``; it falls back to the ``FLASK_ENV`` environment
    variable, then to development.
    """
    app = Flask(__name__)

    config = get_config(config_name)
    app.config.from_object(config)
    config.init_app(app)

    db.init_app(app)
    csrf.init_app(app)
    configure_login_manager()
    login_manager.init_app(app)

    # SQLite lives inside instance/ — make sure the folder exists before
    # the engine opens its file.
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)

    from .models import User

    @login_manager.user_loader
    def load_user(user_id: str) -> User | None:
        return db.session.get(User, int(user_id))

    @app.after_request
    def add_security_headers(response):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    from .auth import admin_bp, auth_bp, register_role_isolation
    from .audit_views import audit_bp
    from .certificates import certificates_bp
    from .directory import directory_bp
    from .pages import pages_bp
    from .portal import portal_bp
    from .records import records_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(directory_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(certificates_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(portal_bp)

    # Parishioners must never reach an internal module (FR-1.3). Installed
    # here so it covers every blueprint, present and future.
    register_role_isolation(app)

    from .cli import init_db_command
    app.cli.add_command(init_db_command)

    from .seed import seed_demo_command
    app.cli.add_command(seed_demo_command)

    return app
