"""Tests for the audit trail and the parishioner portal isolation.

Two things are being checked here, and the second matters more than the
first.

The audit tests confirm the trail records what FR-1.4 asks for: the actor,
the action, the origin, and the values before and after a change.

The isolation tests confirm FR-1.3 — that a parishioner account cannot
reach a single internal module. That is a security boundary, so it is
tested from several directions rather than by one happy-path check.

Run with::

    python -m unittest discover -s tests -v
"""

import json
import unittest
from datetime import date

from rcal import create_app
from rcal.extensions import db
from rcal.models import (
    AuditLog,
    CertificateRequest,
    DocumentRequest,
    Parish,
    Person,
    Role,
    SacramentalRecord,
    SacramentType,
    Sex,
    User,
    Vicariate,
)
from rcal.models.enums import AuditAction, DocumentRequestStatus, RequestStatus


class PhaseOneTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        vicariate = Vicariate(name="Central Vicariate")
        db.session.add(vicariate)
        db.session.flush()
        self.parish = Parish(
            name="St. Sebastian Cathedral", municipality="Lipa City", vicariate=vicariate
        )
        db.session.add(self.parish)
        db.session.flush()

        self.admin = self.make_user("admin", "adminpw", Role.ADMIN)
        self.staff = self.make_user(
            "lipasec", "staffpw", Role.PARISH_STAFF, parish=self.parish
        )
        self.parishioner = self.make_user("juan@example.ph", "parishpw", Role.PARISHIONER)

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def make_user(self, username, password, role, parish=None):
        # The email is set from the username so that the portal's
        # duplicate-account checks, which look at both columns, behave the
        # way they do in production.
        user = User(username=username, email=username, role=role, home_parish=parish)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    def make_record(self, first="Juan", last="Dela Cruz", entry=1):
        person = Person(first_name=first, last_name=last, sex=Sex.MALE)
        db.session.add(person)
        db.session.flush()
        record = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.BAPTISM,
            event_date=date(1990, 6, 15),
            book_number=1,
            page_number=1,
            entry_number=entry,
            originating_parish=self.parish,
        )
        db.session.add(record)
        db.session.commit()
        return record

    def login(self, username, password):
        self.client.post("/logout")
        return self.client.post(
            "/login",
            data={"identifier": username, "password": password},
            follow_redirects=True,
        )

    def entries(self, action=None):
        query = AuditLog.query
        if action is not None:
            query = query.filter_by(action=action)
        return query.order_by(AuditLog.id).all()


# --- the audit trail (FR-1.4) ---------------------------------------------

