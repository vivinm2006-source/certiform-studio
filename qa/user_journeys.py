"""
Realistic virtual user journeys simulating real CertiForm Studio interactions.
"""
import time
import random
from typing import Dict, Any, List, Optional
import httpx
from qa.data_generator import generate_participant_record, create_sample_artwork_data_url

DEFAULT_PROJECT_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TPL_ID = "00000000-0000-0000-0000-000000000011"

async def execute_designer_journey(client: httpx.AsyncClient, base_url: str, user_id: int) -> List[Dict[str, Any]]:
    """Persona 1: Certificate Designer / Studio Canvas Editor."""
    metrics = []
    
    # 1. Load project workspace
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/projects")
    t1 = time.perf_counter()
    metrics.append({
        "action": "designer_load_projects",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200,
        "user_id": user_id
    })
    
    # 2. Load templates
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/projects/{DEFAULT_PROJECT_ID}/templates")
    t1 = time.perf_counter()
    metrics.append({
        "action": "designer_list_templates",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200,
        "user_id": user_id
    })
    
    # 3. Live Canvas Preview Rendering (Vector elements & typography)
    participant = generate_participant_record(user_id)
    preview_payload = {
        "template": {
            "width_pt": 841.89,
            "height_pt": 595.28,
            "background_color": "#FBF9F5"
        },
        "elements": [
            {
                "element_type": "dynamic_text",
                "content": participant["Student Name"],
                "binding_key": "recipient_name",
                "font_family": "Playfair Display",
                "font_size": 38,
                "font_weight": "bold",
                "x": 0.1, "y": 0.35, "width": 0.8, "height": 0.1,
                "auto_fit_text": True,
                "layer_order": 0
            },
            {
                "element_type": "dynamic_text",
                "content": participant["Department"],
                "binding_key": "department",
                "font_family": "Montserrat",
                "font_size": 14,
                "x": 0.1, "y": 0.48, "width": 0.8, "height": 0.05,
                "layer_order": 1
            }
        ],
        "recipient_data": {
            "recipient_name": participant["Student Name"],
            "department": participant["Department"],
            "dob": participant["Date of Birth"],
            "event_name": participant["Event Name"]
        },
        "format": "png",
        "credential_id": f"VU-{user_id:04d}"
    }
    
    t0 = time.perf_counter()
    resp = await client.post(f"{base_url}/api/v1/render/preview", json=preview_payload)
    t1 = time.perf_counter()
    metrics.append({
        "action": "designer_render_preview_png",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200 and "data_url" in resp.json(),
        "user_id": user_id
    })
    
    # 4. Canvas Batch Elements Auto-Save Sync (Periodic auto-save on edit)
    if user_id % 3 == 0:
        t0 = time.perf_counter()
        resp = await client.put(f"{base_url}/api/v1/templates/{DEFAULT_TPL_ID}/elements/batch", json=preview_payload["elements"])
        t1 = time.perf_counter()
        metrics.append({
            "action": "designer_sync_canvas_elements",
            "duration_ms": (t1 - t0) * 1000,
            "status_code": resp.status_code,
            "success": resp.status_code == 200,
            "user_id": user_id
        })
    
    return metrics

async def execute_intake_journey(client: httpx.AsyncClient, base_url: str, user_id: int) -> List[Dict[str, Any]]:
    """Persona 2: Roster Coordinator / Excel Intake Officer."""
    metrics = []
    
    # 1. Browse and search recipients
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/projects/{DEFAULT_PROJECT_ID}/recipients?page=1&page_size=20")
    t1 = time.perf_counter()
    metrics.append({
        "action": "intake_list_recipients",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200,
        "user_id": user_id
    })
    
    # 2. Filter / search recipients
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/projects/{DEFAULT_PROJECT_ID}/recipients?search=Engineering&page=1&page_size=10")
    t1 = time.perf_counter()
    metrics.append({
        "action": "intake_search_recipients",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200,
        "user_id": user_id
    })
    
    # 3. Batch recipient import (Periodic intake roster upload)
    if user_id % 3 == 0:
        sample_rows = [generate_participant_record(user_id * 10 + i) for i in range(3)]
        import_payload = {
            "rows": sample_rows,
            "column_mapping": {
                "Student Name": "recipient_name",
                "Department": "department",
                "Date of Birth": "dob"
            },
            "clear_existing": False
        }
        t0 = time.perf_counter()
        resp = await client.post(f"{base_url}/api/v1/projects/{DEFAULT_PROJECT_ID}/recipients/import", json=import_payload)
        t1 = time.perf_counter()
        metrics.append({
            "action": "intake_import_recipients",
            "duration_ms": (t1 - t0) * 1000,
            "status_code": resp.status_code,
            "success": resp.status_code == 200 and resp.json().get("success") is True,
            "user_id": user_id
        })
    
    return metrics

