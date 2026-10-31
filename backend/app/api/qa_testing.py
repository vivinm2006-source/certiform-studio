import os
import sys
import time
import asyncio
import threading
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from qa.config import DEFAULT_LOCAL_URL, LOAD_STAGES, ACCEPTANCE_CRITERIA
from qa.autonomous_qa_agent import AutonomousQAAgent

router = APIRouter(prefix="/qa", tags=["Autonomous QA & Load Testing"])

class QARunRequest(BaseModel):
    mode: str = "smoke" # "smoke", "load", "full", "quick"
    vus: int = 1000
    target_url: Optional[str] = None

LATEST_QA_STATE: Dict[str, Any] = {
    "status": "idle",
    "mode": None,
    "start_time": None,
    "end_time": None,
    "duration_sec": 0,
    "smoke_results": None,
    "load_results": [],
    "acceptance_passed": True,
    "summary": "Ready to execute autonomous QA & load testing.",
    "defect_analysis": None
}

def _run_qa_background_thread(mode: str, vus: int, target_url: str):
    """Run autonomous QA in isolated background thread with its own event loop."""
    global LATEST_QA_STATE
    LATEST_QA_STATE["status"] = "running"
    LATEST_QA_STATE["mode"] = mode
    LATEST_QA_STATE["start_time"] = time.time()
    LATEST_QA_STATE["load_results"] = []
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    agent = AutonomousQAAgent(target_url=target_url)
    
    try:
        if mode == "smoke":
            res = loop.run_until_complete(agent.run_smoke_tests())
            LATEST_QA_STATE["smoke_results"] = res
            LATEST_QA_STATE["acceptance_passed"] = bool(res.get("suite_passed"))
            LATEST_QA_STATE["summary"] = f"Smoke tests completed: {res.get('passed')}/{res.get('total_endpoints')} passed."
            
        elif mode == "load":
            stages = [s for s in LOAD_STAGES if s["vus"] <= vus]
            res = loop.run_until_complete(agent.run_load_stages(stages))
            LATEST_QA_STATE["load_results"] = res
            all_passed = all(s.get("passed_acceptance_criteria") for s in res)
            LATEST_QA_STATE["acceptance_passed"] = all_passed
            LATEST_QA_STATE["summary"] = f"Load testing completed across {len(res)} stages up to {vus} VUs. Passed SLA: {all_passed}."
            
        elif mode == "full":
            res = loop.run_until_complete(agent.execute_full_autonomous_qa())
            LATEST_QA_STATE["smoke_results"] = res.get("smoke_suite")
            LATEST_QA_STATE["load_results"] = res.get("load_suite", [])
            LATEST_QA_STATE["defect_analysis"] = res.get("defect_analysis")
            LATEST_QA_STATE["acceptance_passed"] = bool(res.get("acceptance_criteria_met"))
            LATEST_QA_STATE["summary"] = f"Full autonomous QA completed. All acceptance criteria met: {res.get('acceptance_criteria_met')}."
            
        LATEST_QA_STATE["status"] = "completed"
    except Exception as e:
        LATEST_QA_STATE["status"] = "failed"
        LATEST_QA_STATE["summary"] = f"Error during test execution: {str(e)}"
    finally:
        LATEST_QA_STATE["end_time"] = time.time()
        LATEST_QA_STATE["duration_sec"] = round(LATEST_QA_STATE["end_time"] - LATEST_QA_STATE["start_time"], 2)
        loop.close()

@router.get("/status")
def get_qa_status():
    """Retrieve live status, metrics, and report of the autonomous QA agent."""
    return LATEST_QA_STATE

@router.post("/run-tests")
def trigger_qa_tests(payload: QARunRequest):
    """Trigger autonomous smoke, load, or full regression test suite."""
    global LATEST_QA_STATE
    if LATEST_QA_STATE["status"] == "running":
        return {
            "status": "already_running",
            "message": "QA test suite is already executing in background.",
            "current_state": LATEST_QA_STATE
        }
        
    target = payload.target_url or DEFAULT_LOCAL_URL
    t = threading.Thread(
        target=_run_qa_background_thread,
        args=(payload.mode, payload.vus, target),
        daemon=True
    )
    t.start()
    
    return {
        "status": "started",
        "mode": payload.mode,
        "max_vus": payload.vus,
        "target_url": target,
        "message": f"Autonomous QA suite started in '{payload.mode}' mode."
    }

@router.post("/quick-verify")
def run_quick_verification():
    """Fast synchronous verification of all critical components and return scorecard."""
    t0 = time.perf_counter()
    checklist = []
    
    # 1. Test ReportLab vector PDF with Gemini watermark
    try:
        from app.engine.pdf_renderer import render_certificate_pdf
        pdf_b = render_certificate_pdf(
            {"width_pt": 841.89, "height_pt": 595.28, "background_color": "#FFFFFF"},
            [{"element_type": "dynamic_text", "content": "Test Recipient", "binding_key": "recipient_name", "font_family": "Times", "font_size": 28, "x": 0.1, "y": 0.4, "width": 0.8, "height": 0.1, "layer_order": 0, "is_visible": True}],
            {"recipient_name": "Sree Sukanth"},
            watermark="GEMINI"
        )
        pdf_ok = len(pdf_b) > 2000 and pdf_b.startswith(b"%PDF")
        checklist.append({"component": "Vector PDF Engine + Gemini Watermark", "status": "PASSED" if pdf_ok else "FAILED", "size_bytes": len(pdf_b)})
    except Exception as e:
        checklist.append({"component": "Vector PDF Engine", "status": "FAILED", "error": str(e)})

    # 2. Test Pillow PNG with Gemini watermark
    try:
        from app.engine.image_renderer import render_certificate_image
        img = render_certificate_image(
            {"width_pt": 841.89, "height_pt": 595.28, "background_color": "#FFFFFF"},
            [{"element_type": "dynamic_text", "content": "Test Recipient", "binding_key": "recipient_name", "font_family": "Helvetica", "font_size": 28, "x": 0.1, "y": 0.4, "width": 0.8, "height": 0.1, "layer_order": 0, "is_visible": True}],
            {"recipient_name": "Sree Sukanth"},
            dpi=150,
            watermark="GEMINI"
        )
        checklist.append({"component": "High-Res PNG Engine + Gemini Watermark", "status": "PASSED", "dimensions": f"{img.width}x{img.height}"})
    except Exception as e:
        checklist.append({"component": "High-Res PNG Engine", "status": "FAILED", "error": str(e)})

    # 3. Test clean corrupted 's' & gap filling
    try:
        from app.services.recipient_service import clean_corrupted_s, auto_enhance_recipient_data
        test_s = clean_corrupted_s("3ree 3ukanth")
        enhanced, stats = auto_enhance_recipient_data({"recipient_name": "sree sukanth", "department": ""})
        passed_s = test_s == "Sree Sukanth" and enhanced.get("recipient_name") == "Sree Sukanth" and enhanced.get("event_name") is not None
        checklist.append({"component": "Auto-Enhancing & Letter 's' Sanitation", "status": "PASSED" if passed_s else "FAILED", "result": test_s})
    except Exception as e:
        checklist.append({"component": "Auto-Enhancing & Letter 's' Sanitation", "status": "FAILED", "error": str(e)})

    dur_ms = round((time.perf_counter() - t0) * 1000, 2)
    all_passed = all(item["status"] == "PASSED" for item in checklist)
    
    return {
        "success": all_passed,
        "duration_ms": dur_ms,
        "scorecard": checklist,
        "health_score": 100 if all_passed else 0,
        "watermark_active": True
    }
