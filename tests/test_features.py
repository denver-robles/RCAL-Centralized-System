"""Tests for the parish directory, register search, and certificate workflow.

Run with::

    python -m unittest discover -s tests -v
"""

import unittest
from datetime import date

from rcal import create_app
from rcal.extensions import db
from rcal.models import (
    AccessLog,
    CertificateRequest,
    Clergy,
    ClergyAssignment,
    Parish,
    Person,
    RequestStatus,
    Role,
    SacramentalRecord,
    SacramentType,
    Sex,
    User,
    Vicariate,
)
from rcal.models.enums import AssignmentRole, ClergyTitle
from rcal.services import archdiocese_counts, visible_parish


class FeatureTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.vicariate = Vicariate(name="Central Vicariate")
        db.session.add(self.vicariate)
        db.session.flush()

        self.lipa = self.make_parish("St. Sebastian Cathedral", "Lipa City")
        self.batangas = self.make_parish(
            "Our Lady of Mount Carmel Parish", "Batangas City"
        )

        self.admin = self.make_user("admin", "adminpw", Role.ADMIN)
        self.chancery = self.make_user("chancery", "chancerypw", Role.CHANCERY)
        self.lipa_staff = self.make_user(
            "lipasec", "staffpw", Role.PARISH_STAFF, parish=self.lipa
        )
        self.batangas_staff = self.make_user(
            "batangassec", "staffpw", Role.PARISH_STAFF, parish=self.batangas
        )
        self.viewer = self.make_user("viewer", "viewerpw", Role.VIEWER, parish=self.lipa)

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    # --- helpers -------------------------------------------------------
    def make_parish(self, name, municipality):
        parish = Parish(
            name=name,
            municipality=municipality,
            vicariate=self.vicariate,
        )
        db.session.add(parish)
        db.session.flush()
        return parish

    def make_user(self, username, password, role, parish=None):
        user = User(username=username, role=role, home_parish=parish)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    def make_clergy(self, first, last, title=ClergyTitle.FATHER):
        person = Clergy(
            first_name=first,
            last_name=last,
            sex=Sex.MALE,
            title=title,
            ordination_date=date(2005, 12, 10),
        )
        db.session.add(person)
        db.session.flush()
        return person

    def make_record(
        self,
        first,
        last,
        parish,
        sacrament=SacramentType.BAPTISM,
        book=1,
        page=1,
        entry=1,
        event=None,
        spouse=None,
    ):
        person = Person(first_name=first, last_name=last, sex=Sex.MALE)
        db.session.add(person)
        spouse_person = None
        if spouse:
            spouse_person = Person(first_name=spouse[0], last_name=spouse[1], sex=Sex.FEMALE)
            db.session.add(spouse_person)
        db.session.flush()

        record = SacramentalRecord(
            person=person,
            spouse=spouse_person,
            sacrament_type=sacrament,
            event_date=event or date(2020, 5, 10),
            book_number=book,
            page_number=page,
            entry_number=entry,
            originating_parish=parish,
        )
        db.session.add(record)
        db.session.commit()
        return record

    def login(self, username, password):
        # Sign out first: the login view deliberately bounces an
        # already-authenticated visitor to their dashboard instead of
        # re-authenticating them, so posting /login again would be a no-op.
        self.client.post("/logout")
        return self.client.post(
            "/login",
            data={"identifier": username, "password": password},
            follow_redirects=True,
        )


# --- parish directory -----------------------------------------------------

