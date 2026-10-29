from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models import Project, CertificateTemplate, CanvasElement, Form, FormField, Recipient, SignatureAsset

DEFAULT_PROJECT_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TPL_VANEXA_ID = "00000000-0000-0000-0000-000000000011"
DEFAULT_TPL_ARTWORK_ID = "00000000-0000-0000-0000-000000000012"
DEFAULT_TPL_ACADEMIC_ID = "00000000-0000-0000-0000-000000000013"

def create_default_project(db: Session, title: str = "Vanexa Tech Hub - Student Certifications", description: str = "Official certificates of participation and excellence") -> Project:
    """Create a new project pre-populated with official Vanexa Tech Hub templates, aligned vector elements, and sample recipients."""
    from app.api.templates import get_preset_template_data, get_vanexa_artwork_data_url

    # Check if default project already exists
    existing = db.query(Project).filter(Project.id == DEFAULT_PROJECT_ID).first()
    if existing:
        return existing

    project = Project(
        id=DEFAULT_PROJECT_ID,
        title=title,
        description=description,
        status="active"
    )
    db.add(project)
    db.flush()
    
    # 1. Primary Active Template: Vanexa Tech Hub - Certificate of Participation (100% Editable Vector Canvas)
    tpl_vanexa = CertificateTemplate(
        id=DEFAULT_TPL_VANEXA_ID,
        project_id=project.id,
        version=1,
        name="Vanexa - Participation (Editable)",
        page_format="A4_LANDSCAPE",
        width_pt=841.89,
        height_pt=595.28,
        background_color="#FBF9F5",
        background_asset_url=None,
        is_active=True
    )
    db.add(tpl_vanexa)
    db.flush()
    
    _, _, vanexa_elements = get_preset_template_data("vanexa_participation", tpl_vanexa.id)
    for el in vanexa_elements:
        db.add(el)

    # 2. Secondary Template: Vanexa Tech Hub - Official Graphic Artwork Template
    artwork_data_url = get_vanexa_artwork_data_url()
    tpl_artwork = CertificateTemplate(
        id=DEFAULT_TPL_ARTWORK_ID,
        project_id=project.id,
        version=1,
        name="Vanexa - Official Artwork Template",
        page_format="A4_LANDSCAPE",
        width_pt=841.89,
        height_pt=595.28,
        background_color=None,
        background_asset_url=artwork_data_url,
        is_active=False
    )
    db.add(tpl_artwork)
    db.flush()

    _, _, artwork_elements = get_preset_template_data("vanexa_artwork", tpl_artwork.id)
    for el in artwork_elements:
        db.add(el)

    # 3. Tertiary Template: Classic Academic Honors
    tpl_academic = CertificateTemplate(
        id=DEFAULT_TPL_ACADEMIC_ID,
        project_id=project.id,
        version=1,
        name="Classic Academic Honors",
        page_format="A4_LANDSCAPE",
        width_pt=841.89,
        height_pt=595.28,
        background_color="#FCFAF5",
        background_asset_url=None,
        is_active=False
    )
    db.add(tpl_academic)
    db.flush()

    _, _, academic_elements = get_preset_template_data("academic", tpl_academic.id)
    for el in academic_elements:
        db.add(el)
        
    # 4. Create Intake Form
    form = Form(
        project_id=project.id,
        title="Participant Registration & Verification",
        description="Please provide your full details as you want them to appear on your official certificate.",
        is_published=True,
        auto_issue_enabled=True,
        require_approval=True,
        allow_preview=True
    )
    db.add(form)
    db.flush()
    
    fields = [
        FormField(
            form_id=form.id,
            binding_key="recipient_name",
            label="Full Name (for Certificate)",
            help_text="Enter your student name exactly as it should be printed.",
            placeholder="e.g. Vivin M",
            field_type="text",
            is_required=True,
            display_order=0
        ),
        FormField(
            form_id=form.id,
            binding_key="department",
            label="Department / Branch",
            help_text="e.g. Artificial Intelligence and Machine Learning (AI & ML)",
            placeholder="e.g. AI & ML",
            default_value="Artificial Intelligence and Machine Learning (AI & ML)",
            field_type="text",
            is_required=True,
            display_order=1
        ),
        FormField(
            form_id=form.id,
            binding_key="event_name",
            label="Session Topic",
            default_value="STARTUP & ENTREPRENEURSHIP",
            field_type="text",
            is_required=True,
            display_order=2
        ),
        FormField(
            form_id=form.id,
            binding_key="event_date",
            label="Date of Conduct",
            default_value="26/10/2026",
            field_type="date",
            is_required=True,
            display_order=3
        ),
        FormField(
            form_id=form.id,
            binding_key="institution",
            label="Institution / College",
            default_value="Nehru Institute of Technology",
            field_type="text",
            is_required=False,
            display_order=4
        ),
        FormField(
            form_id=form.id,
            binding_key="email",
            label="Email Address",
            placeholder="e.g. student@college.edu",
            field_type="email",
            is_required=False,
            display_order=5
        )
    ]
    for f in fields:
        db.add(f)
        
    # 5. Seed Initial Sample Recipients (Matching real organization records)
    sample_recipients = [
        {
            "recipient_name": "Vivin M",
            "name": "Vivin M",
            "full_name": "Vivin M",
            "department": "Artificial Intelligence and Machine Learning (AI & ML)",
            "event_name": "STARTUP & ENTREPRENEURSHIP",
            "session_topic": "STARTUP & ENTREPRENEURSHIP",
            "event_date": "26/10/2026",
            "institution": "Nehru Institute of Technology",
            "venue": "Nehru Institute of Technology",
            "email": "vivin@vanexa.io",
            "registration_id": "VANEXA-2026-001"
        },
        {
            "recipient_name": "Praveen Kumar",
            "name": "Praveen Kumar",
            "full_name": "Praveen Kumar",
            "department": "Computer Science and Engineering",
            "event_name": "STARTUP & ENTREPRENEURSHIP",
            "session_topic": "STARTUP & ENTREPRENEURSHIP",
            "event_date": "26/10/2026",
            "institution": "Nehru Institute of Technology",
            "venue": "Nehru Institute of Technology",
            "email": "praveen@vanexa.io",
            "registration_id": "VANEXA-2026-002"
        },
        {
            "recipient_name": "Sneha Reddy",
            "name": "Sneha Reddy",
            "full_name": "Sneha Reddy",
            "department": "Data Science",
            "event_name": "STARTUP & ENTREPRENEURSHIP",
            "session_topic": "STARTUP & ENTREPRENEURSHIP",
            "event_date": "26/10/2026",
            "institution": "Nehru Institute of Technology",
            "venue": "Nehru Institute of Technology",
            "email": "sneha@vanexa.io",
            "registration_id": "VANEXA-2026-003"
        },
        {
            "recipient_name": "Ananya Kumar",
            "name": "Ananya Kumar",
            "full_name": "Ananya Kumar",
            "department": "Artificial Intelligence & Data Science",
            "event_name": "STARTUP & ENTREPRENEURSHIP",
            "session_topic": "STARTUP & ENTREPRENEURSHIP",
            "event_date": "26/10/2026",
            "institution": "Nehru Institute of Technology",
            "venue": "Nehru Institute of Technology",
            "email": "ananya@vanexa.io",
            "registration_id": "VANEXA-2026-004"
        },
        {
            "recipient_name": "Rahul Sharma",
            "name": "Rahul Sharma",
            "full_name": "Rahul Sharma",
            "department": "Information Technology",
            "event_name": "STARTUP & ENTREPRENEURSHIP",
            "session_topic": "STARTUP & ENTREPRENEURSHIP",
            "event_date": "26/10/2026",
            "institution": "Nehru Institute of Technology",
            "venue": "Nehru Institute of Technology",
            "email": "rahul@vanexa.io",
            "registration_id": "VANEXA-2026-005"
        }
    ]
    for s_data in sample_recipients:
        rec = Recipient(
            project_id=project.id,
            data=s_data,
            source="manual",
            status="valid"
        )
        db.add(rec)
        
    db.commit()
    db.refresh(project)
    return project
