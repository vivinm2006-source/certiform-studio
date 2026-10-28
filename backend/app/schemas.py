from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Geometry & Appearance ---
class ElementGeometry(BaseModel):
    x: float = Field(0.1, ge=0.0, le=1.0)
    y: float = Field(0.1, ge=0.0, le=1.0)
    width: float = Field(0.3, ge=0.0, le=1.0)
    height: float = Field(0.1, ge=0.0, le=1.0)
    rotation: float = 0.0

class CanvasElementBase(BaseModel):
    element_type: str  # dynamic_text, static_text, image, signature, qr_code, shape
    x: float = Field(0.1, ge=0.0, le=1.0)
    y: float = Field(0.1, ge=0.0, le=1.0)
    width: float = Field(0.3, ge=0.0, le=1.0)
    height: float = Field(0.1, ge=0.0, le=1.0)
    rotation: float = 0.0
    
    content: Optional[str] = None
    binding_key: Optional[str] = None
    font_family: str = "Helvetica"
    font_size: float = 24.0
    font_weight: str = "normal"
    font_style: str = "normal"
    text_decoration: str = "none"
    color: str = "#1A202C"
    text_align: str = "center"
    vertical_align: str = "middle"
    letter_spacing: float = 0.0
    line_height: float = 1.3
    uppercase: bool = False
    auto_fit_text: bool = True
    max_lines: int = 2
    
    asset_url: Optional[str] = None
    signature_signer_id: Optional[str] = None
    shape_type: Optional[str] = None
    border_color: str = "#D1D5DB"
    border_width: float = 0.0
    fill_color: Optional[str] = None
    opacity: float = 1.0
    
    layer_order: int = 0
    is_locked: bool = False
    is_visible: bool = True

class CanvasElementCreate(CanvasElementBase):
    pass

class CanvasElementUpdate(BaseModel):
    element_type: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    content: Optional[str] = None
    binding_key: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[float] = None
    font_weight: Optional[str] = None
    font_style: Optional[str] = None
    text_decoration: Optional[str] = None
    color: Optional[str] = None
    text_align: Optional[str] = None
    vertical_align: Optional[str] = None
    letter_spacing: Optional[float] = None
    line_height: Optional[float] = None
    uppercase: Optional[bool] = None
    auto_fit_text: Optional[bool] = None
    max_lines: Optional[int] = None
    asset_url: Optional[str] = None
    signature_signer_id: Optional[str] = None
    shape_type: Optional[str] = None
    border_color: Optional[str] = None
    border_width: Optional[float] = None
    fill_color: Optional[str] = None
    opacity: Optional[float] = None
    layer_order: Optional[int] = None
    is_locked: Optional[bool] = None
    is_visible: Optional[bool] = None

class CanvasElementOut(CanvasElementBase):
    id: str
    template_id: str
    
    model_config = ConfigDict(from_attributes=True)

# --- Certificate Template ---
class CertificateTemplateBase(BaseModel):
    name: str = "Default Certificate Template"
    page_format: str = "A4_LANDSCAPE"
    width_pt: float = 841.89
    height_pt: float = 595.28
    background_asset_url: Optional[str] = None
    background_color: str = "#FFFFFF"
    is_active: bool = True

class CertificateTemplateCreate(CertificateTemplateBase):
    preset: Optional[str] = None

class CertificateTemplateUpdate(BaseModel):
    name: Optional[str] = None
    page_format: Optional[str] = None
    width_pt: Optional[float] = None
    height_pt: Optional[float] = None
    background_asset_url: Optional[str] = None
    background_color: Optional[str] = None
    is_active: bool = True

class CertificateTemplateOut(CertificateTemplateBase):
    id: str
    project_id: str
    version: int
    created_at: datetime
    updated_at: datetime
    elements: List[CanvasElementOut] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- Form & Form Fields ---
class FormFieldBase(BaseModel):
    binding_key: str
    label: str
    help_text: Optional[str] = None
    placeholder: Optional[str] = None
    field_type: str = "text"
    is_required: bool = True
    default_value: Optional[str] = None
    validation_rules: Dict[str, Any] = {}
    display_order: int = 0

class FormFieldCreate(FormFieldBase):
    pass

class FormFieldOut(FormFieldBase):
    id: str
    form_id: str
    
    model_config = ConfigDict(from_attributes=True)

