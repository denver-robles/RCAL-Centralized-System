"""Smoke tests: the app boots and the domain behaves as designed.

Run with::

    python -m unittest discover -s tests -v
"""

import unittest
from datetime import date

from sqlalchemy.exc import IntegrityError

from rcal import create_app
from rcal.extensions import db
from rcal.models import (
    AccessLog,
    AnnotationType,
    AssignmentRole,
    CertificateRequest,
    Clergy,
    ClergyAssignment,
    ClergyTitle,
    MassIntention,
    MassIntentionStatus,
    Parish,
    Person,
    RequestStatus,
    Role,
    SacramentType,
    SacramentalRecord,
    Sex,
    User,
    Vicariate,
)
from rcal.models.base import utcnow


def make_vicariate_and_parish():
    vicariate = Vicariate(name="Central Vicariate")
    parish = Parish(
        name="St. Sebastian Cathedral",
        municipality="Lipa City",
        vicariate=vicariate,
    )
    db.session.add(vicariate)
    db.session.add(parish)
    db.session.flush()
    return vicariate, parish


def make_person(first, last, sex, middle=None, birth=None, death=None):
    person = Person(
        first_name=first,
        middle_name=middle,
        last_name=last,
        sex=sex,
        date_of_birth=birth,
        date_of_death=death,
    )
    db.session.add(person)
    db.session.flush()
    return person


class RCALAppSmokeTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        self.ctx.pop()

    # --- the application -------------------------------------------------
    def test_landing_page_is_served(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"ARCHDIOCESE OF", response.data)
        # The asset references must resolve to URLs the app actually serves.
        self.assertIn(b"/static/style.css", response.data)
        self.assertIn(b"/static/script.js", response.data)
        self.assertIn(b"/static/logo.png", response.data)

    def test_static_assets_are_served(self):
        for asset in ("style.css", "script.js", "logo.png", "church.png"):
            response = self.client.get(f"/static/{asset}")
            self.assertEqual(
                response.status_code, 200, f"/static/{asset} not served"
            )
        # The hero background is referenced from inside style.css.
        css = self.client.get("/static/style.css").data.decode()
        self.assertIn("url('church.png')", css)

    # --- authentication primitives ----------------------------------------
    def test_password_hashing(self):
        user = User(username="frtest", role=Role.PARISH_STAFF)
        user.set_password("s3cret!")
        db.session.add(user)
        db.session.commit()

        self.assertNotIn("s3cret!", user.password_hash)
        self.assertTrue(user.check_password("s3cret!"))
        self.assertFalse(user.check_password("wrong"))

    def test_role_permissions(self):
        self.assertTrue(Role.ADMIN.can_manage_users)
        self.assertFalse(Role.CHANCERY.can_manage_users)
        self.assertTrue(Role.CHANCERY.is_archdiocese_wide)
        self.assertTrue(Role.ADMIN.is_archdiocese_wide)
        self.assertFalse(Role.CLERGY.is_archdiocese_wide)
        self.assertTrue(Role.PARISH_STAFF.can_issue_certificates)
        self.assertFalse(Role.VIEWER.can_issue_certificates)

    # --- the domain -------------------------------------------------------
    def test_record_citation_is_unique(self):
        _, parish = make_vicariate_and_parish()
        person = make_person("Juan", "Dela Cruz", Sex.MALE)

        record = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.BAPTISM,
            event_date=date(1990, 6, 15),
            book_number=1,
            page_number=10,
            entry_number=4,
            originating_parish=parish,
        )
        db.session.add(record)
        db.session.flush()
        self.assertEqual(record.citation, "Book 1, Page 10, Entry 4")

        duplicate = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.BAPTISM,
            event_date=date(1990, 6, 15),
            book_number=1,
            page_number=10,
            entry_number=4,
            originating_parish=parish,
        )
        db.session.add(duplicate)
        with self.assertRaises(IntegrityError):
            db.session.flush()

    def test_annotation_is_append_only_and_linked(self):
        _, parish = make_vicariate_and_parish()
        clergy = Clergy(
            first_name="Pedro",
            last_name="Perez",
            sex=Sex.MALE,
            title=ClergyTitle.FATHER,
            ordination_date=date(1985, 12, 8),
        )
        db.session.add(clergy)
        db.session.flush()
        self.assertEqual(clergy.titled_name, "Rev. Fr. Pedro Perez")

        assignment = ClergyAssignment(
            clergy=clergy,
            parish=parish,
            role=AssignmentRole.PARISH_PRIEST,
            assigned_from=date(2015, 1, 1),
        )
        db.session.add(assignment)
        self.assertTrue(assignment.is_current)

        person = make_person("Maria", "Reyes", Sex.FEMALE, middle="Luna",
                             birth=date(1995, 2, 14))
        spouse = make_person("Carlos", "Villanueva", Sex.MALE)

        baptism = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.BAPTISM,
            event_date=date(1995, 2, 18),
            book_number=3,
            page_number=42,
            entry_number=7,
            originating_parish=parish,
            performed_by_clergy=clergy,
            godparents="Jose and Ana Reyes",
        )
        marriage = SacramentalRecord(
            person=person,
            spouse=spouse,
            sacrament_type=SacramentType.MARRIAGE,
            event_date=date(2020, 10, 3),
            book_number=1,
            page_number=5,
            entry_number=2,
            originating_parish=parish,
            witnesses="Tomas A. and Rosa B.",
        )
        db.session.add_all([baptism, marriage])
        db.session.flush()

        baptism.add_annotation(
            AnnotationType.MARRIAGE,
            "Married 3 October 2020; see marriage register.",
            event_date=date(2020, 10, 3),
            reference_record=marriage,
        )
        db.session.flush()

        self.assertEqual(len(baptism.annotations), 1)
        note = baptism.annotations[0]
        self.assertIs(note.reference_record, marriage)
        self.assertTrue(note.annotation_type.links_to_record)
        self.assertEqual(len(marriage.annotations), 0)

        self.assertEqual(len(person.records_as_subject), 2)
        self.assertEqual(len(person.records_as_spouse), 0)
        self.assertEqual(len(spouse.records_as_spouse), 1)

    def test_certificate_workflow_with_audit_trail(self):
        _, parish = make_vicariate_and_parish()
        person = make_person("Jose", "Ramos", Sex.MALE)
        record = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.BAPTISM,
            event_date=date(1988, 4, 2),
            book_number=2,
            page_number=18,
            entry_number=11,
            originating_parish=parish,
        )
        requester = User(username="chancery1", role=Role.CHANCERY)
        requester.set_password("pw")
        db.session.add_all([requester, record])
        db.session.flush()

        request = CertificateRequest(
            record=record,
            requester_user=requester,
            requester_name="Jose Ramos",
            purpose="Marriage documentation",
            status=RequestStatus.PENDING,
        )
        db.session.add(request)
        db.session.flush()
        self.assertTrue(request.is_open)

        request.status = RequestStatus.VERIFIED
        request.verified_by_user = requester
        request.verified_at = utcnow()
        db.session.flush()
        self.assertTrue(request.is_open)

        request.status = RequestStatus.ISSUED
        request.issued_by_user = requester
        request.issued_at = utcnow()
        request.certificate_number = "RCAL-2026-0001"
        db.session.flush()

        self.assertTrue(request.status.is_closed)
        self.assertFalse(request.is_open)
        self.assertEqual(request.verified_by_user.username, "chancery1")
        self.assertEqual(request.issued_by_user.username, "chancery1")
        self.assertEqual(record.certificate_requests, [request])

    def test_access_log_and_mass_intention(self):
        user = User(username="viewer1", role=Role.VIEWER)
        user.set_password("x")
        _, parish = make_vicariate_and_parish()
        person = make_person("Ana", "Bautista", Sex.FEMALE, death=date(2024, 1, 5))
        record = SacramentalRecord(
            person=person,
            sacrament_type=SacramentType.DEATH,
            event_date=date(2024, 1, 5),
            book_number=2,
            page_number=9,
            entry_number=1,
            originating_parish=parish,
        )
        db.session.add_all([user, record])
        db.session.flush()

        log = AccessLog(user=user, record=record, action="view")
        db.session.add(log)
        db.session.flush()
        self.assertEqual(log.record, record)
        self.assertEqual(log.user.username, "viewer1")
        self.assertTrue(person.is_deceased)

        mass = MassIntention(
            intended_for="for the repose of the soul of Ana Bautista",
            requester_name="Bautista family",
            parish=parish,
            status=MassIntentionStatus.PENDING,
        )
        db.session.add(mass)
        db.session.flush()
        mass.status = MassIntentionStatus.SCHEDULED
        db.session.flush()
        self.assertFalse(mass.is_completed)
        self.assertEqual(mass.status, MassIntentionStatus.SCHEDULED)


if __name__ == "__main__":
    unittest.main()

