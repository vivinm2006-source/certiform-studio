import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, ForeignKey, DateTime, JSON, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(50), default="administrator")  # administrator, issuer, viewer
    created_at = Column(DateTime, default=utc_now)

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    branding = Column(JSON, default=dict)  # logo, colors, default footer
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    signatures = relationship("SignatureAsset", back_populates="organization", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, archived, draft
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    organization = relationship("Organization", back_populates="projects")
    templates = relationship("CertificateTemplate", back_populates="project", cascade="all, delete-orphan")
    forms = relationship("Form", back_populates="project", cascade="all, delete-orphan")
    recipients = relationship("Recipient", back_populates="project", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("IssuanceJob", back_populates="project", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="project", cascade="all, delete-orphan")

class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    version = Column(Integer, default=1)
    name = Column(String(255), default="Default Certificate Template")
    page_format = Column(String(50), default="A4_LANDSCAPE")
    width_pt = Column(Float, default=841.89)  # standard A4 landscape width in points
    height_pt = Column(Float, default=595.28) # standard A4 landscape height in points
    background_asset_url = Column(Text, nullable=True)
    background_color = Column(String(50), default="#FFFFFF")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    project = relationship("Project", back_populates="templates")
    elements = relationship("CanvasElement", back_populates="template", cascade="all, delete-orphan", order_by="CanvasElement.layer_order")

class CanvasElement(Base):
    __tablename__ = "canvas_elements"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    template_id = Column(String(36), ForeignKey("certificate_templates.id"), nullable=False)
    element_type = Column(String(50), nullable=False)  # dynamic_text, static_text, image, signature, qr_code, shape
    
    # Normalized coordinates (0.0 to 1.0 relative to canvas width/height)
    x = Column(Float, nullable=False, default=0.1)
    y = Column(Float, nullable=False, default=0.1)
    width = Column(Float, nullable=False, default=0.3)
    height = Column(Float, nullable=False, default=0.1)
    rotation = Column(Float, default=0.0)
    
    # Content & Typography
    content = Column(Text, nullable=True)             # static text or default text
    binding_key = Column(String(100), nullable=True)  # e.g. "recipient_name", "registration_id"
    font_family = Column(String(100), default="Helvetica")
    font_size = Column(Float, default=24.0)           # in physical points
    font_weight = Column(String(50), default="normal") # normal, bold, 600, 700
    font_style = Column(String(50), default="normal")  # normal, italic
    text_decoration = Column(String(50), default="none") # none, underline
    color = Column(String(50), default="#1A202C")
    text_align = Column(String(50), default="center")  # left, center, right, justify
    vertical_align = Column(String(50), default="middle") # top, middle, bottom
    letter_spacing = Column(Float, default=0.0)
    line_height = Column(Float, default=1.3)
    uppercase = Column(Boolean, default=False)
    auto_fit_text = Column(Boolean, default=True)      # shrink font size if overflow
    max_lines = Column(Integer, default=2)
    
    # Media & Shapes
    asset_url = Column(String(1024), nullable=True)   # for images or uploaded signatures
    signature_signer_id = Column(String(36), nullable=True) # links to SignatureAsset
    shape_type = Column(String(50), nullable=True)    # rectangle, line, circle, border
    border_color = Column(String(50), default="#D1D5DB")
    border_width = Column(Float, default=0.0)
    fill_color = Column(String(50), nullable=True)
    opacity = Column(Float, default=1.0)
    
    # Layer & Interaction
    layer_order = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    
    template = relationship("CertificateTemplate", back_populates="elements")

class Form(Base):
    __tablename__ = "forms"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), default="Registration Form")
    description = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True)
    auto_issue_enabled = Column(Boolean, default=False) # respondent receives cert instantly on submit
    require_approval = Column(Boolean, default=True)    # admin must review submission
    allow_preview = Column(Boolean, default=True)       # respondent can preview sample cert
    custom_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    project = relationship("Project", back_populates="forms")
    fields = relationship("FormField", back_populates="form", cascade="all, delete-orphan", order_by="FormField.display_order")
    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")