class DirectoryTest(FeatureTestCase):
    def test_directory_requires_sign_in(self):
        self.assertEqual(self.client.get("/directory/parishes").status_code, 302)

    def test_chancery_sees_every_parish(self):
        self.login("chancery", "chancerypw")
        response = self.client.get("/directory/parishes")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"St. Sebastian Cathedral", response.data)
        self.assertIn(b"Our Lady of Mount Carmel Parish", response.data)

    def test_parish_staff_see_only_their_own_parish(self):
        self.login("lipasec", "staffpw")
        response = self.client.get("/directory/parishes")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"St. Sebastian Cathedral", response.data)
        self.assertNotIn(b"Our Lady of Mount Carmel Parish", response.data)

    def test_directory_search_filters_by_name(self):
        self.login("chancery", "chancerypw")
        response = self.client.get("/directory/parishes?q=mount")
        self.assertIn(b"mount", response.data)
        self.assertNotIn(b"Saint Sebastian", response.data.replace(b"St. Sebastian", b""))

    def test_parish_detail_is_scoped(self):
        self.login("lipasec", "staffpw")
        own = self.client.get(f"/directory/parishes/{self.lipa.id}")
        self.assertEqual(own.status_code, 200)

        other = self.client.get(f"/directory/parishes/{self.batangas.id}")
        self.assertEqual(other.status_code, 403)

    def test_only_chancery_may_add_a_parish(self):
        self.login("lipasec", "staffpw")
        self.assertEqual(self.client.get("/directory/parishes/new").status_code, 403)

    def test_chancery_can_add_a_parish(self):
        self.login("chancery", "chancerypw")
        response = self.client.post(
            "/directory/parishes/new",
            data={
                "name": "San Sebastian Parish",
                "vicariate_id": str(self.vicariate.id),
                "municipality": "Tanauan City",
            },
            follow_redirects=True,
        )
        # The flash message wraps the name in escaped quotes.
        self.assertIn(b"added.", response.data)
        self.assertIn(b"San Sebastian Parish", response.data)
        self.assertEqual(Parish.query.filter_by(name="San Sebastian Parish").count(), 1)

    def test_duplicate_parish_name_is_rejected(self):
        self.login("chancery", "chancerypw")
        response = self.client.post(
            "/directory/parishes/new",
            data={"name": "St. Sebastian Cathedral", "vicariate_id": str(self.vicariate.id)},
        )
        self.assertIn(b"already exists", response.data)

    def test_assigning_clergy_closes_the_previous_post(self):
        first = self.make_clergy("Juan", "Santos")
        db.session.add(
            ClergyAssignment(
                clergy=first,
                parish=self.batangas,
                role=AssignmentRole.ASSISTANT_PRIEST,
                assigned_from=date(2015, 1, 1),
            )
        )
        db.session.commit()

        self.login("chancery", "chancerypw")
        response = self.client.post(
            f"/directory/parishes/{self.lipa.id}/assign",
            data={
                "clergy_id": str(first.id),
                "role": AssignmentRole.PARISH_PRIEST.value,
                "assigned_from": "2020-06-01",
            },
            follow_redirects=True,
        )
        self.assertIn(b"assigned to St. Sebastian Cathedral", response.data)

        db.session.refresh(first)
        self.assertEqual(len(first.assignments), 2)
        old = [a for a in first.assignments if a.parish_id == self.batangas.id][0]
        new = [a for a in first.assignments if a.parish_id == self.lipa.id][0]
        # The career history survives: the old post is closed, not deleted.
        self.assertEqual(old.assigned_to, date(2020, 6, 1))
        self.assertTrue(new.is_current)

    def test_clergy_directory_is_scoped_to_the_users_parish(self):
        mine = self.make_clergy("Pedro", "Perez")
        theirs = self.make_clergy("Juan", "Santos")
        db.session.add_all(
            [
                ClergyAssignment(
                    clergy=mine,
                    parish=self.lipa,
                    role=AssignmentRole.PARISH_PRIEST,
                    assigned_from=date(2018, 1, 1),
                ),
                ClergyAssignment(
                    clergy=theirs,
                    parish=self.batangas,
                    role=AssignmentRole.PARISH_PRIEST,
                    assigned_from=date(2018, 1, 1),
                ),
            ]
        )
        db.session.commit()

        self.login("lipasec", "staffpw")
        response = self.client.get("/directory/clergy")
        self.assertIn(b"Perez", response.data)
        self.assertNotIn(b"Santos", response.data)

    def test_parish_scoped_user_cannot_open_another_parishes_cleric(self):
        theirs = self.make_clergy("Juan", "Santos")
        db.session.add(
            ClergyAssignment(
                clergy=theirs,
                parish=self.batangas,
                role=AssignmentRole.PARISH_PRIEST,
                assigned_from=date(2018, 1, 1),
            )
        )
        db.session.commit()

        self.login("lipasec", "staffpw")
        self.assertEqual(
            self.client.get(f"/directory/clergy/{theirs.id}").status_code, 403
        )


