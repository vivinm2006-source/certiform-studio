from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CertificateTemplate, CanvasElement, Project
from app.schemas import (
    CertificateTemplateCreate, CertificateTemplateUpdate, CertificateTemplateOut,
    CanvasElementCreate, CanvasElementUpdate, CanvasElementOut
)
from app.config import settings
import uuid
import shutil

router = APIRouter(tags=["Templates"])

def get_preset_template_data(preset_key: str, template_id: str) -> tuple[str, str, List[CanvasElement]]:
    """Returns (default_name, default_bg, elements_list) for a given preset."""
    if preset_key == "executive":
        name = "Modern Executive Diploma"
        bg_color = "#FFFFFF"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.04, y=0.05, width=0.92, height=0.90, border_color="#0F172A", border_width=2.0, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.04, y=0.065, width=0.92, height=0.005, border_color="#059669", border_width=3.0, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="GLOBAL LEADERSHIP INITIATIVE", font_family="Montserrat", font_size=11, font_weight="bold", color="#059669", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.11, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="static_text", content="EXECUTIVE CERTIFICATE", font_family="Montserrat", font_size=30, font_weight="bold", color="#0F172A", letter_spacing=2.0, uppercase=True, text_align="center", x=0.08, y=0.17, width=0.84, height=0.08, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="AWARDED TO", font_family="Montserrat", font_size=10, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.2, y=0.27, width=0.6, height=0.035, layer_order=4),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Montserrat", font_size=36, font_weight="bold", color="#0F172A", uppercase=True, text_align="center", auto_fit_text=True, x=0.08, y=0.32, width=0.84, height=0.10, layer_order=5),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.3, y=0.435, width=0.4, height=0.005, border_color="#059669", border_width=1.5, layer_order=6),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for strategic participation and mastery in {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=12, color="#334155", text_align="center", line_height=1.5, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=7),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=8),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=9),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nManaging Director", font_family="Montserrat", font_size=9.5, color="#475569", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=10),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=11),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nVerify at certiform.example/verify", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=12),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=13),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=14),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nExecutive Chair", font_family="Montserrat", font_size=9.5, color="#475569", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=15)
        ]
    elif preset_key == "tech":
        name = "Innovation & Tech Summit"
        bg_color = "#F8FAFC"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.03, y=0.04, width=0.94, height=0.92, border_color="#4338CA", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.03, y=0.055, width=0.94, height=0.006, border_color="#6366F1", border_width=3.0, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="GLOBAL TECHNOLOGY & AI INNOVATION FORUM", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#4338CA", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="static_text", content="CERTIFICATE OF EXCELLENCE", font_family="Montserrat", font_size=32, font_weight="bold", color="#0F172A", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.16, width=0.9, height=0.08, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="PRESENTED WITH DISTINCTION TO", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.26, width=0.7, height=0.035, layer_order=4),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Montserrat", font_size=38, font_weight="bold", color="#4338CA", text_align="center", auto_fit_text=True, x=0.08, y=0.31, width=0.84, height=0.11, layer_order=5),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.32, y=0.43, width=0.36, height=0.005, border_color="#6366F1", border_width=1.5, layer_order=6),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for exceptional technical mastery and outstanding project contributions\nto the {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=11.5, color="#334155", text_align="center", line_height=1.5, x=0.1, y=0.46, width=0.8, height=0.09, layer_order=7),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.11, y=0.64, width=0.24, height=0.07, layer_order=8),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.11, y=0.725, width=0.24, height=0.005, border_color="#CBD5E1", border_width=1.0, layer_order=9),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nChief Technology Officer", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.11, y=0.735, width=0.24, height=0.07, layer_order=10),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=11),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="HASH: {{certificate_id}}\nAuthenticated on Sovereign Ledger", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=12),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.65, y=0.64, width=0.24, height=0.07, layer_order=13),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.65, y=0.725, width=0.24, height=0.005, border_color="#CBD5E1", border_width=1.0, layer_order=14),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nHead of Engineering", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.65, y=0.735, width=0.24, height=0.07, layer_order=15)
        ]
    elif preset_key == "appreciation":
        name = "Certificate of Appreciation"
        bg_color = "#FFFDF7"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.04, y=0.05, width=0.92, height=0.90, border_color="#B45309", border_width=2.0, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.048, y=0.06, width=0.904, height=0.88, border_color="#D97706", border_width=1.0, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="DISTINGUISHED COMMUNITY & SERVICE HONORS", font_family="Montserrat", font_size=10, font_weight="bold", color="#B45309", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.11, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="static_text", content="CERTIFICATE OF APPRECIATION", font_family="Cinzel", font_size=30, font_weight="bold", color="#78350F", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="IN GRATEFUL RECOGNITION AND TRIBUTE TO", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#92400E", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=4),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Playfair Display", font_size=36, font_weight="bold", color="#78350F", text_align="center", auto_fit_text=True, x=0.08, y=0.32, width=0.84, height=0.10, layer_order=5),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.3, y=0.435, width=0.4, height=0.005, border_color="#D97706", border_width=1.5, layer_order=6),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for dedicated service, impactful contributions, and steadfast commitment\nto {{event_name}} on {{event_date}}.", font_family="Merriweather", font_size=11.5, color="#451A03", text_align="center", line_height=1.6, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=7),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#78350F", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=8),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#D97706", border_width=1.0, layer_order=9),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nExecutive Director", font_family="Montserrat", font_size=9, color="#92400E", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=10),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=11),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nOfficial Authenticity Verification", font_family="Montserrat", font_size=7.5, color="#92400E", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=12),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#78350F", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=13),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#D97706", border_width=1.0, layer_order=14),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nBoard President", font_family="Montserrat", font_size=9, color="#92400E", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=15)
        ]
    elif preset_key == "completion":
        name = "Certificate of Completion"
        bg_color = "#F0F9FF"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.04, y=0.05, width=0.92, height=0.90, border_color="#0369A1", border_width=2.0, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.04, y=0.065, width=0.92, height=0.005, border_color="#0284C7", border_width=3.0, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="PROFESSIONAL ACCREDITATION & CERTIFICATION", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#0284C7", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.11, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="static_text", content="CERTIFICATE OF COMPLETION", font_family="Montserrat", font_size=30, font_weight="bold", color="#0F172A", letter_spacing=2.0, uppercase=True, text_align="center", x=0.08, y=0.17, width=0.84, height=0.08, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="THIS DIPLOMA IS AWARDED TO", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.2, y=0.27, width=0.6, height=0.035, layer_order=4),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Playfair Display", font_size=36, font_weight="bold", color="#0369A1", text_align="center", auto_fit_text=True, x=0.08, y=0.32, width=0.84, height=0.10, layer_order=5),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.3, y=0.435, width=0.4, height=0.005, border_color="#0284C7", border_width=1.5, layer_order=6),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for successfully fulfilling all rigorous course requirements and examinations\nfor {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=11.5, color="#334155", text_align="center", line_height=1.5, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=7),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=8),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=9),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nChief Academic Officer", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=10),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=11),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nVerify at certiform.example/verify", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=12),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=13),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=14),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nLead Instructor", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=15)
        ]
    elif preset_key == "medical":
        name = "Medical & Clinical Fellowship"
        bg_color = "#F0FDFA"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.035, y=0.045, width=0.93, height=0.91, border_color="#0D9488", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.045, y=0.058, width=0.91, height=0.884, border_color="#14B8A6", border_width=1.0, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="INTERNATIONAL BOARD OF CLINICAL MEDICINE & HEALTH SCIENCES", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#0F766E", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.34, y=0.15, width=0.32, height=0.005, border_color="#0D9488", border_width=1.5, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="FELLOWSHIP & CLINICAL MASTERY", font_family="Cinzel", font_size=30, font_weight="bold", color="#115E59", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="THIS ACCREDITED FELLOWSHIP IS CONFERRED UPON", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#475569", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar, M.D.", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#0F766E", text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.435, width=0.40, height=0.005, border_color="#0D9488", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="in recognition of distinguished clinical acumen, surgical proficiency, and patient care excellence\nin {{event_name}} on {{event_date}}.", font_family="Merriweather", font_size=11.5, color="#334155", text_align="center", line_height=1.6, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Dr. Marcus Vance", font_family="Great Vibes", font_size=28, color="#115E59", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Dr. Marcus Vance, FACC\nChief Medical Officer", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="BOARD VERIFIED ID: {{certificate_id}}\nNational Registry of Medical Specialists", font_family="Montserrat", font_size=7.5, color="#0F766E", text_align="center", x=0.32, y=0.785, width=0.36, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Dr. Elena Rostova", font_family="Great Vibes", font_size=28, color="#115E59", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Prof. Elena Rostova, MD, PhD\nDean of Medical Sciences", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "cyber_hackathon":
        name = "AI Hackathon & Cyber Champion"
        bg_color = "#0B0F17"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.03, y=0.04, width=0.94, height=0.92, border_color="#6366F1", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.04, y=0.055, width=0.92, height=0.89, border_color="#06B6D4", border_width=1.0, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="GLOBAL ARTIFICIAL INTELLIGENCE & CYBERSECURITY INITIATIVE", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#06B6D4", letter_spacing=3.0, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.15, width=0.40, height=0.006, border_color="#6366F1", border_width=2.0, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="CHAMPIONSHIP & INNOVATION AWARD", font_family="Montserrat", font_size=30, font_weight="bold", color="#FFFFFF", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="FIRST-PLACE DISTINCTION CONFERRED UPON", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#94A3B8", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Montserrat", font_size=38, font_weight="bold", color="#38BDF8", text_align="center", uppercase=True, auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.32, y=0.435, width=0.36, height=0.006, border_color="#06B6D4", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for pioneering algorithmic innovation, high-scale neural systems architecture, and first-place honors\nin the {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=11.5, color="#CBD5E1", text_align="center", line_height=1.5, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#F8FAFC", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#475569", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nChief AI Architect", font_family="Montserrat", font_size=9, color="#94A3B8", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="CRYPTOGRAPHIC HASH: {{certificate_id}}\nAuthenticated on Sovereign Neural Network", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.30, y=0.785, width=0.40, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#F8FAFC", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#475569", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nHackathon Lead Judge", font_family="Montserrat", font_size=9, color="#94A3B8", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "corporate_leadership":
        name = "Corporate Leadership & Impact"
        bg_color = "#FFF1F2"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.035, y=0.045, width=0.93, height=0.91, border_color="#9F1239", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.045, y=0.058, width=0.91, height=0.884, border_color="#BE185D", border_width=1.0, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="GLOBAL EXECUTIVE FORUM & CORPORATE LEADERSHIP COUNCIL", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#9F1239", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.34, y=0.15, width=0.32, height=0.005, border_color="#BE185D", border_width=1.5, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="PRESIDENT'S LEADERSHIP AWARD", font_family="Cinzel", font_size=30, font_weight="bold", color="#881337", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="FOR VISIONARY STRATEGIC EXCELLENCE AND IMPACT", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#881337", text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.435, width=0.40, height=0.005, border_color="#BE185D", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="in recognition of outstanding organizational leadership, transformational vision, and measurable impact\nat {{event_name}} on {{event_date}}.", font_family="Merriweather", font_size=11.5, color="#4C0519", text_align="center", line_height=1.6, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#881337", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#BE185D", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nChief Executive Officer", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="VERIFIED CORPORATE CREDENTIAL: {{certificate_id}}\nGlobal Executive Registry", font_family="Montserrat", font_size=7.5, color="#9F1239", text_align="center", x=0.30, y=0.785, width=0.40, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#881337", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#BE185D", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nChairman of the Board", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "legal":
        name = "Jurisprudence & Legal Fellowship"
        bg_color = "#FFFDF5"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.035, y=0.045, width=0.93, height=0.91, border_color="#1E3A8A", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.045, y=0.058, width=0.91, height=0.884, border_color="#B45309", border_width=1.2, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="INTERNATIONAL BAR ALLIANCE & COUNCIL OF LEGAL JURISPRUDENCE", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#1E3A8A", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.34, y=0.15, width=0.32, height=0.005, border_color="#B45309", border_width=1.5, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="DIPLOMA OF LEGAL FELLOWSHIP", font_family="Cinzel", font_size=31, font_weight="bold", color="#1E3A8A", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="JUSTITIA ET VERITAS - CONFERRED ACCORDING TO LAW UPON", font_family="Montserrat", font_size=9, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar, Esq.", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#1E3A8A", text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.435, width=0.40, height=0.005, border_color="#B45309", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="having demonstrated distinguished mastery of constitutional jurisprudence and ethical advocacy\nduring the {{event_name}} on {{event_date}}.", font_family="Merriweather", font_size=11.5, color="#1E293B", text_align="center", line_height=1.6, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#1E3A8A", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#B45309", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="The Hon. Marcus Vance\nDean of Jurisprudence", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="BAR ROLL NUMBER: {{certificate_id}}\nOfficial Judicial Register of Counsel", font_family="Montserrat", font_size=7.5, color="#1E3A8A", text_align="center", x=0.32, y=0.785, width=0.36, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#1E3A8A", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#B45309", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova, KC\nPresident of the Bar Alliance", font_family="Montserrat", font_size=9, color="#475569", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "stem_research":
        name = "National STEM & Quantum Research"
        bg_color = "#F8FAFC"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.035, y=0.045, width=0.93, height=0.91, border_color="#1E293B", border_width=2.0, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.035, y=0.06, width=0.93, height=0.006, border_color="#2563EB", border_width=3.0, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="NATIONAL FOUNDATION FOR SCIENTIFIC & QUANTUM DISCOVERY", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#2563EB", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.34, y=0.15, width=0.32, height=0.005, border_color="#2563EB", border_width=1.5, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="SCIENTIFIC RESEARCH FELLOWSHIP", font_family="Montserrat", font_size=28, font_weight="bold", color="#0F172A", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="THIS FELLOWSHIP GRANT DIPLOMA IS ACCREDITED TO", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar, Ph.D.", binding_key="recipient_name", font_family="Montserrat", font_size=36, font_weight="bold", color="#1E40AF", uppercase=True, text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.435, width=0.40, height=0.005, border_color="#2563EB", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for groundbreaking peer-reviewed discoveries in advanced computational and quantum physics\npresented at {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=11.5, color="#334155", text_align="center", line_height=1.5, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#CBD5E1", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Dr. Marcus Vance, FRS\nDirector of Physical Sciences", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="GRANT ID: {{certificate_id}}\nNational Scientific Peer Review Database", font_family="Montserrat", font_size=7.5, color="#2563EB", text_align="center", x=0.30, y=0.785, width=0.40, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#0F172A", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#CBD5E1", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Prof. Elena Rostova, PhD\nChair of Scientific Peer Review", font_family="Montserrat", font_size=9, color="#64748B", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "sports":
        name = "Sports Championship & Gold Medalist"
        bg_color = "#FFF7ED"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.035, y=0.045, width=0.93, height=0.91, border_color="#991B1B", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.045, y=0.058, width=0.91, height=0.884, border_color="#F59E0B", border_width=1.5, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="FEDERATION OF INTERNATIONAL ATHLETIC EXCELLENCE", font_family="Montserrat", font_size=10.5, font_weight="bold", color="#991B1B", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.10, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.34, y=0.15, width=0.32, height=0.005, border_color="#F59E0B", border_width=2.0, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="CHAMPIONSHIP GOLD MEDALIST", font_family="Montserrat", font_size=32, font_weight="bold", color="#7F1D1D", letter_spacing=2.5, uppercase=True, text_align="center", x=0.05, y=0.17, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="AWARDED FOR EXTRAORDINARY ATHLETIC DISTINCTION TO", font_family="Montserrat", font_size=9.5, font_weight="normal", color="#B45309", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.27, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Montserrat", font_size=38, font_weight="bold", color="#991B1B", uppercase=True, text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.30, y=0.435, width=0.40, height=0.005, border_color="#F59E0B", border_width=2.0, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for exceptional athletic endurance, sportsmanship, and capturing first place\nat the {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=12, color="#431407", text_align="center", line_height=1.5, x=0.1, y=0.465, width=0.8, height=0.09, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#7F1D1D", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#F59E0B", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nTournament Commissioner", font_family="Montserrat", font_size=9, color="#78350F", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ATHLETIC RECORD ID: {{certificate_id}}\nOfficial Tournament Authentication", font_family="Montserrat", font_size=7.5, color="#991B1B", text_align="center", x=0.32, y=0.785, width=0.36, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#7F1D1D", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#F59E0B", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nHead Referee & Adjudicator", font_family="Montserrat", font_size=9, color="#78350F", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    elif preset_key == "minimal_modern":
        name = "Minimalist Studio & Design Honors"
        bg_color = "#FFFFFF"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.05, y=0.06, width=0.90, height=0.88, border_color="#18181B", border_width=1.0, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="static_text", content="INTERNATIONAL COUNCIL OF ARCHITECTURE & INDUSTRIAL DESIGN", font_family="Montserrat", font_size=9, font_weight="bold", color="#71717A", letter_spacing=3.0, uppercase=True, text_align="center", x=0.1, y=0.12, width=0.8, height=0.04, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="CREATIVE DISTINCTION IN DESIGN", font_family="Montserrat", font_size=28, font_weight="bold", color="#18181B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.05, y=0.18, width=0.9, height=0.08, layer_order=2),
            CanvasElement(template_id=template_id, element_type="static_text", content="HONOR CONFERRED UPON", font_family="Montserrat", font_size=9, font_weight="normal", color="#A1A1AA", letter_spacing=3.0, uppercase=True, text_align="center", x=0.2, y=0.28, width=0.6, height=0.035, layer_order=3),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Montserrat", font_size=36, font_weight="bold", color="#18181B", text_align="center", auto_fit_text=True, x=0.08, y=0.33, width=0.84, height=0.10, layer_order=4),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.35, y=0.44, width=0.30, height=0.005, border_color="#E4E4E7", border_width=1.0, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="in formal recognition of outstanding creative vision, sustainable architecture,\nand spatial innovation exhibited at {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=11, color="#52525B", text_align="center", line_height=1.5, x=0.1, y=0.47, width=0.8, height=0.09, layer_order=6),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#18181B", text_align="center", x=0.12, y=0.64, width=0.24, height=0.07, layer_order=7),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.12, y=0.725, width=0.24, height=0.005, border_color="#D4D4D8", border_width=1.0, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance\nDesign Principal", font_family="Montserrat", font_size=9, color="#71717A", text_align="center", x=0.12, y=0.735, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=10),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nAuthenticated Design Registry", font_family="Montserrat", font_size=7.5, color="#71717A", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=11),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#18181B", text_align="center", x=0.64, y=0.64, width=0.24, height=0.07, layer_order=12),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.64, y=0.725, width=0.24, height=0.005, border_color="#D4D4D8", border_width=1.0, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova\nJury President", font_family="Montserrat", font_size=9, color="#71717A", text_align="center", x=0.64, y=0.735, width=0.24, height=0.07, layer_order=14)
        ]
    elif preset_key in ("uploaded", "custom", "custom_artwork"):
        name = "Custom Uploaded Artwork Template"
        bg_color = None
        elements = [
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Recipient Name", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#0F2841", text_align="center", auto_fit_text=True, x=0.10, y=0.44, width=0.80, height=0.12, layer_order=0),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.82, y=0.74, width=0.09, height=0.12, layer_order=1),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}", binding_key="certificate_id", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.78, y=0.87, width=0.17, height=0.04, layer_order=2)
        ]
    elif preset_key == "blank":
        name = "Blank Certificate Canvas"
        bg_color = "#FFFFFF"
        elements = [
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Recipient Name", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#0F172A", text_align="center", auto_fit_text=True, x=0.1, y=0.36, width=0.8, height=0.10, layer_order=0),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="for distinguished completion of {{event_name}} on {{event_date}}.", font_family="Montserrat", font_size=12, color="#334155", text_align="center", line_height=1.5, x=0.15, y=0.50, width=0.7, height=0.08, layer_order=1),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.66, width=0.10, height=0.13, layer_order=2),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nVerify at certiform.example/verify", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.35, y=0.81, width=0.30, height=0.05, layer_order=3)
        ]
    else: # Classic Academic Honors default
        name = "Classic Academic Honors"
        bg_color = "#FCFAF5"
        elements = [
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.03, y=0.04, width=0.94, height=0.92, border_color="#0F2841", border_width=2.5, fill_color=None, is_locked=True, layer_order=0),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="rectangle", x=0.042, y=0.055, width=0.916, height=0.89, border_color="#C89D42", border_width=1.0, fill_color=None, is_locked=True, layer_order=1),
            CanvasElement(template_id=template_id, element_type="static_text", content="INTERNATIONAL ACADEMY OF ADVANCED SCIENCES & TECHNOLOGY", font_family="Montserrat", font_size=11, font_weight="bold", color="#0F2841", letter_spacing=2.5, uppercase=True, text_align="center", x=0.1, y=0.09, width=0.8, height=0.04, layer_order=2),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.35, y=0.14, width=0.30, height=0.005, border_color="#C89D42", border_width=1.0, layer_order=3),
            CanvasElement(template_id=template_id, element_type="static_text", content="CERTIFICATE OF ACHIEVEMENT", font_family="Cinzel", font_size=32, font_weight="bold", color="#0F2841", letter_spacing=3.0, uppercase=True, text_align="center", x=0.05, y=0.165, width=0.9, height=0.08, layer_order=4),
            CanvasElement(template_id=template_id, element_type="static_text", content="THIS CERTIFICATE IS PROUDLY CONFERRED UPON", font_family="Montserrat", font_size=10, font_weight="normal", color="#64748B", letter_spacing=3.0, uppercase=True, text_align="center", x=0.15, y=0.265, width=0.7, height=0.035, layer_order=5),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="Ananya Kumar", binding_key="recipient_name", font_family="Playfair Display", font_size=38, font_weight="bold", color="#0F2841", text_align="center", auto_fit_text=True, x=0.08, y=0.315, width=0.84, height=0.11, layer_order=6),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.28, y=0.435, width=0.44, height=0.005, border_color="#C89D42", border_width=1.5, layer_order=7),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="in recognition of distinguished participation and outstanding academic contributions\nto the {{event_name}} on {{event_date}}.", font_family="Merriweather", font_size=12, color="#334155", text_align="center", line_height=1.6, x=0.1, y=0.465, width=0.8, height=0.10, layer_order=8),
            CanvasElement(template_id=template_id, element_type="static_text", content="Marcus Vance", font_family="Great Vibes", font_size=28, color="#0F2841", text_align="center", x=0.11, y=0.64, width=0.24, height=0.07, layer_order=9),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.11, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=10),
            CanvasElement(template_id=template_id, element_type="static_text", content="Dr. Marcus Vance\nOrganizing Secretary", font_family="Montserrat", font_size=9.5, color="#475569", text_align="center", x=0.11, y=0.735, width=0.24, height=0.07, layer_order=11),
            CanvasElement(template_id=template_id, element_type="qr_code", x=0.45, y=0.64, width=0.10, height=0.13, layer_order=12),
            CanvasElement(template_id=template_id, element_type="dynamic_text", content="ID: {{certificate_id}}\nOfficial Verification at certiform.example/verify", font_family="Montserrat", font_size=7.5, color="#64748B", text_align="center", x=0.35, y=0.785, width=0.30, height=0.05, layer_order=13),
            CanvasElement(template_id=template_id, element_type="static_text", content="Elena Rostova", font_family="Great Vibes", font_size=28, color="#0F2841", text_align="center", x=0.65, y=0.64, width=0.24, height=0.07, layer_order=14),
            CanvasElement(template_id=template_id, element_type="shape", shape_type="line", x=0.65, y=0.725, width=0.24, height=0.005, border_color="#94A3B8", border_width=1.0, layer_order=15),
            CanvasElement(template_id=template_id, element_type="static_text", content="Prof. Elena Rostova\nConference Director", font_family="Montserrat", font_size=9.5, color="#475569", text_align="center", x=0.65, y=0.735, width=0.24, height=0.07, layer_order=16)
        ]
    return name, bg_color, elements