async def execute_issuance_exporter_journey(client: httpx.AsyncClient, base_url: str, user_id: int) -> List[Dict[str, Any]]:
    """Persona 3: Certificate Issuance & Export Officer."""
    metrics = []
    participant = generate_participant_record(user_id)
    
    # 1. High-fidelity Vector PDF Render via Preview
    pdf_payload = {
        "template": {
            "width_pt": 841.89,
            "height_pt": 595.28,
            "background_color": "#FBF9F5"
        },
        "elements": [
            {
                "element_type": "dynamic_text",
                "content": participant["Student Name"],
                "binding_key": "recipient_name",
                "font_family": "Playfair Display",
                "font_size": 38,
                "font_weight": "bold",
                "x": 0.1, "y": 0.35, "width": 0.8, "height": 0.1,
                "auto_fit_text": True,
                "layer_order": 0
            }
        ],
        "recipient_data": {
            "recipient_name": participant["Student Name"],
            "department": participant["Department"],
            "dob": participant["Date of Birth"],
            "event_name": participant["Event Name"]
        },
        "format": "pdf",
        "credential_id": f"VU-{user_id:04d}"
    }
    
    t0 = time.perf_counter()
    resp = await client.post(f"{base_url}/api/v1/render/preview", json=pdf_payload)
    t1 = time.perf_counter()
    is_valid_pdf = resp.status_code == 200 and resp.content.startswith(b"%PDF-")
    metrics.append({
        "action": "issuance_render_vector_pdf",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": is_valid_pdf,
        "user_id": user_id
    })
    
    # 2. Single Recipient Direct PDF Export
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/recipients/default/export-pdf?template_id={DEFAULT_TPL_ID}")
    t1 = time.perf_counter()
    is_valid_export = resp.status_code == 200 and resp.content.startswith(b"%PDF-")
    metrics.append({
        "action": "issuance_export_recipient_pdf",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": is_valid_export,
        "user_id": user_id
    })
    
    return metrics

async def execute_instant_and_verify_journey(client: httpx.AsyncClient, base_url: str, user_id: int) -> List[Dict[str, Any]]:
    """Persona 4 & 5: Instant Certificate Generation & Public Verification."""
    metrics = []
    participant = generate_participant_record(user_id)
    
    # 1. Public Credential Verification Lookup
    lookup_id = f"CERT-VU-{user_id:04d}"
    t0 = time.perf_counter()
    resp = await client.get(f"{base_url}/api/v1/public/verify/{lookup_id}")
    t1 = time.perf_counter()
    metrics.append({
        "action": "verification_lookup",
        "duration_ms": (t1 - t0) * 1000,
        "status_code": resp.status_code,
        "success": resp.status_code == 200,
        "user_id": user_id
    })
    
    # 2. Instant recipient creation (Periodic on-demand issuance)
    if user_id % 3 == 0:
        t0 = time.perf_counter()
        resp = await client.post(f"{base_url}/api/v1/projects/{DEFAULT_PROJECT_ID}/recipients", json={
            "data": {
                "recipient_name": participant["Student Name"],
                "department": participant["Department"],
                "dob": participant["Date of Birth"],
                "event_name": participant["Event Name"],
                "institution": participant["Institution"]
            },
            "source": "manual",
            "status": "valid"
        })
        t1 = time.perf_counter()
        rec_id = None
        if resp.status_code == 200:
            rec_id = resp.json().get("id")
            
        metrics.append({
            "action": "instant_create_certificate",
            "duration_ms": (t1 - t0) * 1000,
            "status_code": resp.status_code,
            "success": resp.status_code == 200 and rec_id is not None,
            "user_id": user_id
        })
    
    return metrics

async def run_virtual_user_journey(client: httpx.AsyncClient, base_url: str, user_id: int) -> List[Dict[str, Any]]:
    """Execute a realistic user journey based on randomized user persona."""
    journey_selector = user_id % 4
    if journey_selector == 0:
        return await execute_designer_journey(client, base_url, user_id)
    elif journey_selector == 1:
        return await execute_intake_journey(client, base_url, user_id)
    elif journey_selector == 2:
        return await execute_issuance_exporter_journey(client, base_url, user_id)
    else:
        return await execute_instant_and_verify_journey(client, base_url, user_id)
