import React, { useState } from 'react';
import { 
  Mail, Send, CheckCircle2, AlertCircle, X, 
  RefreshCw, ShieldCheck, Users, Info, Check, AlertTriangle
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';

interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DispatchResult {
  recipient_id: string;
  recipient_name: string;
  recipient_email?: string;
  status: string;
  mode?: string;
  reason?: string;
  error?: string;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, recipients, refreshRecipients, activeTemplate, templates, selectTemplate } = useProjectStore();

  const [watermark, setWatermark] = useState<string>('GEMINI');
  const [onlyUnsent, setOnlyUnsent] = useState<boolean>(true);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchSummary, setDispatchSummary] = useState<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    results: DispatchResult[];
  } | null>(null);

  if (!isOpen || !currentProject) return null;

  // Compute recipient email statistics
  const recipientsWithEmail = recipients.filter((r) => {
    const d = r.data || {};
    const email = d.email || d.mail || d.email_address || d.e_mail || d.Email || d.Mail;
    return typeof email === 'string' && email.includes('@') && email.includes('.');
  });

  const recipientsAlreadySent = recipientsWithEmail.filter((r) => r.data?.email_sent);
  const eligibleRecipients = onlyUnsent
    ? recipientsWithEmail.filter((r) => !r.data?.email_sent)
    : recipientsWithEmail;

  const countMissingEmail = recipients.length - recipientsWithEmail.length;

  const handleStartDispatch = async () => {
    if (eligibleRecipients.length === 0) {
      alert('No eligible recipients with email addresses found to send.');
      return;
    }

    setIsSending(true);
    setDispatchSummary(null);

    try {
      const res = await api.emailProjectCertificates(currentProject.id, {
        template_id: activeTemplate?.id,
        watermark: watermark,
        only_unsent: onlyUnsent,
        custom_message: customMessage.trim() ? customMessage.trim() : undefined,
      });

      setDispatchSummary({
        total: res.total_recipients,
        sent: res.emails_sent,
        skipped: res.skipped_no_email,
        failed: res.failed_count,
        results: res.recipient_results,
      });

      await refreshRecipients();
    } catch (err: any) {
      alert('Email dispatch failure: ' + (err.message || 'Check network connection or server logs'));
    } finally {
      setIsSending(false);
    }
  };

  const handleResetAndClose = () => {
    setDispatchSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Individual Certificate Email Dispatch
              </h2>
              <p className="text-xs text-slate-500">
                Send each recipient their personalized certificate attached as a vector PDF with Gemini watermark.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Records</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{recipients.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">In spreadsheet roster</div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Ready With Email</div>
              <div className="text-xl font-bold text-indigo-900 mt-1">{recipientsWithEmail.length}</div>
              <div className="text-[10px] text-indigo-600 mt-0.5">
                {recipientsAlreadySent.length > 0 ? `${recipientsAlreadySent.length} already sent` : 'Valid email addresses'}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Missing Email</div>
              <div className="text-xl font-bold text-amber-900 mt-1">{countMissingEmail}</div>
              <div className="text-[10px] text-amber-700 mt-0.5">Will be skipped safely</div>
            </div>
          </div>

          {!dispatchSummary ? (
            <>
              {/* Template Selector */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Certificate Template:</span>
                  <select
                    value={activeTemplate?.id || ''}
                    onChange={(e) => selectTemplate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.page_format || 'A4 Landscape'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-500">
                  Each certificate is individually rendered with recipient name, verified credential ID, and QR code.
                </div>
              </div>

              {/* Watermark Assurance Card */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      Authoritative Watermark: {watermark}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Vector PDF attachments include the high-visibility GEMINI verification watermark.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>

              {/* Configuration Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={onlyUnsent}
                    onChange={(e) => setOnlyUnsent(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>
                    Only send to recipients who have not received their email yet ({eligibleRecipients.length} eligible)
                  </span>
                </label>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Custom Message in Email Body (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="E.g., Thank you for participating in our program. Your official credential has been verified and attached."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                  />
                </div>
              </div>

              {/* Delivery Protocol Notice */}
              <div className="flex items-start space-x-2 p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Individual Recipient Isolation:</strong> Each email is generated and addressed strictly to the recipient's mail ID. No other participant's name or data is shared or exposed.
                </div>
              </div>
            </>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-900">Email Dispatch Execution Complete</div>
                    <div className="text-xs text-emerald-700">
                      Successfully dispatched {dispatchSummary.sent} individual certificate emails.
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-900">{dispatchSummary.sent}</span>
                  <span className="text-xs text-emerald-700 block">Sent</span>
                </div>
              </div>

              {/* Result Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Email Address</th>
                      <th className="px-3 py-2">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dispatchSummary.results.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{res.recipient_name}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                          {res.recipient_email || 'No email registered'}
                        </td>
                        <td className="px-3 py-2">
                          {res.status === 'sent' && (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              <Check className="h-3 w-3" />
                              <span>Delivered ({res.mode || 'verified'})</span>
                            </span>
                          )}
                          {res.status === 'skipped' && (
                            <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                              <span>Skipped ({res.reason || 'Missing email'})</span>
                            </span>
                          )}
                          {res.status === 'failed' && (
                            <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Failed ({res.error || 'Delivery issue'})</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleResetAndClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {dispatchSummary ? 'Done' : 'Cancel'}
          </button>

          {!dispatchSummary ? (
            <button
              onClick={handleStartDispatch}
              disabled={isSending || eligibleRecipients.length === 0}
              className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Dispatching Individual Emails...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send to All {eligibleRecipients.length} Recipient Emails</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setDispatchSummary(null)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Send Another Batch
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