class AuditTrailTest(PhaseOneTestCase):
    def test_sign_in_is_recorded_with_actor_and_origin(self):
        self.login("admin", "adminpw")
        entry = self.entries(AuditAction.LOGIN)[-1]

        self.assertEqual(entry.user_id, self.admin.id)
        self.assertEqual(entry.actor_username, "admin")
        # The requirement names the IP address explicitly.
        self.assertIsNotNone(entry.ip_address)
        self.assertIsNotNone(entry.created_at)

    def test_failed_sign_in_is_recorded_without_an_authenticated_actor(self):
        self.client.post(
            "/login", data={"identifier": "admin", "password": "wrong"}
        )
        entry = self.entries(AuditAction.LOGIN_FAILED)[-1]

        # No authenticated user, but the attempted name is kept: that is
        # what makes credential stuffing visible.
        self.assertIsNone(entry.user_id)
        self.assertEqual(entry.actor_username, "admin")
        self.assertEqual(entry.note, "wrong password")

    def test_failed_sign_in_for_an_unknown_account_is_recorded(self):
        self.client.post(
            "/login", data={"identifier": "nobody", "password": "whatever"}
        )
        entry = self.entries(AuditAction.LOGIN_FAILED)[-1]
        self.assertEqual(entry.actor_username, "nobody")
        self.assertEqual(entry.note, "unknown account")

    def test_record_transcription_captures_the_new_values(self):
        self.login("lipasec", "staffpw")
        self.client.post(
            "/records/new",
            data={
                "first_name": "Ana",
                "last_name": "Bautista",
                "sex": Sex.FEMALE.value,
                "sacrament_type": SacramentType.BAPTISM.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.parish.id),
                "book_number": "3",
                "page_number": "42",
                "entry_number": "7",
            },
        )

        entry = self.entries(AuditAction.CREATE)[-1]
        self.assertEqual(entry.subject_type, "SacramentalRecord")
        values = json.loads(entry.new_values)
        self.assertEqual(values["book_number"], 3)
        self.assertEqual(values["page_number"], 42)
        self.assertEqual(values["entry_number"], 7)
        self.assertEqual(values["sacrament_type"], "baptism")
        self.assertIn("Book 3", entry.note)

    def test_annotation_is_recorded_as_a_mutation(self):
        record = self.make_record()
        self.login("lipasec", "staffpw")
        self.client.post(
            f"/records/{record.id}/annotate",
            data={"annotation_type": "other", "note_text": "Name corrected."},
        )

        entry = self.entries(AuditAction.ANNOTATE)[-1]
        self.assertEqual(entry.subject_id, record.id)
        self.assertTrue(entry.is_mutation)
        self.assertIn("Name corrected", entry.new_values)

    def test_certificate_status_change_records_before_and_after(self):
        record = self.make_record()
        self.login("lipasec", "staffpw")
        self.client.post(
            "/certificates/new",
            data={"record_id": str(record.id), "requester_name": "Juan Dela Cruz"},
        )
        item = CertificateRequest.query.one()
        self.client.post(f"/certificates/{item.id}/verify")

        entry = self.entries(AuditAction.STATUS_CHANGE)[-1]
        old = json.loads(entry.old_values)
        new = json.loads(entry.new_values)
        self.assertEqual(old["status"], "pending")
        self.assertEqual(new["status"], "verified")

    def test_printing_a_certificate_is_recorded(self):
        record = self.make_record()
        self.login("lipasec", "staffpw")
        self.client.post(
            "/certificates/new",
            data={"record_id": str(record.id), "requester_name": "Juan Dela Cruz"},
        )
        item = CertificateRequest.query.one()
        # The parish verifies; the chancery authorises. Approval is a
        # chancery act, so the walk to issued changes actor partway.
        self.client.post(f"/certificates/{item.id}/verify")
        self.login("admin", "adminpw")
        self.client.post(f"/certificates/{item.id}/approve")
        self.client.post(f"/certificates/{item.id}/issue")

        self.client.get(f"/certificates/{item.id}/certificate")
        entry = self.entries(AuditAction.PRINT)[-1]
        self.assertEqual(entry.subject_label, f"Certificate {item.certificate_number}")

    def test_audit_entries_are_append_only(self):
        """There is no route that edits or deletes a trail entry."""
        self.login("admin", "adminpw")
        entry = self.entries()[-1]

        for path in (f"/audit/{entry.id}/edit", f"/audit/{entry.id}/delete"):
            self.assertEqual(self.client.post(path).status_code, 404)

    def test_stats_are_keyed_by_action_value_not_enum_member(self):
        """A template can only look up a dict by string.

        Keying by the enum member made every figure render as blank while
        the label stayed visible, which looks like a layout problem rather
        than a missing number.
        """
        from rcal.services import audit_stats

        self.login("admin", "adminpw")
        stats = audit_stats()

        self.assertIn("view", stats)
        self.assertIn("login_failed", stats)
        self.assertIn("print", stats)
        self.assertIn("mutations", stats)
        for key in stats:
            self.assertIsInstance(key, str)

    def test_the_stats_page_shows_a_figure_for_every_tile(self):
        self.login("admin", "adminpw")
        response = self.client.get("/audit")
        body = response.data.decode()

        # Every stat tile must contain a digit in its value slot. An
        # Undefined lookup renders an empty string, which is how this bug
        # appeared.
        import re

        values = re.findall(r'class="stat-value">\s*([^<]*?)\s*</span>', body)
        self.assertTrue(values, "no stat tiles rendered")
        for value in values:
            self.assertRegex(value, r"^\d+$", f"stat value was {value!r}, not a number")

    def test_a_sign_out_is_attributed_to_the_real_user(self):
        """A Flask-Login ``LocalProxy`` must not be recorded as the subject.

        The proxy reports its own class name, so the trail labelled the
        actor ``LocalProxy`` with no id — losing exactly the information an
        audit trail exists to capture.
        """
        self.login("admin", "adminpw")
        self.client.post("/logout")

        entry = self.entries(AuditAction.LOGOUT)[-1]
        self.assertEqual(entry.subject_type, "User")
        self.assertEqual(entry.subject_id, self.admin.id)
        self.assertEqual(entry.subject_label, "admin")
        self.assertNotEqual(entry.subject_type, "LocalProxy")

    def test_a_password_change_names_the_account(self):
        self.login("admin", "adminpw")
        self.client.post(
            "/account/password",
            data={
                "current_password": "adminpw",
                "new_password": "brandnewpw",
                "confirm_password": "brandnewpw",
            },
        )
        entry = self.entries(AuditAction.UPDATE)[-1]
        self.assertEqual(entry.subject_type, "User")
        self.assertEqual(entry.subject_id, self.admin.id)

    def test_only_the_chancery_may_read_the_trail(self):
        self.login("lipasec", "staffpw")
        self.assertEqual(self.client.get("/audit").status_code, 403)

        self.login("admin", "adminpw")
        self.assertEqual(self.client.get("/audit").status_code, 200)

    def test_trail_can_be_filtered_to_changes_only(self):
        record = self.make_record()
        self.login("lipasec", "staffpw")
        self.client.get(f"/records/{record.id}")  # a view
        self.client.post(
            f"/records/{record.id}/annotate",
            data={"annotation_type": "other", "note_text": "x"},
        )

        self.login("admin", "adminpw")
        response = self.client.get("/audit?mutations=1")
        body = response.data
        self.assertIn(b"Margin note added", body)
        self.assertNotIn(b"badge-ok", body)

    def test_trail_exports_as_csv_and_records_the_export(self):
        self.login("admin", "adminpw")
        response = self.client.get("/audit/export.csv")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.headers["Content-Type"])
        self.assertIn(b"created_at_utc", response.data)

        # Exporting personal data is itself an accountable act.
        self.assertTrue(self.entries(AuditAction.EXPORT))

    def test_entry_detail_shows_the_before_and_after(self):
        record = self.make_record()
        self.login("lipasec", "staffpw")
        self.client.post(
            "/certificates/new",
            data={"record_id": str(record.id), "requester_name": "Juan"},
        )
        item = CertificateRequest.query.one()
        self.client.post(f"/certificates/{item.id}/verify")

        entry = self.entries(AuditAction.STATUS_CHANGE)[-1]
        self.login("admin", "adminpw")
        response = self.client.get(f"/audit/{entry.id}")
        self.assertIn(b"pending", response.data)
        self.assertIn(b"verified", response.data)

    def test_audit_write_failure_does_not_break_the_request(self):
        """A broken trail must not roll back a legitimate action.

        Patched at ``AuditLog.__init__`` rather than at
        ``db.session.add``: patching the session would break the request's
        own database writes too, and then the test would be proving
        nothing about the audit service's error handling.
        """
        from unittest.mock import patch

        record = self.make_record()
        self.login("lipasec", "staffpw")

        with patch("rcal.audit.AuditLog", side_effect=RuntimeError("boom")):
            response = self.client.get(f"/records/{record.id}")

        # The page rendered regardless: the audit failure was contained.
        self.assertEqual(response.status_code, 200)

    def test_the_audit_service_swallows_its_own_failures(self):
        """A broken trail must not propagate out of audit.record()."""
        from unittest.mock import patch

        from rcal import audit

        with patch("rcal.audit.AuditLog", side_effect=RuntimeError("boom")):
            result = audit.record(AuditAction.VIEW, subject_type="Test")

        self.assertIsNone(result)


