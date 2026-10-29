import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Download, CheckCircle2, Copy, ExternalLink, 
  RefreshCw, ShieldCheck, FileText, ArrowRight, X, Eye 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';

interface InstantCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstantCertificateModal: React.FC<InstantCertificateModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, activeTemplate, refreshRecipients, setActiveRecipientIndex, setActiveWorkspace } = useProjectStore();

  const [formData, setFormData] = useState({
    recipient_name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@stanford.edu',
    institution: 'Stanford University',
    department: 'Department of Computer Science',
    dob: '1998-05-14',
    award_title: 'Excellence in AI & Quantum Computing',
    event_name: 'Annual Leadership Conference 2026',
    event_date: 'October 27, 2026',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    credential_id: string;
    recipient_id: string;
    verification_url: string;
    preview_png: string;
    download_pdf_url: string;
    download_png_url: string;
    message: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIssuedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setIsGenerating(true);
    try {
      const res = await api.createInstantCertificate(currentProject.id, formData);
      setIssuedResult(res);
      await refreshRecipients();
      setIsGenerating(false);
    } catch (err: any) {
      setIsGenerating(false);
      alert(err.message || 'Failed to generate certificate');
    }
  };

  const copyVerificationLink = () => {
    if (!issuedResult?.verification_url) return;
    navigator.clipboard.writeText(issuedResult.verification_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenInStudio = () => {
    if (issuedResult) {
      const allRecs = useProjectStore.getState().recipients;
      const idx = allRecs.findIndex((r) => r.id === issuedResult.recipient_id);
      if (idx !== -1) {
        setActiveRecipientIndex(idx);
      }
    }
    onClose();
    setActiveWorkspace('studio');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Instant Certificate Generator
              </h2>
              <p className="text-xs text-slate-500">
                Input recipient information to immediately generate, preview, issue, and export official credentials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns (Inputs on Left, Live Preview on Right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Left Column: Form Inputs (5 cols) */}
          <div className="md:col-span-5 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                1. Recipient & Event Details
              </span>
              <span className="text-[11px] text-brand-600 font-medium">Live syncs to preview</span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Recipient Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.recipient_name}
                  onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g. sarah.jenkins@example.com"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Institution / University
                  </label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => handleInputChange('institution', e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Department / Branch
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    placeholder="e.g. 1998-05-14"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Award / Recognition Honor
                  </label>
                  <input
                    type="text"
                    value={formData.award_title}
                    onChange={(e) => handleInputChange('award_title', e.target.value)}
                    placeholder="e.g. Excellence in AI Research"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Event / Program
                  </label>
                  <input
                    type="text"
                    value={formData.event_name}
                    onChange={(e) => handleInputChange('event_name', e.target.value)}
                    placeholder="e.g. Annual Summit 2026"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Date of Conformance
                  </label>
                  <input
                    type="text"
                    value={formData.event_date}
                    onChange={(e) => handleInputChange('event_date', e.target.value)}
                    placeholder="e.g. October 27, 2026"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Submit / Trigger Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating & Issuing Credential...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create & Issue Certificate Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* If Certificate Was Successfully Issued */}
            {issuedResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Credential Successfully Issued!</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Official Credential ID</div>
                    <div className="font-mono text-xs font-bold text-slate-900">{issuedResult.credential_id}</div>
                  </div>
                  <button
                    onClick={copyVerificationLink}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs flex items-center space-x-1"
                    title="Copy verification link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Instant Download Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={issuedResult.download_pdf_url}
                    download
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </a>
                  <a
                    href={issuedResult.download_png_url}
                    download
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    <span>Download PNG</span>
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <a
                    href={issuedResult.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verify Authenticity</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>

                  <button
                    onClick={handleOpenInStudio}
                    className="text-brand-600 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <span>Edit in Studio</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Instant Certificate Preview (7 cols) */}
          <div className="md:col-span-7 bg-slate-100 p-6 flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full flex items-center justify-between pb-3">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Live Certificate Preview
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                A4 Landscape (Vector ReportLab / 300 DPI)
              </span>
            </div>

            {/* Certificate Preview Card */}
            <div className="w-full max-w-lg aspect-[1.414/1] bg-[#FCFAF5] rounded-lg shadow-lg border border-slate-300/80 p-5 flex flex-col justify-between relative overflow-hidden select-none">
              
              {/* Outer Decorative Border */}
              <div className="absolute inset-2 border-2 border-[#0F2841] pointer-events-none" />
              <div className="absolute inset-3 border border-[#C89D42] pointer-events-none" />

              {/* Institution Header */}
              <div className="text-center pt-2 relative z-10">
                <div className="text-[8px] font-bold text-[#0F2841] uppercase tracking-[0.2em] font-sans">
                  INTERNATIONAL ACADEMY OF ADVANCED SCIENCES & TECHNOLOGY
                </div>
                <div className="w-24 h-[1px] bg-[#C89D42] mx-auto mt-1" />
              </div>

              {/* Certificate Title */}
              <div className="text-center relative z-10 py-1">
                <h3 className="text-base font-bold text-[#0F2841] uppercase tracking-[0.15em] font-serif">
                  CERTIFICATE OF ACHIEVEMENT
                </h3>
                <div className="text-[7px] text-slate-500 uppercase tracking-[0.2em] mt-0.5">
                  THIS CERTIFICATE IS PROUDLY CONFERRED UPON
                </div>
              </div>

              {/* Recipient Name Centerpiece */}
              <div className="text-center relative z-10 py-1">
                <div className="text-xl font-bold text-[#0F2841] font-serif tracking-wide border-b border-[#C89D42] pb-1 max-w-[80%] mx-auto truncate">
                  {formData.recipient_name || 'Recipient Name'}
                </div>
                <p className="text-[7.5px] text-slate-600 mt-1 max-w-[85%] mx-auto leading-relaxed italic">
                  {formData.department ? <span className="font-semibold text-slate-800">{formData.department} &bull; </span> : null}
                  in recognition of distinguished participation and outstanding academic contributions to the{' '}
                  <span className="font-semibold text-slate-800">{formData.event_name}</span> on{' '}
                  <span className="font-semibold text-slate-800">{formData.event_date}</span>.
                </p>
              </div>

              {/* Bottom Signatures & QR Section */}
              <div className="grid grid-cols-3 items-end pb-2 relative z-10 px-2 text-center">
                
                {/* Left Signer */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-normal text-[#0F2841]" style={{ fontFamily: 'Great Vibes, cursive' }}>
                    Marcus Vance
                  </div>
                  <div className="w-16 h-[1px] bg-slate-400 mt-0.5" />
                  <div className="text-[6.5px] text-slate-700 font-semibold uppercase tracking-wider mt-0.5">
                    Dr. Marcus Vance
                  </div>
                  <div className="text-[5.5px] text-slate-500">Organizing Secretary</div>
                </div>

                {/* Center QR Verification */}
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 bg-white p-1 border border-slate-300 rounded shadow-2xs">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                      <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="5" width="20" height="20" fill="#fff" />
                      <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="75" y="5" width="20" height="20" fill="#fff" />
                      <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="75" width="20" height="20" fill="#fff" />
                      <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                      <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="text-[6px] font-mono text-slate-500 mt-0.5">
                    {issuedResult?.credential_id || 'ID: CERT-SAMPLE-001'}
                  </div>
                  <div className="text-[5px] text-emerald-600 font-semibold">Authoritative QR</div>
                </div>

                {/* Right Signer */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-normal text-[#0F2841]" style={{ fontFamily: 'Great Vibes, cursive' }}>
                    Elena Rostova
                  </div>
                  <div className="w-16 h-[1px] bg-slate-400 mt-0.5" />
                  <div className="text-[6.5px] text-slate-700 font-semibold uppercase tracking-wider mt-0.5">
                    Prof. Elena Rostova
                  </div>
                  <div className="text-[5.5px] text-slate-500">Conference Director</div>
                </div>

              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-center">
              All typography, borders, and vector geometries conform to exact physical print standards.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
