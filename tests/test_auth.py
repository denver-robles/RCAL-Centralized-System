"""Tests for authentication and role-scoped access.

Run with::

    python -m unittest discover -s tests -v
"""

import unittest
from datetime import date

from rcal import create_app
from rcal.extensions import db
from rcal.models import Parish, Role, User, Vicariate


class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.admin = self.make_user("admin", "adminpw", Role.ADMIN)
        self.staff = self.make_user("staff", "staffpw", Role.PARISH_STAFF)

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def make_user(self, username, password, role, active=True, email=None):
        user = User(
            username=username,
            display_name=username.title(),
            email=email,
            role=role,
            is_active=active,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    def login(self, identifier, password):
        return self.client.post(
            "/login",
            data={"identifier": identifier, "password": password},
            follow_redirects=True,
        )


class LoginTest(AuthTestCase):
    def test_login_page_is_public(self):
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"SECURE AUTHENTICATION", response.data)

    def test_landing_page_forms_post_to_login(self):
        # Dedicated /login page is now the primary entrance; the landing page
        # directs visitors securely to /login.
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        body = response.data
        self.assertIn(b'href="/login"', body)
        login_res = self.client.get("/login")
        self.assertIn(b'action="/login"', login_res.data)
        self.assertIn(b'method="post"', login_res.data)
        self.assertIn(b'name="identifier"', login_res.data)
        self.assertIn(b'name="password"', login_res.data)

    def test_sign_in_with_username(self):
        response = self.login("admin", "adminpw")
        self.assertIn(b"Welcome, Admin", response.data)
        self.assertIn(b"System Administrator", response.data)

    def test_sign_in_with_email_is_case_insensitive(self):
        db.session.delete(self.staff)
        db.session.commit()
        self.make_user("mail", "mailpw", Role.VIEWER, email="Clerk@Parish.PH")

        response = self.login("clerk@parish.ph", "mailpw")
        self.assertIn(b"Welcome, Mail", response.data)

    def test_wrong_password_is_rejected(self):
        response = self.login("admin", "wrong")
        self.assertIn(b"Incorrect username or password", response.data)
        self.assertNotIn(b"Welcome, Admin", response.data)

    def test_unknown_user_and_wrong_password_give_the_same_message(self):
        unknown = self.login("nosuchuser", "wrong")
        wrong = self.login("admin", "wrong")
        self.assertIn(b"Incorrect username or password", unknown.data)
        self.assertIn(b"Incorrect username or password", wrong.data)

    def test_deactivated_account_cannot_sign_in(self):
        self.staff.is_active = False
        db.session.commit()

        response = self.login("staff", "staffpw")
        self.assertIn(b"deactivated", response.data)

    def test_missing_password_is_a_form_error(self):
        response = self.client.post("/login", data={"identifier": "admin"})
        self.assertIn(b"Password is required.", response.data)

    def test_logout_requires_post(self):
        self.login("admin", "adminpw")
        # A GET must not end the session, or any page could log a user out.
        self.assertEqual(self.client.get("/logout").status_code, 405)

        response = self.client.post("/logout", follow_redirects=True)
        self.assertIn(b"signed out", response.data)
        # Protected pages are no longer reachable.
        self.assertEqual(self.client.get("/dashboard").status_code, 302)


class ProtectedRouteTest(AuthTestCase):
    def test_anonymous_is_redirected_to_login(self):
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.headers["Location"])

    def test_login_required_redirects_back_after_sign_in(self):
        redirect = self.client.get("/account/password")
        self.assertEqual(redirect.status_code, 302)
        # Flask-Login sends the visitor back to where they were headed.
        login_url = redirect.headers["Location"]
        self.assertIn("next=%2Faccount%2Fpassword", login_url)

        response = self.client.post(
            login_url,
            data={"identifier": "admin", "password": "adminpw"},
            follow_redirects=True,
        )
        self.assertIn(b"Change your password", response.data)

    def test_next_parameter_is_honoured_for_local_urls(self):
        self.client.get("/dashboard")
        response = self.client.post(
            "/login?next=/account/password",
            data={"identifier": "admin", "password": "adminpw"},
            follow_redirects=True,
        )
        self.assertIn(b"Change your password", response.data)

    def test_next_parameter_rejects_offsite_urls(self):
        response = self.client.post(
            "/login?next=http://evil.example/steal",
            data={"identifier": "admin", "password": "adminpw"},
            follow_redirects=True,
        )
        self.assertNotIn(b"evil.example", response.data)
        self.assertIn(b"Welcome, Admin", response.data)


