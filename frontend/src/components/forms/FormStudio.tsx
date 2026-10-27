import React, { useState } from 'react';
import { 
  Plus, Trash2, Copy, Move, CheckSquare, Eye, ExternalLink, 
  Send, Sparkles, CheckCircle2, AlertCircle, Share2, Globe,
  Download, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { FormField } from '../../types';
import { api } from '../../services/api';

export const FormStudio: React.FC = () => {
  const { currentProject, activeForm } = useProjectStore();
  const [copied, setCopied] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  if (!activeForm || !currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading form editor...
      </div>
    );
  }

  const handleUpdateForm = async (updates: Partial<typeof activeForm>) => {
    try {
      const updated = await api.updateForm(activeForm.id, updates);
      useProjectStore.setState({ activeForm: updated });
    } catch (err) {
      console.error('Failed to update form:', err);
    }
  };

  const handleAddField = async () => {
    const order = activeForm.fields.length;
    const defaultLabel = `Question ${order + 1}`;
    const bindingKey = `field_${Date.now().toString(36)}`;
    try {
      const newField = await api.addFormField(activeForm.id, {
        label: defaultLabel,
        binding_key: bindingKey,
        field_type: 'text',
        is_required: true,
        display_order: order,
      });
      useProjectStore.setState({
        activeForm: {
          ...activeForm,
          fields: [...activeForm.fields, newField],
        },
      });
    } catch (err) {
      console.error('Failed to add field:', err);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await api.deleteFormField(activeForm.id, fieldId);
      useProjectStore.setState({
        activeForm: {
          ...activeForm,
          fields: activeForm.fields.filter((f) => f.id !== fieldId),
        },
      });
    } catch (err) {
      console.error('Failed to delete field:', err);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/forms/${activeForm.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.submitPublicForm(activeForm.id, previewFormData);
      setSubmissionResult(res);
      useProjectStore.getState().refreshRecipients();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    }
  };

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-3 sm:p-6 md:p-8 select-none">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 sm:px-6 py-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Intake Form Settings</h2>
              <p className="text-xs text-slate-500">Public respondent portal & certificate variable bindings</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 sm:space-x-3">
            <button
              onClick={() => {
                setSubmissionResult(null);
                setPreviewFormData({
                  recipient_name: 'Dr. Michael Chang',
                  email: 'michael.chang@berkeley.edu',
                  event_name: 'Annual Leadership Conference 2026',
                  event_date: 'October 27, 2026',
                  institution: 'Department of Electrical Engineering'
                });
                setShowPreviewModal(true);
              }}
              className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
              title="Give user inputs and automatically generate & issue certificate on submission"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Test Auto-Creation</span>
            </button>
            <button
              onClick={copyPublicLink}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-500" />
              <span>{copied ? 'Link Copied!' : 'Copy Public Form Link'}</span>
            </button>
          </div>
        </div>

        {/* Form Title & Configuration Header Card */}
        <div className="bg-white rounded-xl border-t-8 border-brand-500 border-x border-b border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <input
            type="text"
            value={activeForm.title}
            onChange={(e) => handleUpdateForm({ title: e.target.value })}
            className="w-full text-2xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none pb-1"
            placeholder="Form Title"
          />
          <textarea
            rows={2}
            value={activeForm.description || ''}
            onChange={(e) => handleUpdateForm({ description: e.target.value })}
            className="w-full text-xs text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none resize-none"
            placeholder="Form description or instructions for attendees..."
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeForm.is_published}
                onChange={(e) => handleUpdateForm({ is_published: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-700">Form Published (Accepting Submissions)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeForm.auto_issue_enabled}
                onChange={(e) => handleUpdateForm({ auto_issue_enabled: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-700">Auto-Issue Certificate Upon Submission</span>
            </label>
          </div>
        </div>

        {/* Form Questions / Fields List */}
        <div className="space-y-4">
          {activeForm.fields.map((field, idx) => (
            <div
              key={field.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-400">Q{idx + 1}</span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        const newFields = activeForm.fields.map((f) =>
                          f.id === field.id ? { ...f, label: newLabel } : f
                        );
                        useProjectStore.setState({ activeForm: { ...activeForm, fields: newFields } });
                      }}
                      className="text-sm font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none w-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={field.help_text || ''}
                    placeholder="Add optional help text..."
                    onChange={(e) => {
                      const newFields = activeForm.fields.map((f) =>
                        f.id === field.id ? { ...f, help_text: e.target.value } : f
                      );
                      useProjectStore.setState({ activeForm: { ...activeForm, fields: newFields } });
                    }}
                    className="text-xs text-slate-400 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none w-full ml-5"
                  />
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <select
                    value={field.field_type}
                    onChange={(e) => {
                      const newFields = activeForm.fields.map((f) =>
                        f.id === field.id ? { ...f, field_type: e.target.value } : f
                      );
                      useProjectStore.setState({ activeForm: { ...activeForm, fields: newFields } });
                    }}
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 bg-white outline-none"
                  >
                    <option value="text">Short Text</option>
                    <option value="email">Email Address</option>
                    <option value="date">Date</option>
                    <option value="long_text">Paragraph Text</option>
                    <option value="number">Number</option>
                  </select>

                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Delete Question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Binding key and required toggle footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">Certificate Variable:</span>
                  <span className="font-mono text-brand-600 bg-brand-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                    {`{{${field.binding_key}}}`}
                  </span>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <span className="text-xs text-slate-600">Required</span>
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => {
                      const newFields = activeForm.fields.map((f) =>
                        f.id === field.id ? { ...f, is_required: e.target.checked } : f
                      );
                      useProjectStore.setState({ activeForm: { ...activeForm, fields: newFields } });
                    }}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleAddField}
            className="flex items-center space-x-2 bg-white border border-slate-300 hover:border-brand-500 hover:bg-brand-50/50 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4 text-brand-600" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Respondent Form Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{activeForm.title}</h3>
                <p className="text-xs text-slate-500">{activeForm.description || 'Fill out the form below.'}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {submissionResult ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">Submission Successful!</h4>
                <p className="text-xs text-slate-600">{submissionResult.message}</p>
                {submissionResult.credential_id && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-300 font-mono text-xs text-emerald-800">
                    Credential ID: {submissionResult.credential_id}
                  </div>
                )}
                <button
                  onClick={() => setSubmissionResult(null)}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Submit another response
                </button>
              </div>
            ) : (
              <form onSubmit={handleTestSubmit} className="space-y-4">
                {activeForm.fields.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      {f.label} {f.is_required && <span className="text-rose-500">*</span>}
                    </label>
                    {f.help_text && <p className="text-[11px] text-slate-400">{f.help_text}</p>}
                    <input
                      type={f.field_type === 'email' ? 'email' : f.field_type === 'date' ? 'date' : 'text'}
                      required={f.is_required}
                      placeholder={f.placeholder || `Enter ${f.label}`}
                      value={previewFormData[f.binding_key] || ''}
                      onChange={(e) => setPreviewFormData({ ...previewFormData, [f.binding_key]: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Response</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