@router.get("/projects/{project_id}/templates", response_model=List[CertificateTemplateOut])
def list_project_templates(project_id: str, db: Session = Depends(get_db)):
    templates = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project_id).all()
    return templates

@router.post("/projects/{project_id}/templates", response_model=CertificateTemplateOut)
def create_template(project_id: str, data: CertificateTemplateCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    tpl_name = data.name
    tpl_bg = data.background_color
    preset_key = getattr(data, "preset", None)
    
    # If custom artwork is uploaded and no explicit preset chosen, use clean uploaded artwork preset
    if data.background_asset_url and (not preset_key or preset_key in ("blank", "default", "academic")):
        preset_key = "uploaded"
        if not tpl_bg or tpl_bg == "#FFFFFF":
            tpl_bg = None
    
    tpl = CertificateTemplate(
        project_id=project_id,
        name=tpl_name,
        page_format=data.page_format,
        width_pt=data.width_pt,
        height_pt=data.height_pt,
        background_asset_url=data.background_asset_url,
        background_color=tpl_bg,
        is_active=data.is_active
    )
    db.add(tpl)
    db.flush()
    
    # If this new template is active, deactivate others in this project
    if tpl.is_active:
        db.query(CertificateTemplate).filter(
            CertificateTemplate.project_id == project_id,
            CertificateTemplate.id != tpl.id
        ).update({"is_active": False})
    
    # Initialize elements from preset or clean uploaded elements
    preset_name, default_bg, preset_elements = get_preset_template_data(preset_key or "academic", tpl.id)
    if data.name == "Default Certificate Template":
        tpl.name = preset_name
    if tpl.background_color is None and default_bg:
        tpl.background_color = default_bg
        
    for el in preset_elements:
        db.add(el)
        
    db.commit()
    fresh_tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == tpl.id).first()
    return fresh_tpl