# --- parishioner isolation (FR-1.3) ---------------------------------------

class ParishionerIsolationTest(PhaseOneTestCase):
    def setUp(self):
        super().setUp()
        self.record = self.make_record()
        self.login("juan@example.ph", "parishpw")

    def test_parishioner_cannot_reach_any_internal_module(self):
        for path in (
            "/records",
            f"/records/{self.record.id}",
            "/records/new",
            "/directory/parishes",
            "/directory/clergy",
            "/certificates",
            "/audit",
            "/intentions",
            "/records/analytics",
            "/admin/users",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 403)

    def test_parishioner_cannot_post_an_internal_action(self):
        """The guard covers writes, not just pages."""
        response = self.client.post(
            f"/records/{self.record.id}/annotate",
            data={"annotation_type": "other", "note_text": "should not happen"},
        )
        self.assertEqual(response.status_code, 403)

        db.session.refresh(self.record)
        self.assertEqual(len(self.record.annotations), 0)

    def test_the_guard_is_enforced_on_the_path_not_the_view(self):
        """A parishioner is refused even for a path that does not exist.

        This is the point of enforcing on the prefix rather than trusting
        every view to carry a decorator: a module added later is covered
        without anyone remembering.
        """
        self.assertEqual(self.client.get("/records/some/future/route").status_code, 403)

    def test_parishioner_can_reach_the_portal(self):
        self.assertEqual(self.client.get("/portal").status_code, 200)
        self.assertEqual(self.client.get("/portal/requests/new").status_code, 200)

    def test_staff_are_not_affected_by_the_parishioner_guard(self):
        self.login("lipasec", "staffpw")
        self.assertEqual(self.client.get("/records").status_code, 200)
        self.assertEqual(self.client.get(f"/records/{self.record.id}").status_code, 200)

    def test_a_parishioner_sees_only_their_own_requests(self):
        other = self.make_user("maria@example.ph", "parishpw", Role.PARISHIONER)
        mine = DocumentRequest(
            parishioner=self.parishioner,
            sacrament_type=SacramentType.BAPTISM,
            name_on_record="Juan Dela Cruz",
            consent_given_at=db.func.now(),
        )
        theirs = DocumentRequest(
            parishioner=other,
            sacrament_type=SacramentType.MARRIAGE,
            name_on_record="Maria Santos",
            consent_given_at=db.func.now(),
        )
        db.session.add_all([mine, theirs])
        db.session.commit()

        dashboard = self.client.get("/portal")
        self.assertIn(b"Juan Dela Cruz", dashboard.data)
        self.assertNotIn(b"Maria Santos", dashboard.data)

        # And cannot open the other's request by guessing its id.
        self.assertEqual(
            self.client.get(f"/portal/requests/{theirs.id}").status_code, 404
        )

    def test_parishioner_cannot_open_another_parishioners_request_by_id(self):
        other = self.make_user("pedro@example.ph", "parishpw", Role.PARISHIONER)
        theirs = DocumentRequest(
            parishioner=other,
            sacrament_type=SacramentType.BAPTISM,
            name_on_record="Pedro Lim",
        )
        db.session.add(theirs)
        db.session.commit()

        response = self.client.get(f"/portal/requests/{theirs.id}")
        self.assertEqual(response.status_code, 404)