class RoleGateTest(AuthTestCase):
    def test_only_admin_may_reach_the_account_list(self):
        self.login("staff", "staffpw")
        response = self.client.get("/admin/users")
        self.assertEqual(response.status_code, 403)
        self.assertIn(b"403", response.data)

    def test_admin_reaches_the_account_list(self):
        self.login("admin", "adminpw")
        response = self.client.get("/admin/users")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Parish Staff", response.data)

    def test_anonymous_is_redirected_not_shown_403(self):
        self.assertEqual(self.client.get("/admin/users").status_code, 302)


class UserAdministrationTest(AuthTestCase):
    def test_create_account(self):
        self.login("admin", "adminpw")
        response = self.client.post(
            "/admin/users/new",
            data={
                "username": "newparish",
                "display_name": "Parish Secretary",
                "role": Role.PARISH_STAFF.value,
                "password": "longenough",
            },
            follow_redirects=True,
        )
        self.assertIn(b"Account &#39;newparish&#39; saved.", response.data)

        created = User.query.filter_by(username="newparish").one()
        self.assertEqual(created.role, Role.PARISH_STAFF)
        self.assertTrue(created.check_password("longenough"))
        self.assertNotIn("longenough", created.password_hash)

    def test_duplicate_username_is_rejected(self):
        self.login("admin", "adminpw")
        self.client.post(
            "/admin/users/new",
            data={"username": "staff", "role": Role.VIEWER.value, "password": "longenough"},
        )
        response = self.client.post(
            "/admin/users/new",
            data={"username": "staff", "role": Role.VIEWER.value, "password": "longenough"},
        )
        self.assertIn(b"already taken", response.data)
        self.assertEqual(User.query.filter_by(username="staff").count(), 1)

    def test_invalid_username_is_rejected(self):
        self.login("admin", "adminpw")
        response = self.client.post(
            "/admin/users/new",
            data={"username": "bad name!", "role": Role.VIEWER.value, "password": "longenough"},
        )
        self.assertIn(b"Username may only contain", response.data)

    def test_new_account_requires_a_password(self):
        self.login("admin", "adminpw")
        response = self.client.post(
            "/admin/users/new",
            data={"username": "nopassword", "role": Role.VIEWER.value},
        )
        self.assertIn(b"password is required", response.data)

    def test_edit_keeps_the_existing_password_when_left_blank(self):
        self.login("admin", "adminpw")
        response = self.client.post(
            f"/admin/users/{self.staff.id}/edit",
            data={"username": "staff", "display_name": "Renamed", "role": Role.CLERGY.value},
        )
        self.assertEqual(response.status_code, 302)

        db.session.refresh(self.staff)
        self.assertEqual(self.staff.display_name, "Renamed")
        self.assertEqual(self.staff.role, Role.CLERGY)
        self.assertTrue(self.staff.check_password("staffpw"))

    def test_toggle_deactivates_and_reactivates(self):
        self.login("admin", "adminpw")
        self.client.post(f"/admin/users/{self.staff.id}/toggle")
        db.session.refresh(self.staff)
        self.assertFalse(self.staff.is_active)

        self.client.post(f"/admin/users/{self.staff.id}/toggle")
        db.session.refresh(self.staff)
        self.assertTrue(self.staff.is_active)

    def test_admin_cannot_deactivate_their_own_account(self):
        self.login("admin", "adminpw")
        self.client.post(f"/admin/users/{self.admin.id}/toggle")
        db.session.refresh(self.admin)
        self.assertTrue(self.admin.is_active)

    def test_reset_password_issues_a_usable_temporary_password(self):
        self.login("admin", "adminpw")
        response = self.client.post(
            f"/admin/users/{self.staff.id}/reset-password", follow_redirects=True
        )
        db.session.refresh(self.staff)
        self.assertFalse(self.staff.check_password("staffpw"))
        # The new password is shown once, in the flash message.
        self.assertIn(b"Temporary password", response.data)
        self.assertIn(b"hand it over directly", response.data)