@router.post("/templates/{template_id}/activate", response_model=CertificateTemplateOut)
def activate_template(template_id: str, db: Session = Depends(get_db)):
    """Set template as the active certificate template for the project."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    db.query(CertificateTemplate).filter(
        CertificateTemplate.project_id == tpl.project_id
    ).update({"is_active": False})
    
    tpl.is_active = True
    db.commit()
    db.refresh(tpl)
    return tpl

@router.post("/templates/{template_id}/clean-for-artwork", response_model=CertificateTemplateOut)
def clean_template_for_artwork(template_id: str, db: Session = Depends(get_db)):
    """
    Remove all old static text, shapes, borders, and preset background colors that overlay
    custom uploaded certificate artwork, retaining only the clean dynamic Recipient Name,
    QR code, and Credential ID.
    """
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Clear canvas background color so custom artwork is completely visible
    tpl.background_color = None
    tpl.preset = "uploaded"
    
    # Delete all static elements and shapes (static titles, citations, borders, lines, signatures)
    for el in list(tpl.elements):
        if el.element_type in ("shape", "static_text"):
            db.delete(el)
            
    # Check if a dynamic_text for recipient_name exists
    name_el = next((el for el in tpl.elements if el.element_type == "dynamic_text" and el.binding_key in ("recipient_name", "name", "full_name")), None)
    if not name_el:
        name_el = CanvasElement(
            template_id=tpl.id,
            element_type="dynamic_text",
            content="Recipient Name",
            binding_key="recipient_name",
            font_family="Playfair Display",
            font_size=38,
            font_weight="bold",
            color="#0F2841",
            text_align="center",
            auto_fit_text=True,
            x=0.10,
            y=0.44,
            width=0.80,
            height=0.12,
            layer_order=0
        )
        db.add(name_el)
    else:
        # Ensure name is prominent and auto-fitting
        name_el.auto_fit_text = True
        name_el.x = 0.10
        name_el.y = 0.44
        name_el.width = 0.80
        name_el.height = 0.12
        name_el.text_align = "center"

    # Check if a QR code exists
    qr_el = next((el for el in tpl.elements if el.element_type == "qr_code"), None)
    if not qr_el:
        qr_el = CanvasElement(
            template_id=tpl.id,
            element_type="qr_code",
            x=0.82,
            y=0.74,
            width=0.09,
            height=0.12,
            layer_order=1
        )
        db.add(qr_el)

    # Check if credential ID exists
    id_el = next((el for el in tpl.elements if el.element_type == "dynamic_text" and el.binding_key in ("certificate_id", "credential_id")), None)
    if not id_el:
        id_el = CanvasElement(
            template_id=tpl.id,
            element_type="dynamic_text",
            content="ID: {{certificate_id}}",
            binding_key="certificate_id",
            font_family="Montserrat",
            font_size=7.5,
            color="#64748B",
            text_align="center",
            x=0.78,
            y=0.87,
            width=0.17,
            height=0.04,
            layer_order=2
        )
        db.add(id_el)
        
    db.commit()
    db.refresh(tpl)
    return tpl

@router.get("/templates/{template_id}", response_model=CertificateTemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl

@router.patch("/templates/{template_id}", response_model=CertificateTemplateOut)
def update_template(template_id: str, data: CertificateTemplateUpdate, db: Session = Depends(get_db)):
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    if data.name is not None: tpl.name = data.name
    if data.page_format is not None: tpl.page_format = data.page_format
    if data.width_pt is not None: tpl.width_pt = data.width_pt
    if data.height_pt is not None: tpl.height_pt = data.height_pt
    if data.background_asset_url is not None: tpl.background_asset_url = data.background_asset_url
    if data.background_color is not None: tpl.background_color = data.background_color
    if data.is_active is not None: tpl.is_active = data.is_active
    
    db.commit()
    db.refresh(tpl)
    return tpl

@router.post("/templates/{template_id}/duplicate", response_model=CertificateTemplateOut)
def duplicate_template(template_id: str, db: Session = Depends(get_db)):
    """Duplicate an existing certificate template with all its canvas elements and settings."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    new_tpl = CertificateTemplate(
        project_id=tpl.project_id,
        name=f"{tpl.name} (Copy)",
        page_format=tpl.page_format,
        width_pt=tpl.width_pt,
        height_pt=tpl.height_pt,
        background_asset_url=tpl.background_asset_url,
        background_color=tpl.background_color,
        is_active=True
    )
    db.add(new_tpl)
    db.flush()
    
    for el in tpl.elements:
        el_data = {
            col.name: getattr(el, col.name)
            for col in CanvasElement.__table__.columns
            if col.name not in ("id", "template_id")
        }
        new_el = CanvasElement(template_id=new_tpl.id, **el_data)
        db.add(new_el)
        
    db.commit()
    fresh_dup = db.query(CertificateTemplate).filter(CertificateTemplate.id == new_tpl.id).first()
    return fresh_dup

