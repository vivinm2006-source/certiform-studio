import pytest
import io
import os
import time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
import app.services.issuance_service as issuance_module
from app.services.project_service import create_default_project
from app.engine.image_renderer import render_certificate_image
from app.engine.pdf_renderer import render_certificate_pdf
from app.engine.preflight import PreflightChecker

TEST_DB_FILE = "test_certiform.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_FILE}"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DB_FILE):
        try: os.remove(TEST_DB_FILE)
        except Exception: pass
    Base.metadata.create_all(bind=test_engine)
    # Monkey-patch SessionLocal in issuance service for background thread
    issuance_module.SessionLocal = TestingSessionLocal
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_FILE):
        try: os.remove(TEST_DB_FILE)
        except Exception: pass

@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# --- Test A: Visual Precision (ReportLab PDF & Pillow PNG) ---
def test_rendering_precision():
    template = {
        "width_pt": 841.89,
        "height_pt": 595.28,
        "background_color": "#FDFBF7"
    }
    elements = [
        {
            "id": "el-1",
            "element_type": "dynamic_text",
            "binding_key": "recipient_name",
            "x": 0.1, "y": 0.3, "width": 0.8, "height": 0.1,
            "font_family": "Times", "font_size": 36.0, "font_weight": "bold",
            "color": "#0F2841", "text_align": "center", "auto_fit_text": True,
            "layer_order": 1, "is_visible": True
        },
        {
            "id": "el-2",
            "element_type": "qr_code",
            "x": 0.45, "y": 0.7, "width": 0.1, "height": 0.14,
            "layer_order": 2, "is_visible": True
        }
    ]
    recipient_data = {"recipient_name": "Dr. Ananya Kumar"}
    
    # 1. Test Pillow high-res PNG export
    img = render_certificate_image(template, elements, recipient_data, credential_id="CERT-TEST-001", dpi=150)
    assert img.width > 1000
    assert img.height > 800
    
    # 2. Test ReportLab vector PDF export
    pdf_bytes = render_certificate_pdf(template, elements, recipient_data, credential_id="CERT-TEST-001")
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 2000

# --- Test B & C: Inline Editing & Spreadsheet Synchronization ---
def test_inline_editing_and_synchronization(client, db_session):
    proj = create_default_project(db_session, title="Sync Test Project")
    
    # Get recipients
    resp = client.get(f"/api/v1/projects/{proj.id}/recipients")
    assert resp.status_code == 200
    recipients = resp.json()["items"]
    assert len(recipients) > 0
    
    first_rec = recipients[0]
    rec_id = first_rec["id"]
    
    # Edit inline
    updated_name = "Ananya K. Ph.D."
    patch_resp = client.patch(f"/api/v1/recipients/{rec_id}", json={
        "data": {"recipient_name": updated_name}
    })
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["recipient_name"] == updated_name
    
    # Check that another recipient's data remained completely unaffected
    second_rec = recipients[1]
    second_resp = client.get(f"/api/v1/projects/{proj.id}/recipients")
    items = second_resp.json()["items"]
    assert items[1]["data"]["recipient_name"] == second_rec["data"]["recipient_name"]

# --- Test E & I: Batch Export, Consolidated PDF & Retry Idempotency ---
def test_batch_export_and_idempotency(client, db_session):
    proj = create_default_project(db_session, title="Batch Issuance Project")
    
    # 1. Trigger batch issuance job for consolidated multi-page PDF
    job_resp = client.post(f"/api/v1/projects/{proj.id}/issuance/jobs", json={
        "output_mode": "consolidated_pdf"
    })
    assert job_resp.status_code == 200
    job_data = job_resp.json()
    job_id = job_data["id"]
    
    # Poll job until completed
    for _ in range(30):
        status_resp = client.get(f"/api/v1/issuance/jobs/{job_id}")
        if status_resp.json()["status"] in ("completed", "failed"):
            break
        time.sleep(0.3)
        
    final_job = client.get(f"/api/v1/issuance/jobs/{job_id}").json()
    assert final_job["status"] == "completed"
    assert final_job["completed_count"] >= 5
    assert final_job["artifact_url"] is not None
    
    # 2. Test Idempotency: re-running issuance must not create duplicate active credentials
    client.post(f"/api/v1/projects/{proj.id}/issuance/jobs", json={
        "output_mode": "consolidated_pdf"
    })
    creds_resp = client.get(f"/api/v1/projects/{proj.id}/credentials")
    assert creds_resp.status_code == 200
    assert len(creds_resp.json()) == 5