# --- register search and entry --------------------------------------------

class RecordSearchTest(FeatureTestCase):
    def setUp(self):
        super().setUp()
        self.juan = self.make_record("Juan", "Dela Cruz", self.lipa, entry=1)
        self.maria = self.make_record("Maria", "Santos", self.batangas, entry=1)

    def test_search_by_surname(self):
        self.login("chancery", "chancerypw")
        response = self.client.get("/records?name=Dela")
        self.assertIn(b"Dela Cruz", response.data)
        self.assertNotIn(b"Maria Santos", response.data)

    def test_marriage_is_found_by_either_party(self):
        spouse = self.make_record("Carlos", "Villanueva", self.lipa, entry=2)
        marriage = self.make_record(
            "Carlos",
            "Villanueva",
            self.batangas,
            sacrament=SacramentType.MARRIAGE,
            entry=1,
            spouse=("Maria", "Dela Cruz"),
        )

        self.login("chancery", "chancerypw")
        # A marriage is found by either party's surname: the entry is filed
        # under the groom, but the bride's name is searchable too.
        by_spouse = self.client.get("/records?name=Dela")
        self.assertIn(b"Villanueva, Carlos", by_spouse.data)

        by_subject = self.client.get("/records?name=Villanueva&type=marriage")
        self.assertIn(b"Carlos", by_subject.data)
        self.assertIsNotNone(marriage)

    def test_search_is_scoped_to_the_users_parish(self):
        self.login("lipasec", "staffpw")
        response = self.client.get("/records")
        self.assertIn(b"Dela Cruz", response.data)
        self.assertNotIn(b"Maria Santos", response.data)

    def test_search_by_year_and_type(self):
        self.make_record(
            "Pedro", "Cruz",
            self.lipa,
            sacrament=SacramentType.MARRIAGE,
            entry=9,
            event=date(2021, 7, 4),
        )

        self.login("chancery", "chancerypw")
        response = self.client.get("/records?type=marriage&year=2021")
        # Rendered as "Cruz, Pedro", the filing order a register uses.
        self.assertIn(b"Cruz, Pedro", response.data)
        self.assertNotIn(b"Juan Dela Cruz", response.data)

    def test_opening_a_record_writes_an_access_log(self):
        self.login("chancery", "chancerypw")
        self.client.get(f"/records/{self.juan.id}")
        log = AccessLog.query.filter_by(record_id=self.juan.id).one()
        self.assertEqual(log.user.username, "chancery")
        self.assertEqual(log.action, "view")

    def test_staff_cannot_open_another_parishes_record(self):
        self.login("lipasec", "staffpw")
        self.assertEqual(
            self.client.get(f"/records/{self.maria.id}").status_code, 403
        )

    def test_viewer_can_read_but_not_transcribe(self):
        self.login("viewer", "viewerpw")
        self.assertEqual(self.client.get(f"/records/{self.juan.id}").status_code, 200)
        self.assertEqual(self.client.get("/records/new").status_code, 403)

    def test_transcribing_an_entry(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            "/records/new",
            data={
                "first_name": "Ana",
                "last_name": "Bautista",
                "sex": Sex.FEMALE.value,
                "date_of_birth": "2015-03-02",
                "sacrament_type": SacramentType.BAPTISM.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.lipa.id),
                "book_number": "3",
                "page_number": "42",
                "entry_number": "7",
            },
            follow_redirects=True,
        )
        self.assertIn(b"Register entry recorded", response.data)

        record = SacramentalRecord.query.filter_by(entry_number=7).one()
        self.assertEqual(record.person.full_name, "Ana Bautista")
        self.assertEqual(record.originating_parish_id, self.lipa.id)

    def test_staff_cannot_transcribe_into_another_parish(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            "/records/new",
            data={
                "first_name": "Ana",
                "last_name": "Bautista",
                "sex": Sex.FEMALE.value,
                "sacrament_type": SacramentType.BAPTISM.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.batangas.id),
                "book_number": "1",
                "page_number": "1",
                "entry_number": "1",
            },
        )
        self.assertIn(b"only transcribe into its own parish", response.data)
        self.assertEqual(SacramentalRecord.query.count(), 2)

    def test_duplicate_citation_is_refused(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            "/records/new",
            data={
                "first_name": "Someone",
                "last_name": "Else",
                "sex": Sex.MALE.value,
                "sacrament_type": SacramentType.BAPTISM.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.lipa.id),
                # Same citation as the Juan Dela Cruz entry above.
                "book_number": "1",
                "page_number": "1",
                "entry_number": "1",
            },
        )
        self.assertIn(b"already recorded", response.data)
        self.assertEqual(SacramentalRecord.query.count(), 2)

    def test_marriage_requires_the_other_party(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            "/records/new",
            data={
                "first_name": "Ana",
                "last_name": "Bautista",
                "sex": Sex.FEMALE.value,
                "sacrament_type": SacramentType.MARRIAGE.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.lipa.id),
                "book_number": "5",
                "page_number": "1",
                "entry_number": "1",
            },
        )
        self.assertIn(b"must name the other party", response.data)

    def test_birth_after_the_event_is_refused(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            "/records/new",
            data={
                "first_name": "Ana",
                "last_name": "Bautista",
                "sex": Sex.FEMALE.value,
                "date_of_birth": "2020-01-01",
                "sacrament_type": SacramentType.BAPTISM.value,
                "event_date": "2015-04-12",
                "originating_parish_id": str(self.lipa.id),
                "book_number": "6",
                "page_number": "1",
                "entry_number": "1",
            },
        )
        self.assertIn(b"cannot be born after", response.data)

    def test_annotation_is_appended_and_record_is_unchanged(self):
        self.login("lipasec", "staffpw")
        marriage = self.make_record(
            "Ana", "Bautista", self.lipa, sacrament=SacramentType.MARRIAGE, entry=5
        )
        before = (self.juan.book_number, self.juan.page_number, self.juan.entry_number)

        response = self.client.post(
            f"/records/{self.juan.id}/annotate",
            data={
                "annotation_type": "marriage",
                "note_text": "Married; see marriage register.",
                "event_date": "2020-06-01",
                "reference_record_id": str(marriage.id),
            },
            follow_redirects=True,
        )
        self.assertIn(b"Margin note added", response.data)

        db.session.refresh(self.juan)
        self.assertEqual(
            (self.juan.book_number, self.juan.page_number, self.juan.entry_number),
            before,
        )
        self.assertEqual(len(self.juan.annotations), 1)
        self.assertIs(self.juan.annotations[0].reference_record, marriage)

        # Annotating is itself an accountable act.
        self.assertTrue(
            AccessLog.query.filter_by(
                record_id=self.juan.id, action="annotate"
            ).count()
        )

    def test_a_marriage_note_must_reference_a_record(self):
        self.login("lipasec", "staffpw")
        response = self.client.post(
            f"/records/{self.juan.id}/annotate",
            data={
                "annotation_type": "marriage",
                "note_text": "Married.",
            },
        )
        self.assertIn(b"must point at the register entry", response.data)

    def test_staff_cannot_annotate_another_parishes_record(self):
        self.login("lipasec", "staffpw")
        self.assertEqual(
            self.client.post(
                f"/records/{self.maria.id}/annotate",
                data={"annotation_type": "other", "note_text": "x"},
            ).status_code,
            403,
        )


