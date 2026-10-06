"""Tests for the staff certificate and document requests view and actions."""

import re
from datetime import date
from rcal import create_app
from rcal.models import DocumentRequest, User, SacramentalRecord
from rcal.models.enums import SacramentType, DocumentRequestStatus, RequestStatus
from rcal.extensions import db


def test_certificates_view_and_actions():
    app = create_app("development")
    with app.test_client() as client:
        # 1. GET /login and extract csrf_token
        resp = client.get("/login")
        match = re.search(r'name="csrf_token" value="([^"]+)"', resp.data.decode("utf-8"))
        csrf_token = match.group(1) if match else ""

        # 2. POST /login with parish1 credentials
        post_resp = client.post(
            "/login",
            data={
                "identifier": "parish1",
                "password": "parishpw",
                "csrf_token": csrf_token,
            },
            follow_redirects=True,
        )
        assert post_resp.status_code == 200

        # 3. GET /certificates
        cert_resp = client.get("/certificates")
        assert cert_resp.status_code == 200
        html = cert_resp.data.decode("utf-8")

        # Verify parishioner document requests show up
        assert "RCAL-DR-00003" in html
        assert "RCAL-DR-00002" in html
        assert "RCAL-DR-00001" in html
        assert "Juan Dela Cruz" in html

        # Verify tabs exist
        assert "All Requests" in html
        assert "Parishioner Requests" in html
        assert "Internal Queue" in html

        # 4. Create a test DocumentRequest in database to test the full matching & approval lifecycle
        with app.app_context():
            parishioner = db.session.query(User).filter_by(username="juan@example.ph").first()
            test_doc = DocumentRequest(
                parishioner=parishioner,
                sacrament_type=SacramentType.BAPTISM,
                name_on_record="Maria Test Dela Cruz",
                date_of_birth=date(1995, 5, 5),
                status=DocumentRequestStatus.SUBMITTED,
            )
            db.session.add(test_doc)
            db.session.commit()
            test_doc_id = test_doc.id
            record = db.session.query(SacramentalRecord).filter_by(sacrament_type=SacramentType.BAPTISM).first()
            record_id = record.id

        # 5. Parish staff views the new document request detail
        detail_resp = client.get(f"/certificates/parishioner-requests/{test_doc_id}")
        assert detail_resp.status_code == 200
        d_html = detail_resp.data.decode("utf-8")
        assert "Maria Test Dela Cruz" in d_html
        assert "MATCH &amp; CREATE CERTIFICATE REQUEST" in d_html

        # Extract csrf token from detail page
        match_csrf = re.search(r'name="csrf_token" value="([^"]+)"', d_html)
        detail_csrf = match_csrf.group(1) if match_csrf else csrf_token

        # 6. Parish staff matches the request to a register entry
        match_resp = client.post(
            f"/certificates/parishioner-requests/{test_doc_id}/match",
            data={
                "record_id": str(record_id),
                "internal_note": "Verified by parish staff",
                "csrf_token": detail_csrf,
            },
            follow_redirects=True,
        )
        assert match_resp.status_code == 200
        matched_html = match_resp.data.decode("utf-8")
        assert "Certificate request #" in matched_html

        with app.app_context():
            updated_doc = db.session.get(DocumentRequest, test_doc_id)
            assert updated_doc.status == DocumentRequestStatus.PROCESSING
            cert_req_id = updated_doc.certificate_request_id
            assert cert_req_id is not None

        # 7. Check that parish staff sees the APPROVE button (once verified)
        # First verify
        client.post(
            f"/certificates/{cert_req_id}/verify",
            data={"csrf_token": detail_csrf},
            follow_redirects=True,
        )

        cert_detail = client.get(f"/certificates/{cert_req_id}")
        assert cert_detail.status_code == 200
        c_html = cert_detail.data.decode("utf-8")
        # Check that parish staff can approve (APPROVE FOR ISSUE button must be present!)
        assert "APPROVE FOR ISSUE" in c_html, "APPROVE FOR ISSUE button missing for parish staff!"
        assert "CANCEL" in c_html, "CANCEL button missing for parish staff!"

        # 8. Parish staff performs APPROVE (Previously this failed with 403 Forbidden!)
        approve_resp = client.post(
            f"/certificates/{cert_req_id}/approve",
            data={"csrf_token": detail_csrf},
            follow_redirects=True,
        )
        assert approve_resp.status_code == 200
        app_html = approve_resp.data.decode("utf-8")
        assert "ISSUE CERTIFICATE" in app_html

        # 9. Parish staff issues the certificate
        issue_resp = client.post(
            f"/certificates/{cert_req_id}/issue",
            data={"csrf_token": detail_csrf},
            follow_redirects=True,
        )
        assert issue_resp.status_code == 200
        iss_html = issue_resp.data.decode("utf-8")
        assert "VIEW CERTIFICATE" in iss_html

        with app.app_context():
            final_doc = db.session.get(DocumentRequest, test_doc_id)
            assert final_doc.status == DocumentRequestStatus.COMPLETED

        print("ALL ACTIONS PASSED: Parish staff can match, verify, approve, and issue requests successfully!")


if __name__ == "__main__":
    test_certificates_view_and_actions()
