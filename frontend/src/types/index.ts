export interface CanvasElement {
  id: string;
  template_id: string;
  element_type: 'dynamic_text' | 'static_text' | 'image' | 'signature' | 'qr_code' | 'shape';
  
  // Normalized coordinates (0.0 to 1.0)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  
  // Content & Typography
  content?: string;
  binding_key?: string;
  font_family: string;
  font_size: number;
  font_weight: string;
  font_style: string;
  text_decoration: string;
  color: string;
  text_align: 'left' | 'center' | 'right' | 'justify';
  vertical_align: 'top' | 'middle' | 'bottom';
  letter_spacing: number;
  line_height: number;
  uppercase: boolean;
  auto_fit_text: boolean;
  max_lines: number;
  
  // Media & Shapes
  asset_url?: string;
  signature_signer_id?: string;
  shape_type?: 'rectangle' | 'line' | 'circle' | 'border';
  border_color: string;
  border_width: number;
  fill_color?: string;
  opacity: number;
  
  // Layers & Locking
  layer_order: number;
  is_locked: boolean;
  is_visible: boolean;
}

export interface CertificateTemplate {
  id: string;
  project_id: string;
  version: number;
  name: string;
  page_format: string;
  width_pt: number;
  height_pt: number;
  background_asset_url?: string;
  background_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  elements: CanvasElement[];
}

export interface FormField {
  id: string;
  form_id: string;
  binding_key: string;
  label: string;
  help_text?: string;
  placeholder?: string;
  field_type: string;
  is_required: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  display_order: number;
}

export interface Form {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  is_published: boolean;
  auto_issue_enabled: boolean;
  require_approval: boolean;
  allow_preview: boolean;
  custom_message?: string;
  fields: FormField[];
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  project_id: string;
  data: Record<string, any>;
  source: 'manual' | 'import' | 'form';
  status: 'valid' | 'error' | 'issued' | 'draft';
  validation_errors: string[];
  created_at: string;
  updated_at: string;
}

export interface SignatureAsset {
  id: string;
  signer_name: string;
  designation: string;
  institution?: string;
  capture_type: 'draw' | 'upload' | 'type';
  asset_url?: string;
  typed_font: string;
  authorization_status: 'authorized' | 'pending' | 'revoked';
  authorized_by?: string;
  created_at: string;
}

export interface Credential {
  id: string;
  credential_id: string;
  project_id: string;
  recipient_id: string;
  template_version: number;
  issued_data_snapshot: Record<string, any>;
  credential_status: 'valid' | 'revoked' | 'expired';
  issued_at: string;
  revoked_at?: string;
  revocation_reason?: string;
  artifact_digest?: string;
  pdf_asset_url?: string;
  png_asset_url?: string;
  verification_url?: string;
  replaced_credential_id?: string;
}

export interface IssuanceJob {
  id: string;
  project_id: string;
  output_mode: 'single_pdf' | 'single_png' | 'zip_pdf' | 'zip_png' | 'consolidated_pdf';
  status: 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  total_count: number;
  completed_count: number;
  error_count: number;
  progress_percentage: number;
  artifact_url?: string;
  artifact_filename?: string;
  error_summary: Array<{ recipient_id?: string; error: string }>;
  created_at: string;
  completed_at?: string;
}

export interface Project {
  id: string;
  organization_id?: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  templates: CertificateTemplate[];
  forms: Form[];
  recipient_count: number;
  issued_count: number;
}

export interface PreflightIssue {
  type: 'warning' | 'error';
  code: string;
  message: string;
  recipient_id?: string;
  element_id?: string;
}

export interface PreflightReport {
  passed: boolean;
  issues: PreflightIssue[];
  total_recipients: number;
  ready_recipients: number;
}