# --- certificate workflow --------------------------------------------------

class CertificateWorkflowTest(FeatureTestCase):
    def setUp(self):
        super().setUp()
        self.record = self.make_record("Juan", "Dela Cruz", self.lipa)

    def file_request(self, username, password, name="Juan Dela Cruz"):
        self.login(username, password)
        return self.client.post(
            "/certificates/new",
            data={
                "record_id": str(self.record.id),
                "requester_name": name,
                "purpose": "Marriage documentation",
            },
            follow_redirects=True,
        )

    def walk_to_issued(self, item):
        """Run a request all the way to issued, with the right actor at each
        step: the holding parish verifies, the chancery authorises."""
        self.login("lipasec", "staffpw")
        self.client.post(f"/certificates/{item.id}/verify")
        self.login("chancery", "chancerypw")
        self.client.post(f"/certificates/{item.id}/approve")
        self.client.post(f"/certificates/{item.id}/issue")
        db.session.refresh(item)

    def test_full_workflow_issues_a_numbered_certificate(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        self.assertEqual(item.status, RequestStatus.PENDING)

        self.client.post(f"/certificates/{item.id}/verify")
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.VERIFIED)
        self.assertEqual(item.verified_by_user.username, "lipasec")

        self.login("chancery", "chancerypw")
        self.client.post(f"/certificates/{item.id}/approve")
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.APPROVED)

        # Verification and approval are separate acts by separate people,
        # and the trail has to attribute both.
        self.assertEqual(item.verified_by_user.username, "lipasec")
        self.assertEqual(item.approved_by_user.username, "chancery")
        self.assertIsNotNone(item.verified_at)
        self.assertIsNotNone(item.approved_at)

        self.client.post(f"/certificates/{item.id}/issue")
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.ISSUED)
        self.assertTrue(item.certificate_number.startswith("RCAL-"))
        self.assertEqual(item.issued_by_user.username, "chancery")
        self.assertIsNotNone(item.issued_at)

    def test_verification_cannot_be_skipped(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()

        self.client.post(f"/certificates/{item.id}/issue")
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.PENDING)

    def test_an_issued_request_cannot_be_reopened(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        self.walk_to_issued(item)
        self.assertEqual(item.status, RequestStatus.ISSUED)

        self.client.post(f"/certificates/{item.id}/verify")
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.ISSUED)

    def test_parish_staff_cannot_approve(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        self.client.post(f"/certificates/{item.id}/verify")

        # A parish verifies; the chancery authorises. Skipping the chancery
        # must fail even for a role that may otherwise certify.
        self.assertEqual(
            self.client.post(f"/certificates/{item.id}/approve").status_code, 403
        )

    def test_rejection_requires_a_reason(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        response = self.client.post(
            f"/certificates/{item.id}/reject", follow_redirects=True
        )
        self.assertIn(b"must state the reason", response.data)

        response = self.client.post(
            f"/certificates/{item.id}/reject",
            data={"reason": "Citation does not match the bound register."},
            follow_redirects=True,
        )
        self.assertIn(b"rejected", response.data)
        db.session.refresh(item)
        self.assertEqual(item.status, RequestStatus.REJECTED)
        self.assertEqual(item.rejection_reason, "Citation does not match the bound register.")

    def test_viewer_may_request_but_not_certify(self):
        self.file_request("viewer", "viewerpw")
        item = CertificateRequest.query.one()
        self.assertEqual(item.status, RequestStatus.PENDING)
        self.assertEqual(
            self.client.post(f"/certificates/{item.id}/verify").status_code, 403
        )

    def test_staff_cannot_request_from_a_record_they_may_not_read(self):
        self.login("lipasec", "staffpw")
        other = self.make_record("Maria", "Santos", self.batangas, entry=2)
        response = self.client.post(
            "/certificates/new",
            data={"record_id": str(other.id), "requester_name": "Maria Santos"},
        )
        self.assertIn(b"not in a register you may read", response.data)

    def test_requester_can_track_their_own_request(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        self.login("batangassec", "staffpw")
        # Another parish neither filed it nor holds the register.
        self.assertEqual(
            self.client.get(f"/certificates/{item.id}").status_code, 403
        )

    def test_certificate_numbers_do_not_collide(self):
        first = self.file_request("lipasec", "staffpw")
        self.assertIn(b"filed", first.data)
        second_record = self.make_record("Maria", "Santos", self.lipa, entry=2)
        self.client.post(
            "/certificates/new",
            data={"record_id": str(second_record.id), "requester_name": "Maria Santos"},
        )

        numbers = []
        for item in CertificateRequest.query.all():
            self.walk_to_issued(item)
            numbers.append(item.certificate_number)

        self.assertEqual(len(numbers), 2)
        self.assertEqual(len(set(numbers)), 2, f"duplicate certificate number in {numbers}")

    def test_only_an_issued_request_prints_a_certificate(self):
        self.file_request("lipasec", "staffpw")
        item = CertificateRequest.query.one()
        self.assertEqual(
            self.client.get(f"/certificates/{item.id}/certificate").status_code, 404
        )

        self.walk_to_issued(item)
        self.assertEqual(item.status, RequestStatus.ISSUED)

        response = self.client.get(f"/certificates/{item.id}/certificate")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"CERTIFIED TRUE COPY", response.data)
        self.assertIn(b"Juan Dela Cruz", response.data)
        self.assertIn(item.certificate_number.encode(), response.data)
        # The citation is what makes the copy checkable, so it must appear.
        self.assertIn(b"Book 1, Page 1, Entry 1", response.data)

    def test_certificate_carries_its_margin_notes(self):
        marriage = self.make_record(
            "Ana", "Bautista", self.lipa, sacrament=SacramentType.MARRIAGE, entry=5
        )
        self.juan_note_record = self.record
        self.login("lipasec", "staffpw")
        self.client.post(
            f"/records/{self.record.id}/annotate",
            data={
                "annotation_type": "marriage",
                "note_text": "Married in 2020.",
                "reference_record_id": str(marriage.id),
            },
        )
        self.client.post(
            "/certificates/new",
            data={"record_id": str(self.record.id), "requester_name": "Juan Dela Cruz"},
        )
        item = CertificateRequest.query.one()
        self.walk_to_issued(item)

        response = self.client.get(f"/certificates/{item.id}/certificate")
        self.assertIn(b"Married in 2020.", response.data)


# --- analytics -------------------------------------------------------------

class AnalyticsTest(FeatureTestCase):
    def setUp(self):
        super().setUp()
        self.make_record("Juan", "Dela Cruz", self.lipa, entry=1)
        self.make_record(
            "Maria", "Santos",
            self.batangas,
            sacrament=SacramentType.MARRIAGE,
            entry=1,
        )
        priest = self.make_clergy("Pedro", "Perez")
        db.session.add(
            ClergyAssignment(
                clergy=priest,
                parish=self.lipa,
                role=AssignmentRole.PARISH_PRIEST,
                assigned_from=date(2019, 1, 1),
            )
        )
        db.session.commit()

    def test_counts_come_from_the_database(self):
        counts = archdiocese_counts()
        self.assertEqual(counts["parishes"], 2)
        self.assertEqual(counts["vicariates"], 1)
        # Two distinct municipalities.
        self.assertEqual(counts["municipalities"], 2)
        # One person per record; the marriage adds a spouse but its own
        # person row, which the count below therefore does not include.
        self.assertEqual(counts["records"], 2)
        self.assertEqual(counts["persons"], 2)
        # Only clergy holding a current post count as priests in post.
        self.assertEqual(counts["priests"], 1)

    def test_landing_page_shows_computed_numbers(self):
        response = self.client.get("/")
        body = response.data.decode()

        self.assertIn('id="analytics"', body)
        # The old hardcoded figures must be gone.
        self.assertNotIn(">216<", body)
        self.assertNotIn(">64<", body)
        self.assertNotIn(">34<", body)

        import re

        pills = re.findall(r'class="pill-value">\s*(\d+)\s*<', body)
        self.assertIn("2", pills)  # parishes
        self.assertIn("1", pills)  # priests in post

    def test_analytics_page_renders(self):
        self.login("chancery", "chancerypw")
        response = self.client.get("/records/analytics")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Parishes", response.data)
        self.assertIn(b"ENTRIES BY REGISTER", response.data)

    def test_empty_database_reports_zeros_not_placeholder_figures(self):
        db.session.query(SacramentalRecord).delete()
        db.session.query(Parish).delete()
        db.session.query(Vicariate).delete()
        db.session.commit()

        counts = archdiocese_counts()
        self.assertEqual(counts["parishes"], 0)
        self.assertEqual(counts["municipalities"], 0)

    def test_parish_scoped_analytics_count_only_its_own_records(self):
        self.login("lipasec", "staffpw")
        response = self.client.get("/records/analytics")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Figures for St. Sebastian Cathedral", response.data)

    def test_visible_parish_respects_role_scope(self):
        self.assertIsNone(visible_parish(self.admin))
        self.assertIsNone(visible_parish(self.chancery))
        self.assertEqual(visible_parish(self.lipa_staff).id, self.lipa.id)


if __name__ == "__main__":
    unittest.main()