from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models import Project, CertificateTemplate, CanvasElement, Form, FormField, Recipient, SignatureAsset

def create_default_project(db: Session, title: str = "Annual Leadership Conference 2026", description: str = "Official certificates of participation and excellence") -> Project:
    """Create a new project pre-populated with a high-fidelity certificate template, aligned elements, and sample recipients."""
    project = Project(
        title=title,
        description=description,
        status="active"
    )
    db.add(project)
    db.flush()
    
    # 1. Create Default Certificate Template (A4 Landscape: 841.89 x 595.28 pt)
    template = CertificateTemplate(
        project_id=project.id,
        version=1,
        name="Classic Academic Honors",
        page_format="A4_LANDSCAPE",
        width_pt=841.89,
        height_pt=595.28,
        background_color="#FCFAF5", # Warm luxury ivory parchment
        is_active=True
    )
    db.add(template)
    db.flush()
    
    # 2. Add Canva-grade visual elements with precise alignment
    default_elements = [
        # Outer decorative frame (Locked so user clicks elements inside without moving borders)
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="rectangle",
            x=0.03, y=0.04, width=0.94, height=0.92,
            border_color="#0F2841", border_width=2.5,
            fill_color=None,
            is_locked=True,
            layer_order=0
        ),
        # Inner fine gold border
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="rectangle",
            x=0.042, y=0.055, width=0.916, height=0.89,
            border_color="#C89D42", border_width=1.0,
            fill_color=None,
            is_locked=True,
            layer_order=1
        ),
        # Institution / Organization Header
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="INTERNATIONAL ACADEMY OF ADVANCED SCIENCES & TECHNOLOGY",
            font_family="Montserrat",
            font_size=11.0,
            font_weight="bold",
            color="#0F2841",
            uppercase=True,
            text_align="center",
            vertical_align="middle",
            letter_spacing=2.5,
            x=0.10, y=0.09, width=0.80, height=0.04,
            layer_order=2
        ),
        # Subtle separator under institutional header
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="line",
            x=0.35, y=0.14, width=0.30, height=0.005,
            border_color="#C89D42", border_width=1.0,
            layer_order=3
        ),
        # Certificate Title Heading
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="CERTIFICATE OF ACHIEVEMENT",
            font_family="Cinzel",
            font_size=32.0,
            font_weight="bold",
            color="#0F2841",
            letter_spacing=3.0,
            uppercase=True,
            text_align="center",
            vertical_align="middle",
            x=0.05, y=0.165, width=0.90, height=0.08,
            layer_order=4
        ),
        # Sub-heading
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="THIS CERTIFICATE IS PROUDLY CONFERRED UPON",
            font_family="Montserrat",
            font_size=10.0,
            font_weight="normal",
            color="#64748B",
            letter_spacing=3.0,
            uppercase=True,
            text_align="center",
            vertical_align="middle",
            x=0.15, y=0.265, width=0.70, height=0.035,
            layer_order=5
        ),
        # Dynamic Recipient Name (Centerpiece)
        CanvasElement(
            template_id=template.id,
            element_type="dynamic_text",
            content="Ananya Kumar",
            binding_key="recipient_name",
            font_family="Playfair Display",
            font_size=38.0,
            font_weight="bold",
            font_style="normal",
            color="#0F2841",
            text_align="center",
            vertical_align="middle",
            auto_fit_text=True,
            x=0.08, y=0.315, width=0.84, height=0.11,
            layer_order=6
        ),
        # Gold underline separator below recipient name
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="line",
            x=0.28, y=0.435, width=0.44, height=0.005,
            border_color="#C89D42", border_width=1.5,
            layer_order=7
        ),
        # Dynamic Description / Body Statement
        CanvasElement(
            template_id=template.id,
            element_type="dynamic_text",
            content="in recognition of distinguished participation and outstanding academic contributions\nto the {{event_name}} on {{event_date}}.",
            binding_key=None,
            font_family="Merriweather",
            font_size=12.0,
            font_weight="normal",
            color="#334155",
            text_align="center",
            vertical_align="middle",
            line_height=1.6,
            x=0.10, y=0.465, width=0.80, height=0.10,
            layer_order=8
        ),
        # Left Signer Typed Cursive Signature
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="Marcus Vance",
            font_family="Great Vibes",
            font_size=28.0,
            font_weight="normal",
            color="#0F2841",
            text_align="center",
            vertical_align="middle",
            x=0.11, y=0.64, width=0.24, height=0.07,
            layer_order=9
        ),
        # Left Signer Rule Line
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="line",
            x=0.11, y=0.725, width=0.24, height=0.005,
            border_color="#94A3B8", border_width=1.0,
            layer_order=10
        ),
        # Left Signer Designation
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="Dr. Marcus Vance\nOrganizing Secretary",
            font_family="Montserrat",
            font_size=9.5,
            font_weight="normal",
            color="#475569",
            text_align="center",
            vertical_align="top",
            line_height=1.4,
            x=0.11, y=0.735, width=0.24, height=0.07,
            layer_order=11
        ),
        # Center Verification QR Code
        CanvasElement(
            template_id=template.id,
            element_type="qr_code",
            x=0.45, y=0.64, width=0.10, height=0.13,
            layer_order=12
        ),
        # Credential ID / Verification notice below QR code
        CanvasElement(
            template_id=template.id,
            element_type="dynamic_text",
            content="ID: {{certificate_id}}\nOfficial Verification at certiform.example/verify",
            binding_key=None,
            font_family="Montserrat",
            font_size=7.5,
            color="#64748B",
            text_align="center",
            vertical_align="top",
            line_height=1.3,
            x=0.35, y=0.785, width=0.30, height=0.05,
            layer_order=13
        ),
        # Right Signer Typed Cursive Signature
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="Elena Rostova",
            font_family="Great Vibes",
            font_size=28.0,
            font_weight="normal",
            color="#0F2841",
            text_align="center",
            vertical_align="middle",
            x=0.65, y=0.64, width=0.24, height=0.07,
            layer_order=14
        ),
        # Right Signer Rule Line
        CanvasElement(
            template_id=template.id,
            element_type="shape",
            shape_type="line",
            x=0.65, y=0.725, width=0.24, height=0.005,
            border_color="#94A3B8", border_width=1.0,
            layer_order=15
        ),
        # Right Signer Designation
        CanvasElement(
            template_id=template.id,
            element_type="static_text",
            content="Prof. Elena Rostova\nConference Director",
            font_family="Montserrat",
            font_size=9.5,
            font_weight="normal",
            color="#475569",
            text_align="center",
            vertical_align="top",
            line_height=1.4,
            x=0.65, y=0.735, width=0.24, height=0.07,
            layer_order=16
        )
    ]
    for el in default_elements:
        db.add(el)
        
    # 3. Create Default Google Forms-style Intake Form
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
    
    # 4. Form Fields with stable internal IDs and binding keys
    fields = [
        FormField(
            form_id=form.id,
            binding_key="recipient_name",
            label="Full Name (for Certificate)",
            help_text="Enter your name exactly as it should be printed.",
            placeholder="e.g. Dr. Ananya Kumar",
            field_type="text",
            is_required=True,
            display_order=0
        ),
        FormField(
            form_id=form.id,
            binding_key="email",
            label="Email Address",
            help_text="Your digital certificate and verification link will be sent here.",
            placeholder="e.g. ananya@university.edu",
            field_type="email",
            is_required=True,
            display_order=1
        ),
        FormField(
            form_id=form.id,
            binding_key="institution",
            label="Institution / Organization",
            help_text="Name of your college, company, or research institute.",
            placeholder="e.g. MIT Dept of Computer Science",
            field_type="text",
            is_required=False,
            display_order=2
        ),
        FormField(
            form_id=form.id,
            binding_key="event_name",
            label="Event or Track Name",
            default_value="Global AI Summit 2026",
            field_type="text",
            is_required=True,
            display_order=3
        ),
        FormField(
            form_id=form.id,
            binding_key="event_date",
            label="Event Date",
            default_value="October 27, 2026",
            field_type="date",
            is_required=True,
            display_order=4
        )
    ]
    for f in fields:
        db.add(f)
        
    # 5. Seed Initial Sample Recipients
    sample_recipients = [
        {
            "recipient_name": "Ananya Kumar",
            "email": "ananya.kumar@stanford.edu",
            "institution": "Stanford University",
            "event_name": "Global AI Summit 2026",
            "event_date": "October 27, 2026",
            "registration_id": "REG-2026-001"
        },
        {
            "recipient_name": "David S. Miller",
            "email": "d.miller@techcorp.io",
            "institution": "TechCorp Research Labs",
            "event_name": "Global AI Summit 2026",
            "event_date": "October 27, 2026",
            "registration_id": "REG-2026-002"
        },
        {
            "recipient_name": "Priya Sharma",
            "email": "priya.sharma@iitd.ac.in",
            "institution": "Indian Institute of Technology",
            "event_name": "Global AI Summit 2026",
            "event_date": "October 27, 2026",
            "registration_id": "REG-2026-003"
        },
        {
            "recipient_name": "Elena Rostova",
            "email": "elena.rostova@oxford.ac.uk",
            "institution": "University of Oxford",
            "event_name": "Global AI Summit 2026",
            "event_date": "October 27, 2026",
            "registration_id": "REG-2026-004"
        },
        {
            "recipient_name": "Carlos Gomez",
            "email": "carlos.gomez@polytechnique.fr",
            "institution": "École Polytechnique",
            "event_name": "Global AI Summit 2026",
            "event_date": "October 27, 2026",
            "registration_id": "REG-2026-005"
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
