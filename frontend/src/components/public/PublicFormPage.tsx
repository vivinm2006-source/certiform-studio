import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle2, AlertCircle, ArrowLeft, 
  Send, Sparkles, Download, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { api } from '../../services/api';

export const PublicFormPage: React.FC = () => {
  const getInitialFormId = () => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const formIdx = pathParts.findIndex((p) => p === 'forms');
    if (formIdx !== -1 && pathParts[formIdx + 1]) {
      return decodeURIComponent(pathParts[formIdx + 1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('form_id') || '';
  };

  const formId = getInitialFormId();
  const [formData, setFormData] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!formId) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await api.getPublicForm(formId);
        setFormData(data);
        const defaults: Record<string, any> = {};
        (data.fields || []).forEach((f: any) => {
          defaults[f.binding_key] = f.default_value || '';
        });
        setFormValues(defaults);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load public form:', err);
        setIsLoading(false);
      }
    };
    load();
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId) return;
    setIsSubmitting(true);
    setErrors([]);
    try {
      const res = await api.submitPublicForm(formId, formValues);
      setSubmissionSuccess(res);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      const detail = err.response?.data?.detail;
      if (detail && Array.isArray(detail.errors)) {
        setErrors(detail.errors);
      } else {
        setErrors([err.message || 'Submission failed. Please check required fields.']);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3 text-slate-600">
        <RefreshCw className="h-7 w-7 animate-spin text-brand-600" />
        <span className="text-sm font-semibold">Loading Registration Form...</span>
      </div>
    );
  }

  if (!formData && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Form Not Found or Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          The requested certificate intake form is either unpublished or does not exist.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
        >
          Return to Studio
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <a href="/" className="flex items-center space-x-2.5 text-slate-900 font-bold hover:opacity-90">
          <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">CertiForm Intake</div>
            <div className="text-[10px] text-slate-400 font-medium">{formData.project_title}</div>
          </div>
        </a>

        <a
          href="/"
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Studio</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {submissionSuccess ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-4 animate-in fade-in duration-200">
            <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Registration Received Successfully!
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {formData.custom_message || 'Thank you for submitting your details. Your certificate data has been registered in the official project roster.'}
            </p>

            {submissionSuccess.issued_credential_id && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl max-w-md mx-auto text-xs space-y-2">
                <span className="font-bold text-emerald-900 block">Certificate Issued Automatically:</span>
                <span className="font-mono bg-white px-3 py-1 rounded border border-emerald-200 text-emerald-800 font-bold block">
                  {submissionSuccess.issued_credential_id}
                </span>
                <a
                  href={`/verify/${submissionSuccess.issued_credential_id}`}
                  className="inline-flex items-center space-x-1 font-semibold text-emerald-700 hover:text-emerald-900 underline pt-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>View Public Verification Record</span>
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setSubmissionSuccess(null);
                  setFormValues({});
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Submit Another Response
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            
            {/* Form Info Header */}
            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {formData.title}
              </h1>
              {formData.description && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {formData.description}
                </p>
              )}
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800">
                <span className="font-bold block">Please correct the following:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {(formData.fields || []).map((f: any) => (
                <div key={f.id} className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>
                      {f.label}
                      {f.is_required && <span className="text-rose-500 ml-0.5">*</span>}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal font-mono">
                      {`{{${f.binding_key}}}`}
                    </span>
                  </label>

                  {f.help_text && (
                    <p className="text-[11px] text-slate-500">{f.help_text}</p>
                  )}

                  {f.field_type === 'long_text' ? (
                    <textarea
                      rows={3}
                      value={formValues[f.binding_key] || ''}
                      onChange={(e) => setFormValues({ ...formValues, [f.binding_key]: e.target.value })}
                      placeholder={f.placeholder || ''}
                      required={f.is_required}
                      className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-brand-500"
                    />
                  ) : (
                    <input
                      type={f.field_type === 'email' ? 'email' : f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                      value={formValues[f.binding_key] || ''}
                      onChange={(e) => setFormValues({ ...formValues, [f.binding_key]: e.target.value })}
                      placeholder={f.placeholder || ''}
                      required={f.is_required}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 outline-none focus:border-brand-500"
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  <span className="text-rose-500">*</span> Required fields
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Registration'}</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </main>
    </div>
  );
};
