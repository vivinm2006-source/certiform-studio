import { 
  Project, CertificateTemplate, CanvasElement, Form, FormField, 
  Recipient, SignatureAsset, Credential, IssuanceJob, PreflightReport 
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail?.message || errorBody.detail || 'Request failed');
  }
  return response.json();
}

export const api = {
  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (data: { title: string; description?: string }) => 
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) => 
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Templates & Canvas
  getTemplates: (projectId: string) => request<CertificateTemplate[]>(`/projects/${projectId}/templates`),
  getTemplate: (id: string) => request<CertificateTemplate>(`/templates/${id}`),
  createTemplate: (projectId: string, data: Partial<CertificateTemplate> & { preset?: string }) =>
    request<CertificateTemplate>(`/projects/${projectId}/templates`, { method: 'POST', body: JSON.stringify(data) }),
  duplicateTemplate: (templateId: string) =>
    request<CertificateTemplate>(`/templates/${templateId}/duplicate`, { method: 'POST' }),
  deleteTemplate: (templateId: string) =>
    request<{ success: boolean; message: string }>(`/templates/${templateId}`, { method: 'DELETE' }),
  loadPreset: (templateId: string, preset: string) =>
    request<CertificateTemplate>(`/templates/${templateId}/load-preset`, { method: 'POST', body: JSON.stringify({ preset }) }),
  updateTemplate: (id: string, data: Partial<CertificateTemplate>) => 
    request<CertificateTemplate>(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  batchSyncElements: (templateId: string, elements: CanvasElement[]) => 
    request<CanvasElement[]>(`/templates/${templateId}/elements/batch`, { method: 'PUT', body: JSON.stringify(elements) }),
  uploadTemplateBackground: async (templateId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ success: boolean; background_asset_url: string }>(`/templates/${templateId}/upload-background`, {
      method: 'POST',
      body: fd,
    });
  },

  // Forms
  getForm: (id: string) => request<Form>(`/forms/${id}`),
  updateForm: (id: string, data: Partial<Form>) => 
    request<Form>(`/forms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addFormField: (formId: string, field: Partial<FormField>) => 
    request<FormField>(`/forms/${formId}/fields`, { method: 'POST', body: JSON.stringify(field) }),
  deleteFormField: (formId: string, fieldId: string) => 
    request<{ success: boolean }>(`/forms/${formId}/fields/${fieldId}`, { method: 'DELETE' }),
  getPublicForm: (id: string) => request<any>(`/public/forms/${id}`),
  submitPublicForm: (id: string, data: Record<string, any>) => 
    request<any>(`/public/forms/${id}/submissions`, { method: 'POST', body: JSON.stringify({ data }) }),

  // Recipients
  getRecipients: (projectId: string, page = 1, pageSize = 50, search = '', status = 'all') => 
    request<{ items: Recipient[]; total: number; page: number; pageSize: number; total_pages: number }>(
      `/projects/${projectId}/recipients?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}&status=${status}`
    ),
  createRecipient: (projectId: string, data: Record<string, any>) => 
    request<Recipient>(`/projects/${projectId}/recipients`, { 
      method: 'POST', 
      body: JSON.stringify({ data, source: 'manual', status: 'valid' }) 
    }),
  updateRecipient: (id: string, data: Record<string, any>) => 
    request<Recipient>(`/recipients/${id}`, { method: 'PATCH', body: JSON.stringify({ data }) }),
  deleteRecipient: (id: string) => request<{ success: boolean }>(`/recipients/${id}`, { method: 'DELETE' }),
  parseSpreadsheetFile: async (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{
      headers: string[];
      available_keys: string[];
      suggested_mapping: Record<string, string>;
      preview_rows: any[];
      total_rows: number;
      raw_rows: any[];
    }>(`/projects/${projectId}/recipients/parse-file`, { method: 'POST', body: fd });
  },
  importRecipients: (projectId: string, rows: any[], column_mapping: Record<string, string>, clear_existing = false) => 
    request<{ success: boolean; imported_count: number }>(`/projects/${projectId}/recipients/import`, {
      method: 'POST',
      body: JSON.stringify({ rows, column_mapping, clear_existing })
    }),
  getBulkPdfUrl: (projectId: string) => `/api/v1/projects/${projectId}/export/bulk-pdf`,
  getBulkZipUrl: (projectId: string) => `/api/v1/projects/${projectId}/export/bulk-zip`,
  getBulkPngUrl: (projectId: string) => `/api/v1/projects/${projectId}/export/bulk-png`,

  // Signatures
  getSignatures: () => request<SignatureAsset[]>('/signatures'),
  createSignature: (data: Partial<SignatureAsset>) => 
    request<SignatureAsset>('/signatures', { method: 'POST', body: JSON.stringify(data) }),
  uploadSignatureImage: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ success: boolean; asset_url: string }>('/signatures/upload', { method: 'POST', body: fd });
  },
  deleteSignature: (id: string) => request<{ success: boolean }>(`/signatures/${id}`, { method: 'DELETE' }),

  // Rendering & Issuance
  renderPreview: (payload: {
    template: any;
    elements: any[];
    recipient_data: Record<string, any>;
    format?: 'png' | 'pdf';
    credential_id?: string;
  }) => request<{ mime_type: string; data_url: string; width: number; height: number }>('/render/preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  runPreflight: (projectId: string) => request<PreflightReport>(`/projects/${projectId}/preflight`, { method: 'POST' }),
  createIssuanceJob: (projectId: string, output_mode: string) => 
    request<IssuanceJob>(`/projects/${projectId}/issuance/jobs`, {
      method: 'POST',
      body: JSON.stringify({ output_mode })
    }),
  getIssuanceJob: (jobId: string) => request<IssuanceJob>(`/issuance/jobs/${jobId}`),

  // Verification & Credentials
  createInstantCertificate: (projectId: string, data: Record<string, any>) => 
    request<{
      success: boolean;
      message: string;
      recipient_id: string;
      credential_id: string;
      verification_url: string;
      preview_png: string;
      download_pdf_url: string;
      download_png_url: string;
      recipient: any;
    }>(`/projects/${projectId}/instant-certificate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyPublicCredential: (credentialId: string) => request<any>(`/public/verify/${credentialId}`),
  getProjectCredentials: (projectId: string) => request<Credential[]>(`/projects/${projectId}/credentials`),
  revokeCredential: (credentialId: string, reason: string) => 
    request<Credential>(`/credentials/${credentialId}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reissueCredential: (credentialId: string, updated_data: Record<string, any>, reason: string) => 
    request<Credential>(`/credentials/${credentialId}/reissue`, {
      method: 'POST',
      body: JSON.stringify({ updated_data, reason })
    }),
};