# --- parishioner registration and submission ------------------------------

class ParishionerPortalTest(PhaseOneTestCase):
    def sign_in_fresh(self, username, password):
        """Sign in with no session carried over from setUp."""
        self.client.post("/logout")
        return self.client.post(
            "/login", data={"identifier": username, "password": password}
        )

    def test_parishioner_sign_in_lands_in_their_own_portal(self):
        """Not the staff dashboard, which they are not allowed to see."""
        response = self.sign_in_fresh("juan@example.ph", "parishpw")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/portal", response.headers["Location"])
        self.assertNotIn("/dashboard", response.headers["Location"])

    def test_a_parishioner_asking_for_the_dashboard_is_sent_to_their_portal(self):
        """Not an error page, and certainly not the staff dashboard.

        The dashboard view redirects rather than refusing, which is the
        friendlier behaviour for the one internal URL a parishioner is
        most likely to reach by habit. The isolation guard is still what
        protects everything that actually holds records.
        """
        self.login("juan@example.ph", "parishpw")
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/portal", response.headers["Location"])

    def test_staff_still_land_on_the_dashboard(self):
        response = self.sign_in_fresh("lipasec", "staffpw")
        self.assertIn("/dashboard", response.headers["Location"])

    def test_registration_creates_a_parishioner_never_a_staff_role(self):
        response = self.client.post(
            "/portal/register",
            data={
                "first_name": "Ana",
                "last_name": "Reyes",
                "email": "Ana.Reyes@Example.PH",
                "password": "longenough",
                # A crafted attempt to grant itself a staff role.
                "role": "admin",
            },
            follow_redirects=True,
        )
        self.assertIn(b"created", response.data)

        account = User.query.filter_by(email="ana.reyes@example.ph").one()
        self.assertEqual(account.role, Role.PARISHIONER)
        self.assertTrue(account.check_password("longenough"))

    def test_registration_rejects_a_short_password(self):
        response = self.client.post(
            "/portal/register",
            data={
                "first_name": "Ana",
                "last_name": "Reyes",
                "email": "short@example.ph",
                "password": "abc",
            },
        )
        self.assertIn(b"at least 8 characters", response.data)

    def test_registration_does_not_reveal_whether_an_email_exists(self):
        response = self.client.post(
            "/portal/register",
            data={
                "first_name": "Someone",
                "last_name": "Else",
                "email": "juan@example.ph",  # already registered
                "password": "longenough",
            },
            follow_redirects=True,
        )
        # The response must not say the address is taken. Asserted on a
        # phrase that could only come from the system confirming it, not on
        # the word "registered" — the reassuring message we do send
        # contains that word too, and matching it would prove nothing.
        self.assertNotIn(b"That email is already", response.data)
        self.assertNotIn(b"address is in use", response.data)
        # The account is not duplicated. Checked on the username, which is
        # what the unique constraint actually covers — the email column is
        # optional elsewhere in the system and may legitimately be empty.
        self.assertEqual(User.query.filter_by(username="juan@example.ph").count(), 1)
        # setUp creates three accounts (admin, staff, parishioner) and the
        # refused registration adds none.
        self.assertEqual(User.query.count(), 3)

    def test_submitting_a_request_requires_consent(self):
        self.login("juan@example.ph", "parishpw")
        response = self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": SacramentType.BAPTISM.value,
                "name_on_record": "Juan Dela Cruz",
                "place_of_sacrament": "St. Sebastian Cathedral",
                # consent deliberately omitted
            },
        )
        self.assertIn(b"must accept the data privacy notice", response.data)
        self.assertEqual(DocumentRequest.query.count(), 0)

    def test_submitting_a_request_records_consent_and_a_reference(self):
        self.login("juan@example.ph", "parishpw")
        response = self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": SacramentType.BAPTISM.value,
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Juan Dela Cruz",
                "date_of_birth": "1990-01-01",
                "date_of_sacrament": "1995-02-18",
                "place_of_sacrament": "St. Sebastian Cathedral",
                "parents_or_spouse": "Pedro and Maria Dela Cruz",
                "purpose": "Marriage requirement",
                "consent": "1",
            },
            follow_redirects=True,
        )
        self.assertIn(b"submitted for verification", response.data)

        item = DocumentRequest.query.one()
        self.assertEqual(item.parishioner_id, self.parishioner.id)
        self.assertEqual(item.status, DocumentRequestStatus.SUBMITTED)
        # Consent is stamped with a time, not just a boolean.
        self.assertIsNotNone(item.consent_given_at)
        self.assertTrue(item.is_open)
        # Nothing is matched to a register entry until staff do it.
        self.assertFalse(item.is_matched)

        # The reference is shown on the request's own page.
        detail = self.client.get(f"/portal/requests/{item.id}")
        self.assertIn(b"RCAL-DR-", detail.data)

    def test_a_portal_submission_never_creates_a_register_link(self):
        """A claim cannot fabricate a link to a canonical record."""
        self.login("juan@example.ph", "parishpw")
        self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": SacramentType.BAPTISM.value,
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Juan Dela Cruz",
                "date_of_birth": "1990-01-01",
                "consent": "1",
            },
        )
        item = DocumentRequest.query.one()
        self.assertIsNone(item.matched_record_id)
        self.assertIsNone(item.certificate_request_id)
        self.assertEqual(CertificateRequest.query.count(), 0)

    def test_the_parishioner_status_lifecycle_has_no_issue_step(self):
        """A parishioner can never mark their own request completed."""
        statuses = {s.value for s in DocumentRequestStatus}
        self.assertIn("submitted", statuses)
        self.assertIn("completed", statuses)
        # The portal exposes no transition route at all.
        self.login("juan@example.ph", "parishpw")
        self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": SacramentType.BAPTISM.value,
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Juan Dela Cruz",
                "date_of_birth": "1990-01-01",
                "consent": "1",
            },
        )
        item = DocumentRequest.query.one()
        for action in ("complete", "approve", "issue"):
            response = self.client.post(f"/portal/requests/{item.id}/{action}")
            self.assertEqual(response.status_code, 404)

        db.session.refresh(item)
        self.assertEqual(item.status, DocumentRequestStatus.SUBMITTED)

    def test_the_request_list_shows_the_parishioner_their_reference(self):
        self.login("juan@example.ph", "parishpw")
        self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": SacramentType.MARRIAGE.value,
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Juan Dela Cruz",
                "date_of_birth": "1990-01-01",
                "consent": "1",
            },
        )
        item = DocumentRequest.query.one()
        response = self.client.get(f"/portal/requests/{item.id}")
        self.assertIn(b"Marriage", response.data)
        self.assertIn(b"Submitted", response.data)