@router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):
    """Delete a template if the project has at least one remaining template."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    count = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == tpl.project_id).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only template in a project. Create another template first.")
        
    db.delete(tpl)
    db.commit()
    return {"success": True, "message": "Template deleted successfully"}

@router.post("/templates/{template_id}/elements", response_model=CanvasElementOut)
def add_canvas_element(template_id: str, data: CanvasElementCreate, db: Session = Depends(get_db)):
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    el = CanvasElement(
        template_id=template_id,
        **data.model_dump()
    )
    db.add(el)
    db.commit()
    db.refresh(el)
    return el

@router.patch("/templates/{template_id}/elements/{element_id}", response_model=CanvasElementOut)
def update_canvas_element(template_id: str, element_id: str, data: CanvasElementUpdate, db: Session = Depends(get_db)):
    el = db.query(CanvasElement).filter(
        CanvasElement.id == element_id,
        CanvasElement.template_id == template_id
    ).first()
    if not el:
        raise HTTPException(status_code=404, detail="Canvas element not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(el, k, v)
        
    db.commit()
    db.refresh(el)
    return el

@router.delete("/templates/{template_id}/elements/{element_id}")
def delete_canvas_element(template_id: str, element_id: str, db: Session = Depends(get_db)):
    el = db.query(CanvasElement).filter(
        CanvasElement.id == element_id,
        CanvasElement.template_id == template_id
    ).first()
    if not el:
        raise HTTPException(status_code=404, detail="Canvas element not found")
        
    db.delete(el)
    db.commit()
    return {"success": True, "message": "Element deleted"}

@router.put("/templates/{template_id}/elements/batch", response_model=List[CanvasElementOut])
def batch_sync_canvas_elements(template_id: str, elements: List[Dict[str, Any]], db: Session = Depends(get_db)):
    """Synchronize canvas elements state from frontend editor (auto-save)."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    existing_ids = {e.id: e for e in tpl.elements}
    incoming_ids = set()
    result = []
    
    for idx, item in enumerate(elements):
        el_id = item.get("id")
        if el_id and el_id in existing_ids:
            incoming_ids.add(el_id)
            el = existing_ids[el_id]
            for k, v in item.items():
                if k not in ("id", "template_id") and hasattr(el, k):
                    setattr(el, k, v)
            el.layer_order = idx
            result.append(el)
        else:
            # Create new element
            new_item = {k: v for k, v in item.items() if k not in ("id", "template_id", "layer_order") and hasattr(CanvasElement, k)}
            new_el = CanvasElement(
                template_id=template_id,
                layer_order=idx,
                **new_item
            )
            db.add(new_el)
            result.append(new_el)
            
    # Delete removed elements
    for old_id, old_el in existing_ids.items():
        if old_id not in incoming_ids:
            db.delete(old_el)
            
    db.commit()
    for r in result:
        db.refresh(r)
    return result

@router.post("/templates/{template_id}/upload-background")
def upload_template_background(template_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload background template image (PNG, JPG, WEBP)."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and WEBP images are supported for backgrounds")
        
    saved_filename = f"bg_{template_id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest_path = settings.UPLOADS_DIR / saved_filename
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    asset_url = f"/storage/uploads/{saved_filename}"
    tpl.background_asset_url = asset_url
    db.commit()
    db.refresh(tpl)
    
    return {"success": True, "background_asset_url": asset_url}

@router.post("/templates/{template_id}/load-preset", response_model=CertificateTemplateOut)
def load_template_preset(template_id: str, payload: Dict[str, str], db: Session = Depends(get_db)):
    """Apply professionally designed and aligned template presets."""
    tpl = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    preset_key = payload.get("preset", "academic")
    
    # Delete existing elements
    for el in list(tpl.elements):
        db.delete(el)
    db.flush()
    
    preset_name, default_bg, new_elements = get_preset_template_data(preset_key, tpl.id)
    tpl.name = preset_name
    tpl.background_color = default_bg
    tpl.background_asset_url = None
    
    for el in new_elements:
        db.add(el)
        
    db.commit()
    db.refresh(tpl)
    return tpl