# --- Test F: Signature Security ---
def test_signature_management(client):
    resp = client.get("/api/v1/signatures")
    assert resp.status_code == 200
    sigs = resp.json()
    assert len(sigs) >= 2
    for s in sigs:
        assert s["authorization_status"] == "authorized"
        assert s["signer_name"] is not None

# --- Test G & H: QR Verification & Controlled Reissuance ---
def test_qr_verification_and_reissuance(client, db_session):
    proj = create_default_project(db_session, title="Verification Test")
    
    from app.models import Credential, Recipient
    rec = db_session.query(Recipient).filter_by(project_id=proj.id).first()
    cred_id = "CERT-2026-999001"
    
    cred = Credential(
        credential_id=cred_id,
        project_id=proj.id,
        recipient_id=rec.id,
        issued_data_snapshot={"recipient_name": "Carlos Gomez", "event_name": "Global AI Summit 2026"},
        credential_status="valid",
        verification_url=f"http://localhost:5173/verify/{cred_id}"
    )
    db_session.add(cred)
    db_session.commit()
    
    # 1. Public Verification Check
    v_resp = client.get(f"/api/v1/public/verify/{cred_id}")
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["status"] == "valid"
    assert v_data["recipient_name"] == "Carlos Gomez"
    
    # 2. Revoke Credential
    revoke_resp = client.post(f"/api/v1/credentials/{cred_id}/revoke", json={
        "reason": "Name spelling error reported by attendee"
    })
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["credential_status"] == "revoked"
    
    # 3. Public Verification after revocation
    v_revoked = client.get(f"/api/v1/public/verify/{cred_id}").json()
    assert v_revoked["status"] == "revoked"
    assert "Name spelling error" in v_revoked["revocation_reason"]
    
    # 4. Controlled Reissuance
    reissue_resp = client.post(f"/api/v1/credentials/{cred_id}/reissue", json={
        "updated_data": {"recipient_name": "Dr. Carlos Gomez-Perez", "event_name": "Global AI Summit 2026"},
        "reason": "Corrected attendee surname prefix"
    })
    assert reissue_resp.status_code == 200
    new_cred = reissue_resp.json()
    assert new_cred["credential_status"] == "valid"
    assert new_cred["replaced_credential_id"] == cred_id
    
    # Verify new credential resolves as valid
    new_v = client.get(f"/api/v1/public/verify/{new_cred['credential_id']}").json()
    assert new_v["status"] == "valid"
    assert new_v["recipient_name"] == "Dr. Carlos Gomez-Perez"

# --- Test J: Preflight & Overflow Detection ---
def test_preflight_overflow_and_margin_check():
    template = {"width_pt": 841.89, "height_pt": 595.28}
    elements = [
        {
            "id": "name-field",
            "element_type": "dynamic_text",
            "binding_key": "recipient_name",
            "x": 0.1, "y": 0.3, "width": 0.1, "height": 0.05,
            "font_family": "Helvetica", "font_size": 36.0,
            "auto_fit_text": False
        }
    ]
    recipients = [
        {"id": "1", "data": {"recipient_name": "A Very Long Professor Name That Will Definitely Overflow The Small Box"}}
    ]
    report = PreflightChecker.inspect(template, elements, recipients, required_binding_keys=["recipient_name"])
    assert report["passed"] is False
    overflow_issues = [i for i in report["issues"] if i["code"] == "text_overflow"]
    assert len(overflow_issues) > 0