class FormBase(BaseModel):
    title: str = "Registration Form"
    description: Optional[str] = None
    is_published: bool = True
    auto_issue_enabled: bool = False
    require_approval: bool = True
    allow_preview: bool = True
    custom_message: Optional[str] = None

class FormCreate(FormBase):
    fields: Optional[List[FormFieldCreate]] = []

class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_published: Optional[bool] = None
    auto_issue_enabled: Optional[bool] = None
    require_approval: Optional[bool] = None
    allow_preview: Optional[bool] = None
    custom_message: Optional[str] = None

class FormOut(FormBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    fields: List[FormFieldOut] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- Public Form Submission ---
class FormSubmissionCreate(BaseModel):
    data: Dict[str, Any]

class FormSubmissionOut(BaseModel):
    id: str
    form_id: str
    recipient_id: str
    submitted_at: datetime
    review_status: str
    reviewer_notes: Optional[str] = None
    issued_credential_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Recipient ---
class RecipientBase(BaseModel):
    data: Dict[str, Any] = {}
    source: str = "manual"
    status: str = "valid"
    validation_errors: List[str] = []

class RecipientCreate(RecipientBase):
    pass

class RecipientUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    validation_errors: Optional[List[str]] = None

class RecipientOut(RecipientBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BulkImportRequest(BaseModel):
    rows: List[Dict[str, Any]]
    column_mapping: Dict[str, str] # e.g. {"Full Name": "recipient_name", "Email Address": "email"}
    clear_existing: Optional[bool] = False

# --- Signature Asset ---
class SignatureAssetBase(BaseModel):
    signer_name: str
    designation: str
    institution: Optional[str] = None
    capture_type: str = "draw"
    asset_url: Optional[str] = None
    typed_font: str = "cursive"
    authorization_status: str = "authorized"
    authorized_by: Optional[str] = "Admin"

class SignatureAssetCreate(SignatureAssetBase):
    pass

class SignatureAssetOut(SignatureAssetBase):
    id: str
    organization_id: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Credential & Verification ---
class CredentialOut(BaseModel):
    id: str
    credential_id: str
    project_id: str
    recipient_id: str
    template_version: int
    issued_data_snapshot: Dict[str, Any]
    credential_status: str
    issued_at: datetime
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    artifact_digest: Optional[str] = None
    pdf_asset_url: Optional[str] = None
    png_asset_url: Optional[str] = None
    verification_url: Optional[str] = None
    replaced_credential_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PublicVerificationResponse(BaseModel):
    status: str  # valid, revoked, expired, not_found
    credential_id: str
    certificate_title: Optional[str] = None
    recipient_name: Optional[str] = None
    issuing_organization: Optional[str] = None
    issued_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    read_only_preview_url: Optional[str] = None
    artifact_digest: Optional[str] = None

class RevokeCredentialRequest(BaseModel):
    reason: str

class ReissueCredentialRequest(BaseModel):
    updated_data: Dict[str, Any]
    reason: str

# --- Issuance Job ---
class IssuanceJobCreate(BaseModel):
    output_mode: str = "zip_pdf" # single_pdf, single_png, zip_pdf, zip_png, consolidated_pdf
    recipient_ids: Optional[List[str]] = None # if None, issues all valid recipients
    template_id: Optional[str] = None

class IssuanceJobOut(BaseModel):
    id: str
    project_id: str
    output_mode: str
    status: str
    total_count: int
    completed_count: int
    error_count: int
    progress_percentage: float
    artifact_url: Optional[str] = None
    artifact_filename: Optional[str] = None
    error_summary: List[Dict[str, Any]] = []
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Project ---
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "active"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProjectOut(ProjectBase):
    id: str
    organization_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    templates: List[CertificateTemplateOut] = []
    forms: List[FormOut] = []
    recipient_count: int = 0
    issued_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

# --- Preflight Report ---
class PreflightIssue(BaseModel):
    type: str # warning, error
    code: str # overflow, missing_field, small_qr, missing_signature
    message: str
    recipient_id: Optional[str] = None
    element_id: Optional[str] = None

class PreflightReport(BaseModel):
    passed: bool
    issues: List[PreflightIssue]
    total_recipients: int
    ready_recipients: int

# --- Audit Event ---
class AuditEventOut(BaseModel):
    id: str
    project_id: str
    credential_id: Optional[str] = None
    actor: str
    action: str
    timestamp: datetime
    metadata_snapshot: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)