class ChangePasswordTest(AuthTestCase):
    def test_password_can_be_changed_and_the_new_one_works(self):
        self.login("staff", "staffpw")
        response = self.client.post(
            "/account/password",
            data={
                "current_password": "staffpw",
                "new_password": "brandnewpw",
                "confirm_password": "brandnewpw",
            },
            follow_redirects=True,
        )
        self.assertIn(b"password has been changed", response.data)

        db.session.refresh(self.staff)
        self.assertTrue(self.staff.check_password("brandnewpw"))
        self.assertFalse(self.staff.check_password("staffpw"))

    def test_wrong_current_password_is_rejected(self):
        self.login("staff", "staffpw")
        response = self.client.post(
            "/account/password",
            data={
                "current_password": "notit",
                "new_password": "brandnewpw",
                "confirm_password": "brandnewpw",
            },
        )
        self.assertIn(b"current password is not correct", response.data)
        db.session.refresh(self.staff)
        self.assertTrue(self.staff.check_password("staffpw"))

    def test_mismatched_confirmation_is_rejected(self):
        self.login("staff", "staffpw")
        response = self.client.post(
            "/account/password",
            data={
                "current_password": "staffpw",
                "new_password": "brandnewpw",
                "confirm_password": "different",
            },
        )
        self.assertIn(b"do not match", response.data)

    def test_short_password_is_rejected(self):
        self.login("staff", "staffpw")
        response = self.client.post(
            "/account/password",
            data={
                "current_password": "staffpw",
                "new_password": "short",
                "confirm_password": "short",
            },
        )
        self.assertIn(b"at least 8 characters", response.data)


class HomeParishScopeTest(AuthTestCase):
    def test_home_parish_is_shown_on_the_dashboard(self):
        vicariate = Vicariate(name="Central Vicariate")
        parish = Parish(name="St. Sebastian Cathedral", municipality="Lipa City",
                        vicariate=vicariate)
        db.session.add_all([vicariate, parish])
        db.session.commit()

        self.staff.home_parish = parish
        db.session.commit()

        self.login("staff", "staffpw")
        response = self.client.get("/dashboard")
        self.assertIn(b"St. Sebastian Cathedral", response.data)
        self.assertIn(b"Limited to your own parish", response.data)

    def test_chancery_sees_the_archdiocese_wide_scope(self):
        self.make_user("chancery", "chancerypw", Role.CHANCERY)
        self.login("chancery", "chancerypw")
        response = self.client.get("/dashboard")
        self.assertIn(b"archdiocese-wide", response.data)
        self.assertIn(b"May verify and issue certified copies", response.data)


class CsrfEnabledTest(unittest.TestCase):
    """The testing config disables CSRF, so exercise it separately.

    This is the configuration a real deployment runs in, and it is where a
    form that forgets ``csrf_token()`` shows up as a 400.
    """

    def setUp(self):
        self.app = create_app("testing")
        self.app.config["WTF_CSRF_ENABLED"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        # The landing page computes its Analytics figures from the database
        # now, so even a GET of "/" needs the schema to exist.
        db.create_all()

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def test_landing_page_forms_carry_a_csrf_token(self):
        # Dedicated /login form carries active CSRF tokens for both portals.
        body = self.client.get("/login").data
        self.assertGreaterEqual(body.count(b'name="csrf_token"'), 1)

    def test_posting_the_landing_form_without_a_token_is_rejected(self):
        response = self.client.post(
            "/login", data={"identifier": "admin", "password": "adminpw123"}
        )
        self.assertEqual(response.status_code, 400)

    def test_login_page_carries_a_csrf_token(self):
        self.assertIn(b'name="csrf_token"', self.client.get("/login").data)


if __name__ == "__main__":
    unittest.main()