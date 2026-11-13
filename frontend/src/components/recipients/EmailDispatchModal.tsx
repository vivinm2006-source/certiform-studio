import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, CheckCircle2, AlertCircle, X, 
  RefreshCw, ShieldCheck, Users, Info, Check, AlertTriangle,
  Server, Key, Settings, ExternalLink, ChevronDown, ChevronUp
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

export interface SmtpConfigState {
  provider: 'gmail' | 'outlook' | 'brevo' | 'sendgrid' | 'custom';
  host: string;
  port: number;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  simulation_mode: boolean;
}

const DEFAULT_SMTP: SmtpConfigState = {
  provider: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  user: '',
  password: '',
  from_email: '',
  from_name: 'CertiForm Studio Credentials',
  use_tls: true,
  use_ssl: false,
  simulation_mode: false,
};

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

  // SMTP Configuration State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigState>(() => {
    try {
      const saved = localStorage.getItem('certiform_smtp_config');
      if (saved) return { ...DEFAULT_SMTP, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_SMTP;
  });

  const [showSmtpSettings, setShowSmtpSettings] = useState<boolean>(false);
  const [envSmtpActive, setEnvSmtpActive] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if SMTP is configured either in environment or in user state
  useEffect(() => {
    if (isOpen) {
      api.getSmtpStatus().then((status) => {
        if (status.is_configured) {
          setEnvSmtpActive(true);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // Persist SMTP state to localStorage on modification
  const updateSmtpConfig = (updates: Partial<SmtpConfigState>) => {
    setSmtpConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('certiform_smtp_config', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleProviderSelect = (provider: SmtpConfigState['provider']) => {
    if (provider === 'gmail') {
      updateSmtpConfig({
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        use_tls: true,
        use_ssl: false,
      });
    } else if (provider === 'outlook') {
      updateSmtpConfig({
        provider: 'outlook',
        host: 'smtp-mail.outlook.com',
        port: 587,
        use_tls: true,
        use_ssl: false,
      });
    } else if (provider === 'brevo') {
      updateSmtpConfig({
        provider: 'brevo',
        host: 'smtp-relay.brevo.com',
        port: 587,
        use_tls: true,
        use_ssl: false,
      });
    } else if (provider === 'sendgrid') {
      updateSmtpConfig({
        provider: 'sendgrid',
        host: 'smtp.sendgrid.net',
        port: 587,
        user: 'apikey',
        use_tls: true,
        use_ssl: false,
      });
    } else {
      updateSmtpConfig({ provider: 'custom' });
    }
  };

  const isSmtpReady = envSmtpActive || Boolean(smtpConfig.host && smtpConfig.user && smtpConfig.password) || smtpConfig.simulation_mode;

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

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setTestResult(null);
    try {
      const emailToTest = testEmailAddress.trim() || smtpConfig.user || 'test@example.com';
      const res = await api.testSmtpConnection(smtpConfig, emailToTest);
      setTestResult({
        success: true,
        message: res.message || 'SMTP Authentication Verified! Connection is live.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to authenticate with SMTP server. Please verify your credentials.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleStartDispatch = async () => {
    if (eligibleRecipients.length === 0) {
      alert('No eligible recipients with email addresses found to send.');
      return;
    }

    if (!isSmtpReady) {
      setShowSmtpSettings(true);
      alert('Outgoing mail server is not configured! Real emails cannot be delivered until you configure your Gmail or SMTP credentials in the SMTP Mailer Configuration panel below.');
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
        smtp_config: smtpConfig,
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
      alert('Email dispatch failure: ' + (err.message || 'Check network connection or SMTP settings'));
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
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
                Deliver official certificates directly to each recipient's personal email inbox with vector PDF attachment.
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

          {/* CRITICAL SMTP CONFIGURATION ACCORDION */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowSmtpSettings(!showSmtpSettings)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-indigo-50/80 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Server className="h-4 w-4 text-indigo-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>Outgoing Email (SMTP) Mailer Setup</span>
                    {isSmtpReady ? (
                      <span className="text-[10px] font-semibold px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.2 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                        Required for Delivery
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {smtpConfig.user ? `Sending as ${smtpConfig.user} via ${smtpConfig.host}` : 'Connect your Gmail or SMTP server to deliver real emails to recipients'}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-indigo-600 font-semibold text-xs">
                <span>{showSmtpSettings ? 'Hide Settings' : 'Configure Mailer'}</span>
                {showSmtpSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Expanded SMTP Settings Panel */}
            {showSmtpSettings && (
              <div className="p-4 pt-2 border-t border-indigo-100 bg-white space-y-4">
                
                {/* Provider Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Email Provider:
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'gmail', label: 'Gmail' },
                      { id: 'outlook', label: 'Outlook' },
                      { id: 'brevo', label: 'Brevo' },
                      { id: 'sendgrid', label: 'SendGrid' },
                      { id: 'custom', label: 'Custom' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderSelect(p.id as any)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                          smtpConfig.provider === p.id
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gmail Guidance Box */}
                {smtpConfig.provider === 'gmail' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-700" />
                      <span>Important for Gmail Accounts (Google Security):</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] space-y-1 text-amber-800 leading-relaxed">
                      <li>Google requires an <strong>App Password</strong> instead of your regular password.</li>
                      <li>Visit <strong>myaccount.google.com/security</strong> and ensure <strong>2-Step Verification</strong> is ON.</li>
                      <li>Go to <strong>myaccount.google.com/apppasswords</strong>, create an App Password named "CertiForm".</li>
                      <li>Copy the <strong>16-character code</strong> (e.g. <code>abcd efgh ijkl mnop</code>) and paste it into the Password field below.</li>
                    </ol>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Address (Username):
                    </label>
                    <input
                      type="email"
                      value={smtpConfig.user}
                      onChange={(e) => updateSmtpConfig({ user: e.target.value, from_email: e.target.value })}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      App Password / Password:
                    </label>
                    <input
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => updateSmtpConfig({ password: e.target.value.replace(/\s+/g, '') })}
                      placeholder="16-character Google App Password"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sender Name (Displayed in Inbox):
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.from_name}
                      onChange={(e) => updateSmtpConfig({ from_name: e.target.value })}
                      placeholder="e.g. Vanexa Tech Hub Certifications"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SMTP Host & Port:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={smtpConfig.host}
                        onChange={(e) => updateSmtpConfig({ host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="flex-1 text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <input
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => updateSmtpConfig({ port: parseInt(e.target.value) || 587 })}
                        placeholder="587"
                        className="w-16 text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Connection Test Row */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Send test email to your address..."
                      className="text-xs p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleTestSmtpConnection}
                      disabled={isTestingSmtp || !smtpConfig.host || !smtpConfig.user || !smtpConfig.password}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap flex items-center space-x-1.5"
                    >
                      {isTestingSmtp ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <span>Test Connection</span>
                      )}
                    </button>
                  </div>

                  <label className="flex items-center space-x-2 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smtpConfig.simulation_mode}
                      onChange={(e) => updateSmtpConfig({ simulation_mode: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>Dry-run simulation mode</span>
                  </label>
                </div>

                {/* Test Result Message Banner */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}

              </div>
            )}
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
                      Vector PDF attachments include the authoritative GEMINI verification watermark.
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
              <div className={`p-4 border rounded-xl flex items-center justify-between ${
                dispatchSummary.sent > 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {dispatchSummary.sent > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <div className={`text-sm font-bold ${dispatchSummary.sent > 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {dispatchSummary.sent > 0 ? 'Email Dispatch Execution Complete' : 'Email Delivery Blocked'}
                    </div>
                    <div className={`text-xs ${dispatchSummary.sent > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {dispatchSummary.sent > 0
                        ? `Successfully delivered ${dispatchSummary.sent} individual certificate emails.`
                        : 'No emails were delivered. Please verify your SMTP credentials above.'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${dispatchSummary.sent > 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {dispatchSummary.sent}
                  </span>
                  <span className={`text-xs block ${dispatchSummary.sent > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Delivered
                  </span>
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
                              <span>Delivered ({res.mode === 'smtp' ? 'Inbox Verified' : 'Simulated'})</span>
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
              className={`flex items-center space-x-2 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-xs transition-colors disabled:opacity-50 ${
                isSmtpReady ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-700 hover:bg-slate-800'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Transmitting Individual Emails...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>
                    {isSmtpReady
                      ? `Send to All ${eligibleRecipients.length} Recipient Inboxes`
                      : 'Configure SMTP to Deliver'}
                  </span>
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
