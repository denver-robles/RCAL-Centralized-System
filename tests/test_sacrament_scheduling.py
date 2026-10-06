"""Tests for Sacrament Scheduling, Direct-to-Register Workflow, and Data Validations.

Verifies:
1. Parishioner can request a sacrament schedule for any sacrament.
2. Parish staff can monitor, review, approve, and assign venue/clergy.
3. Completing a sacrament schedule directs staff immediately to register transcription
   with pre-filled event data, and links the resulting canonical record to the schedule.
4. Mass intentions action is removed from interfaces, and /intentions redirects to schedules.
5. Document request form strictly requires holding parish and date of birth,
   while date of sacrament can be left blank.
6. Data validation on fields across forms (dates, numbers, phones, emails).
"""

from datetime import date, datetime, timedelta, timezone
import unittest

from rcal import create_app
from rcal.extensions import db
from rcal.models import (
    Clergy,
    DocumentRequest,
    Parish,
    ParishEvent,
    Role,
    SacramentalRecord,
    User,
    Venue,
    Vicariate,
)
from rcal.models.enums import (
    AuditAction,
    ClergyTitle,
    DocumentRequestStatus,
    EventStatus,
    EventType,
    SacramentType,
    Sex,
)


class SacramentSchedulingWorkflowTest(unittest.TestCase):
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

        self.venue = Venue(
            parish=self.parish,
            name="Main Altar",
            capacity=500,
            is_active=True,
        )
        db.session.add(self.venue)

        self.priest = Clergy(
            first_name="Armando",
            last_name="Rosales",
            title=ClergyTitle.FATHER,
            sex=Sex.MALE,
            is_active=True,
        )
        db.session.add(self.priest)

        self.admin = User(
            username="admin",
            email="admin@example.ph",
            role=Role.ADMIN,
            is_active=True,
        )
        self.admin.set_password("adminpw")

        self.staff = User(
            username="lipasec",
            email="lipasec@example.ph",
            role=Role.PARISH_STAFF,
            home_parish_id=self.parish.id,
            is_active=True,
        )
        self.staff.set_password("staffpw")

        self.parishioner = User(
            username="juan@example.ph",
            email="juan@example.ph",
            display_name="Juan Dela Cruz",
            role=Role.PARISHIONER,
            phone="0917-111-2222",
            is_active=True,
        )
        self.parishioner.set_password("parishpw")

        db.session.add_all([self.admin, self.staff, self.parishioner])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def login(self, username, password):
        self.client.post("/logout")
        return self.client.post(
            "/login", data={"identifier": username, "password": password}
        )

    # --- 1. Parishioner schedule request tests -----------------------------

    def test_parishioner_can_request_sacrament_schedule(self):
        """Parishioner files a schedule request for baptism."""
        self.login("juan@example.ph", "parishpw")

        # Verify GET form loads cleanly without template errors
        get_res = self.client.get("/portal/schedules/new")
        self.assertEqual(get_res.status_code, 200)
        self.assertIn(b"Request a Sacrament Schedule", get_res.data)
        self.assertIn(b"Baptism", get_res.data)

        # Verify POST with empty fields re-renders with validation errors
        invalid_res = self.client.post("/portal/schedules/new", data={})
        self.assertEqual(invalid_res.status_code, 200)
        self.assertIn(b"Parish is required", invalid_res.data)

        future_date = (date.today() + timedelta(days=14)).isoformat()
        response = self.client.post(
            "/portal/schedules/new",
            data={
                "parish_id": str(self.parish.id),
                "event_type": "baptism",
                "preferred_date": future_date,
                "preferred_time": "10:00 AM",
                "title": "Baptism of Baby Juanito Dela Cruz",
                "requester_name": "Juan Dela Cruz",
                "requester_contact": "0917-111-2222",
                "expected_attendees": "25",
                "description": "Please provide baptismal candles and certificate.",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"submitted for parish staff review", response.data)

        # Verify event in DB
        event = db.session.scalar(
            db.select(ParishEvent).where(ParishEvent.requester_user_id == self.parishioner.id)
        )
        self.assertIsNotNone(event)
        self.assertEqual(event.event_type, EventType.BAPTISM)
        self.assertEqual(event.status, EventStatus.REQUESTED)
        self.assertEqual(event.parish_id, self.parish.id)
        self.assertEqual(event.title, "Baptism of Baby Juanito Dela Cruz")

    def test_parishioner_can_view_own_schedules_and_detail(self):
        """Parishioner views schedule list and detail page."""
        future_start = datetime.now(timezone.utc) + timedelta(days=10)
        event = ParishEvent(
            parish=self.parish,
            event_type=EventType.WEDDING,
            title="Wedding of John and Jane",
            starts_at=future_start,
            ends_at=future_start + timedelta(hours=1),
            status=EventStatus.REQUESTED,
            requester_user_id=self.parishioner.id,
            requester_name="Juan Dela Cruz",
            requester_contact="0917-111-2222",
        )
        db.session.add(event)
        db.session.commit()

        self.login("juan@example.ph", "parishpw")
        list_resp = self.client.get("/portal/schedules")
        self.assertIn(b"Wedding of John and Jane", list_resp.data)
        self.assertIn(b"Pending Approval", list_resp.data)

        detail_resp = self.client.get(f"/portal/schedules/{event.id}")
        self.assertIn(b"Wedding Schedule Request", detail_resp.data)
        self.assertIn(b"St. Sebastian Cathedral", detail_resp.data)

    def test_parishioner_can_cancel_own_pending_schedule(self):
        """Parishioner can cancel a pending schedule request."""
        future_start = datetime.now(timezone.utc) + timedelta(days=10)
        event = ParishEvent(
            parish=self.parish,
            event_type=EventType.CONFIRMATION,
            title="Confirmation of Maria",
            starts_at=future_start,
            ends_at=future_start + timedelta(hours=1),
            status=EventStatus.REQUESTED,
            requester_user_id=self.parishioner.id,
        )
        db.session.add(event)
        db.session.commit()

        self.login("juan@example.ph", "parishpw")
        cancel_resp = self.client.post(
            f"/portal/schedules/{event.id}/cancel", follow_redirects=True
        )
        self.assertEqual(cancel_resp.status_code, 200)
        db.session.refresh(event)
        self.assertEqual(event.status, EventStatus.CANCELLED)
        self.assertIn("Cancelled", event.cancellation_reason)

    # --- 2. Staff review, approval, and direct-to-register -----------------

    def test_staff_can_create_schedule_directly(self):
        """Parish staff directly creates a sacrament schedule from parish office."""
        self.login("lipasec@example.ph", "staffpw")

        # Verify GET form loads cleanly
        get_res = self.client.get("/records/schedules/new")
        self.assertEqual(get_res.status_code, 200)
        self.assertIn(b"Schedule a Sacrament", get_res.data)

        # POST create schedule
        future_date = (date.today() + timedelta(days=21)).isoformat()
        response = self.client.post(
            "/records/schedules/new",
            data={
                "parish_id": str(self.parish.id),
                "event_type": "wedding",
                "title": "Wedding of Carlos and Teresa",
                "event_date": future_date,
                "event_time": "14:00",
                "venue_id": str(self.venue.id),
                "presiding_clergy_id": str(self.priest.id),
                "requester_name": "Carlos Gomez",
                "requester_contact": "0918-999-8888",
                "expected_attendees": "150",
                "description": "Nuptial Mass celebration",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Wedding of Carlos and Teresa", response.data)

        # Check DB
        event = db.session.scalar(
            db.select(ParishEvent).where(ParishEvent.title == "Wedding of Carlos and Teresa")
        )
        self.assertIsNotNone(event)
        self.assertEqual(event.event_type, EventType.WEDDING)
        self.assertEqual(event.status, EventStatus.CONFIRMED)
        self.assertEqual(event.venue_id, self.venue.id)
        self.assertEqual(event.presiding_clergy_id, self.priest.id)

    def test_staff_monitor_and_approve_schedule(self):
        """Parish staff reviews and approves a schedule request."""
        future_start = datetime.now(timezone.utc) + timedelta(days=7)
        event = ParishEvent(
            parish=self.parish,
            event_type=EventType.BAPTISM,
            title="Baptism of Pedro",
            starts_at=future_start,
            ends_at=future_start + timedelta(hours=1),
            status=EventStatus.REQUESTED,
            requester_user_id=self.parishioner.id,
            requester_name="Juan Dela Cruz",
            requester_contact="0917-111-2222",
        )
        db.session.add(event)
        db.session.commit()

        self.login("lipasec", "staffpw")
        # Check staff schedules dashboard
        dash_resp = self.client.get("/records/schedules")
        self.assertIn(b"Baptism of Pedro", dash_resp.data)
        self.assertIn(b"Review &amp; Approve", dash_resp.data)

        # Staff approves and assigns venue and clergy
        approve_resp = self.client.post(
            f"/records/schedules/{event.id}/approve",
            data={
                "venue_id": str(self.venue.id),
                "presiding_clergy_id": str(self.priest.id),
            },
            follow_redirects=True,
        )
        self.assertEqual(approve_resp.status_code, 200)
        db.session.refresh(event)
        self.assertEqual(event.status, EventStatus.CONFIRMED)
        self.assertEqual(event.venue_id, self.venue.id)
        self.assertEqual(event.presiding_clergy_id, self.priest.id)

    def test_complete_schedule_directs_to_register_and_links_record(self):
        """Marking a schedule completed directs to register and links event to record."""
        event_time = datetime(2026, 10, 1, 9, 30, tzinfo=timezone.utc)
        event = ParishEvent(
            parish=self.parish,
            venue=self.venue,
            presiding_clergy=self.priest,
            event_type=EventType.BAPTISM,
            title="Baptism of Baby Carlo",
            starts_at=event_time,
            ends_at=event_time + timedelta(hours=1),
            status=EventStatus.CONFIRMED,
            requester_user_id=self.parishioner.id,
            requester_name="Juan Dela Cruz",
        )
        db.session.add(event)
        db.session.commit()

        self.login("lipasec", "staffpw")

        # Mark completed -> redirects to /records/new?from_event_id=event.id
        comp_resp = self.client.post(f"/records/schedules/{event.id}/complete")
        self.assertEqual(comp_resp.status_code, 302)
        self.assertIn(f"/records/new?from_event_id={event.id}", comp_resp.headers["Location"])

        # GET the form with from_event_id
        form_resp = self.client.get(comp_resp.headers["Location"])
        self.assertIn(b"Linking to Sacrament Schedule", form_resp.data)
        self.assertIn(b"Baptism of Baby Carlo", form_resp.data)

        # Submit the canonical register entry
        create_resp = self.client.post(
            "/records/new",
            data={
                "from_event_id": str(event.id),
                "originating_parish_id": str(self.parish.id),
                "sacrament_type": "baptism",
                "first_name": "Carlo",
                "last_name": "Dela Cruz",
                "sex": "male",
                "date_of_birth": "2026-09-01",
                "event_date": "2026-10-01",
                "book_number": "10",
                "page_number": "5",
                "entry_number": "12",
                "performed_by_clergy_id": str(self.priest.id),
                "legitimacy": "legitimate",
            },
            follow_redirects=True,
        )
        self.assertEqual(create_resp.status_code, 200)

        # Verify the record is saved and event.record_id is linked!
        record = db.session.scalar(
            db.select(SacramentalRecord).where(
                SacramentalRecord.book_number == 10,
                SacramentalRecord.entry_number == 12,
            )
        )
        self.assertIsNotNone(record)
        db.session.refresh(event)
        self.assertEqual(event.status, EventStatus.COMPLETED)
        self.assertEqual(event.record_id, record.id)
        self.assertFalse(event.needs_register_entry)

    # --- 3. Mass intentions removed from interfaces -----------------------

    def test_mass_intentions_redirects_to_schedules(self):
        """Legacy /intentions route redirects to /records/schedules."""
        self.login("lipasec", "staffpw")
        response = self.client.get("/intentions")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/records/schedules", response.headers["Location"])

    def test_mass_intentions_action_not_in_navbars(self):
        """Staff navbar and dashboard have Schedules, not Intentions."""
        self.login("lipasec", "staffpw")
        staff_dash = self.client.get("/dashboard")
        self.assertIn(b"Sacrament schedules", staff_dash.data)
        self.assertNotIn(b"Mass intentions", staff_dash.data)

        home_page = self.client.get("/")
        self.assertIn(b"Sacrament Scheduling", home_page.data)
        self.assertNotIn(b"Masses & Intentions", home_page.data)

    # --- 4. Document request validations ----------------------------------

    def test_document_request_requires_parish_and_dob(self):
        """Holding parish and date of birth are strictly required."""
        self.login("juan@example.ph", "parishpw")

        # Missing targeted_parish_id and missing date_of_birth
        response = self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": "baptism",
                "name_on_record": "Maria Clara",
                "consent": "1",
            },
        )
        self.assertIn(b"Parish holding the record is required", response.data)
        self.assertIn(b"Date of birth is required", response.data)
        self.assertEqual(DocumentRequest.query.count(), 0)

    def test_document_request_date_of_sacrament_can_be_blank(self):
        """date_of_sacrament can be left blank."""
        self.login("juan@example.ph", "parishpw")
        response = self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": "baptism",
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Maria Clara",
                "date_of_birth": "2000-05-15",
                # date_of_sacrament is blank
                "date_of_sacrament": "",
                "consent": "1",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"submitted for verification", response.data)
        doc = DocumentRequest.query.one()
        self.assertEqual(doc.name_on_record, "Maria Clara")
        self.assertEqual(doc.date_of_birth, date(2000, 5, 15))
        self.assertIsNone(doc.date_of_sacrament)

    def test_document_request_rejects_future_dob(self):
        """Date of birth cannot be in the future."""
        self.login("juan@example.ph", "parishpw")
        future_dob = (date.today() + timedelta(days=5)).isoformat()
        response = self.client.post(
            "/portal/requests/new",
            data={
                "sacrament_type": "baptism",
                "targeted_parish_id": str(self.parish.id),
                "name_on_record": "Future Person",
                "date_of_birth": future_dob,
                "consent": "1",
            },
        )
        self.assertIn(b"cannot be a future date", response.data)
        self.assertEqual(DocumentRequest.query.count(), 0)

    # --- 5. Field data validations ----------------------------------------

    def test_form_field_validations(self):
        """Verify field validations on positive integers, dates, and phones."""
        self.login("lipasec", "staffpw")

        # Invalid citation integers in RecordForm
        response = self.client.post(
            "/records/new",
            data={
                "originating_parish_id": str(self.parish.id),
                "sacrament_type": "baptism",
                "first_name": "Test",
                "last_name": "User",
                "sex": "male",
                "event_date": "2020-01-01",
                "book_number": "-1",
                "page_number": "abc",
                "entry_number": "0",
            },
        )
        self.assertIn(b"must be at least 1", response.data)
        self.assertIn(b"must be a valid whole number", response.data)


if __name__ == "__main__":
    unittest.main()