# --- Test K: 5 New Template Presets ---
def test_new_template_presets(client, db_session):
    proj = create_default_project(db_session, title="Template Presets Project")
    templates = client.get(f"/api/v1/projects/{proj.id}/templates").json()
    t_id = templates[0]["id"]

    for preset_key in ["luxury_gold", "creative_workshop", "parchment_heritage", "stem_olympiad", "corporate_achievement"]:
        resp = client.post(f"/api/v1/templates/{t_id}/load-preset", json={"preset": preset_key})
        assert resp.status_code == 200
        tpl = resp.json()
        assert len(tpl["elements"]) >= 10
        # Verify signatory and name elements exist
        has_name = any(el.get("binding_key") == "recipient_name" for el in tpl["elements"])
        assert has_name, f"Preset {preset_key} missing recipient_name element"

# --- Test L: Vector SVG Asset Upload & PDF Integration ---
def test_svg_vector_upload_and_pdf(client, db_session):
    proj = create_default_project(db_session, title="SVG Vector Test Project")
    templates = client.get(f"/api/v1/projects/{proj.id}/templates").json()
    t_id = templates[0]["id"]

    sample_svg = b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="45" fill="#FEF3C7" stroke="#D97706" stroke-width="3"/>
      <polygon points="50,20 58,38 78,40 62,54 66,74 50,62 34,74 38,54 22,40 42,38" fill="#F59E0B"/>
      <text x="50" y="88" font-size="8" font-weight="bold" fill="#B45309" text-anchor="middle">HONOR</text>
    </svg>"""

    files = {"file": ("honor_seal.svg", sample_svg, "image/svg+xml")}
    res = client.post(f"/api/v1/templates/{t_id}/upload-element-asset", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "image/svg+xml" in data["asset_url"]

    # Test PDF generation with SVG element
    tpl_dict = {"width_pt": 841.89, "height_pt": 595.28}
    elements = [
        {
            "id": "svg-1",
            "element_type": "image",
            "asset_url": data["asset_url"],
            "x": 0.45, "y": 0.7, "width": 0.1, "height": 0.14,
            "layer_order": 1, "is_visible": True
        }
    ]
    pdf_b = render_certificate_pdf(tpl_dict, elements, {"recipient_name": "Test Candidate"})
    assert pdf_b.startswith(b"%PDF")
    assert len(pdf_b) > 1000

# --- Test M: Excel Space Normalization & Gap Filling ---
def test_excel_gap_filling_and_spaces(client, db_session):
    proj = create_default_project(db_session, title="Gap Filling Project")

    # Upload row with extra spaces and missing event fields
    raw_rows = [
        {"Student Name": "  Santhosh   Kumar  ", "Department": "  Artificial   Intelligence  "}
    ]
    mapping = {"Student Name": "recipient_name", "Department": "department"}

    import_resp = client.post(f"/api/v1/projects/{proj.id}/recipients/import", json={
        "rows": raw_rows,
        "column_mapping": mapping,
        "clear_existing": True
    })
    assert import_resp.status_code == 200

    # Trigger fill-gaps endpoint
    fill_resp = client.post(f"/api/v1/projects/{proj.id}/recipients/fill-gaps")
    assert fill_resp.status_code == 200

    rec_resp = client.get(f"/api/v1/projects/{proj.id}/recipients")
    rec = rec_resp.json()["items"][0]["data"]
    assert rec["recipient_name"] == "Santhosh Kumar"
    assert rec["department"] == "Artificial Intelligence"
    assert rec.get("event_name") is not None
    assert rec.get("event_date") is not None

# --- Test N: Direct 1-Click Consolidated Bulk PDF Endpoint ---
def test_direct_bulk_pdf_export(client, db_session):
    proj = create_default_project(db_session, title="Direct Bulk PDF Project")
    resp = client.get(f"/api/v1/projects/{proj.id}/export/bulk-pdf")
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/pdf"
    assert resp.content.startswith(b"%PDF")
    assert len(resp.content) > 5000