class FormField(Base):
    __tablename__ = "form_fields"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    form_id = Column(String(36), ForeignKey("forms.id"), nullable=False)
    binding_key = Column(String(100), nullable=False) # e.g. "recipient_name", "email"
    label = Column(String(255), nullable=False)
    help_text = Column(Text, nullable=True)
    placeholder = Column(String(255), nullable=True)
    field_type = Column(String(50), default="text") # text, long_text, email, phone, number, dropdown, radio, checkboxes, date, file
    is_required = Column(Boolean, default=True)
    default_value = Column(String(255), nullable=True)
    validation_rules = Column(JSON, default=dict) # min_length, max_length, regex, options
    display_order = Column(Integer, default=0)
    
    form = relationship("Form", back_populates="fields")

class Recipient(Base):
    __tablename__ = "recipients"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    data = Column(JSON, default=dict) # {"recipient_name": "Ananya Kumar", "email": "ananya@example.com", ...}
    source = Column(String(50), default="manual") # manual, import, form
    status = Column(String(50), default="valid") # valid, error, issued, draft
    validation_errors = Column(JSON, default=list) # list of field validation messages
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    project = relationship("Project", back_populates="recipients")
    submissions = relationship("FormSubmission", back_populates="recipient", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="recipient", cascade="all, delete-orphan")

class FormSubmission(Base):
    __tablename__ = "form_submissions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    form_id = Column(String(36), ForeignKey("forms.id"), nullable=False)
    recipient_id = Column(String(36), ForeignKey("recipients.id"), nullable=False)
    submitted_at = Column(DateTime, default=utc_now)
    review_status = Column(String(50), default="pending") # pending, approved, rejected
    reviewer_notes = Column(Text, nullable=True)
    
    form = relationship("Form", back_populates="submissions")
    recipient = relationship("Recipient", back_populates="submissions")

class SignatureAsset(Base):
    __tablename__ = "signature_assets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    signer_name = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=False) # e.g. "Conference Chair", "Principal"
    institution = Column(String(255), nullable=True)
    capture_type = Column(String(50), default="draw") # draw, upload, type
    asset_url = Column(String(1024), nullable=True)   # PNG data URL or storage URL
    typed_font = Column(String(100), default="cursive")
    authorization_status = Column(String(50), default="authorized") # authorized, pending, revoked
    authorized_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    organization = relationship("Organization", back_populates="signatures")

class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(String(36), primary_key=True, default=generate_uuid) # internal uuid
    credential_id = Column(String(100), unique=True, nullable=False, index=True) # human readable e.g. "CERT-2026-000125"
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    recipient_id = Column(String(36), ForeignKey("recipients.id"), nullable=False)
    template_id = Column(String(36), ForeignKey("certificate_templates.id"), nullable=True)
    template_version = Column(Integer, default=1)
    
    issued_data_snapshot = Column(JSON, nullable=False) # frozen record snapshot
    credential_status = Column(String(50), default="valid") # valid, revoked, expired
    issued_at = Column(DateTime, default=utc_now)
    revoked_at = Column(DateTime, nullable=True)
    revocation_reason = Column(Text, nullable=True)
    
    artifact_digest = Column(String(64), nullable=True) # SHA-256 hash of generated document
    pdf_asset_url = Column(String(1024), nullable=True)
    png_asset_url = Column(String(1024), nullable=True)
    verification_url = Column(String(1024), nullable=True)
    
    # Previous credential for controlled reissuance tracking
    replaced_credential_id = Column(String(100), nullable=True)
    
    project = relationship("Project", back_populates="credentials")
    recipient = relationship("Recipient", back_populates="credentials")

class IssuanceJob(Base):
    __tablename__ = "issuance_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    template_id = Column(String(36), ForeignKey("certificate_templates.id"), nullable=True)
    output_mode = Column(String(50), default="zip_pdf") # single_pdf, single_png, zip_pdf, zip_png, consolidated_pdf
    status = Column(String(50), default="queued") # queued, processing, completed, failed, cancelled
    total_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    progress_percentage = Column(Float, default=0.0)
    artifact_url = Column(String(1024), nullable=True)
    artifact_filename = Column(String(255), nullable=True)
    error_summary = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)
    
    project = relationship("Project", back_populates="jobs")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    credential_id = Column(String(100), nullable=True, index=True)
    actor = Column(String(255), default="System Administrator")
    action = Column(String(100), nullable=False) # issued, reissued, revoked, verified, exported
    timestamp = Column(DateTime, default=utc_now)
    metadata_snapshot = Column(JSON, default=dict)
    
    project = relationship("Project", back_populates="audit_events")

# Multi-column indexes
Index("idx_recipient_project_status", Recipient.project_id, Recipient.status)
Index("idx_credential_project_status", Credential.project_id, Credential.credential_status)