# --- the request status lifecycle -----------------------------------------

class RequestLifecycleTest(PhaseOneTestCase):
    def test_online_payment_stages_are_reachable_but_not_mandatory(self):
        from rcal.models.enums import RequestStatus

        # A walk-in request still goes straight through.
        self.assertTrue(RequestStatus.APPROVED.can_transition_to(RequestStatus.ISSUED))
        # An online request can wait for payment first.
        self.assertTrue(
            RequestStatus.VERIFIED.can_transition_to(RequestStatus.AWAITING_PAYMENT)
        )
        self.assertTrue(
            RequestStatus.AWAITING_PAYMENT.can_transition_to(RequestStatus.PROCESSING)
        )

    def test_verification_still_cannot_be_skipped(self):
        from rcal.models.enums import RequestStatus

        self.assertFalse(RequestStatus.PENDING.can_transition_to(RequestStatus.ISSUED))
        self.assertFalse(RequestStatus.PENDING.can_transition_to(RequestStatus.PROCESSING))

    def test_an_issued_request_remains_terminal(self):
        from rcal.models.enums import RequestStatus

        for target in RequestStatus:
            self.assertFalse(RequestStatus.ISSUED.can_transition_to(target))

    def test_delivery_stages_still_count_as_open(self):
        from rcal.models.enums import RequestStatus

        self.assertTrue(RequestStatus.READY.is_open)
        self.assertTrue(RequestStatus.OUT_FOR_DELIVERY.is_open)
        self.assertTrue(RequestStatus.ISSUED.is_closed)


if __name__ == "__main__":
    unittest.main()
