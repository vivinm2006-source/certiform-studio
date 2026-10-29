import React, { useState, useEffect } from 'react';
import { 
  Send, FileText, Image as ImageIcon, Archive, Download, 
  CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, Play, Sparkles 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { PreflightReport, IssuanceJob } from '../../types';

export const IssuanceCenter: React.FC = () => {
  const { currentProject, recipients, activeRecipientIndex, activeTemplate, setQuickCreateOpen } = useProjectStore();
  const [preflight, setPreflight] = useState<PreflightReport | null>(null);
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [activeJob, setActiveJob] = useState<IssuanceJob | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [downloadingMode, setDownloadingMode] = useState<string | null>(null);

  const activeRec = recipients[activeRecipientIndex];
  const recData = activeRec?.data || {};

  // Run preflight check on load
  const runPreflight = async () => {
    if (!currentProject) return;
    setIsRunningPreflight(true);
    try {
      const rep = await api.runPreflight(currentProject.id);
      setPreflight(rep);
      setIsRunningPreflight(false);
    } catch (err) {
      console.error('Failed to run preflight check:', err);
      setIsRunningPreflight(false);
    }
  };

  useEffect(() => {
    runPreflight();
  }, [currentProject?.id]);

  // Poll active background job if processing
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getIssuanceJob(activeJob.id);
        setActiveJob(updated);
        if (updated.status === 'completed' || updated.status === 'completed_with_errors') {
          useProjectStore.getState().refreshRecipients();
        }
      } catch (err) {
        console.error('Job polling error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeJob]);

  // Single PDF download for currently active recipient
  const handleDownloadSinglePdf = async () => {
    if (!activeTemplate) return;
    setIsDownloadingSingle(true);
    try {
      const resp = await fetch('/api/v1/render/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { width_pt: activeTemplate.width_pt, height_pt: activeTemplate.height_pt, background_color: activeTemplate.background_color, background_asset_url: activeTemplate.background_asset_url },
          elements: activeTemplate.elements,
          recipient_data: recData,
          format: 'pdf',
          credential_id: `CERT-SAMPLE-${(activeRecipientIndex + 1).toString().padStart(4, '0')}`,
        }),
      });
      if (!resp.ok) {
        throw new Error(`Server returned HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const personName = recData.recipient_name || recData.full_name || recData.name || recData.student_name || 'Certificate';
      a.download = `${String(personName).trim().replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 30000);
      setIsDownloadingSingle(false);
    } catch (err: any) {
      console.error('Download failed, using direct recipient endpoint fallback:', err);
      const tplId = activeTemplate?.id;
      const tplQuery = tplId ? `?template_id=${tplId}` : '';
      if (activeRec?.id) {
        window.location.href = `/api/v1/recipients/${activeRec.id}/export-pdf${tplQuery}`;
      } else {
        alert('Download failed: ' + (err.message || 'Please check connection'));
      }
      setIsDownloadingSingle(false);
    }
  };

  // Single PNG download for currently active recipient
  const handleDownloadSinglePng = async () => {
    if (!activeTemplate) return;
    setIsDownloadingSingle(true);
    try {
      const resp = await api.renderPreview({
        template: { width_pt: activeTemplate.width_pt, height_pt: activeTemplate.height_pt, background_color: activeTemplate.background_color, background_asset_url: activeTemplate.background_asset_url },
        elements: activeTemplate.elements,
        recipient_data: recData,
        format: 'png',
        credential_id: `CERT-SAMPLE-${(activeRecipientIndex + 1).toString().padStart(4, '0')}`,
      });
      const a = document.createElement('a');
      a.href = resp.data_url;
      const personName = recData.recipient_name || recData.full_name || recData.name || recData.student_name || 'Certificate';
      a.download = `${String(personName).trim().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 30000);
      setIsDownloadingSingle(false);
    } catch (err: any) {
      console.error('Download failed, using direct endpoint fallback:', err);
      const tplId = activeTemplate?.id;
      const tplQuery = tplId ? `?template_id=${tplId}` : '';
      if (activeRec?.id) {
        window.location.href = `/api/v1/recipients/${activeRec.id}/export-png${tplQuery}`;
      } else {
        alert('Download failed: ' + (err.message || 'Please check connection'));
      }
      setIsDownloadingSingle(false);
    }
  };

  // Launch bulk issuance job with direct download streaming
  const handleStartBulkJob = async (mode: string) => {
    if (!currentProject) return;
    setDownloadingMode(mode);
    setIsSubmittingJob(true);
    try {
      const tplId = activeTemplate?.id;
      const tplQuery = tplId ? `?template_id=${tplId}` : '';
      let exportUrl = `/api/v1/projects/${currentProject.id}/export/bulk-pdf${tplQuery}`;
      let defaultName = `certificates_consolidated_${currentProject.id.slice(0, 8)}.pdf`;
      if (mode === 'zip_pdf') {
        exportUrl = `/api/v1/projects/${currentProject.id}/export/bulk-zip${tplQuery}`;
        defaultName = `certificates_pdf_bundle_${currentProject.id.slice(0, 8)}.zip`;
      } else if (mode === 'zip_png') {
        exportUrl = `/api/v1/projects/${currentProject.id}/export/bulk-png${tplQuery}`;
        defaultName = `certificates_png_bundle_${currentProject.id.slice(0, 8)}.zip`;
      }

      // Trigger background issuance tracking so credentials are logged and recorded in database
      api.createIssuanceJob(currentProject.id, mode, tplId).then((job) => {
        setActiveJob(job);
      }).catch((e) => console.warn('Issuance record tracking notice:', e));

      // Direct in-memory stream download directly to browser
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error('Direct stream failed, falling back to window location');
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      useProjectStore.getState().refreshRecipients();
    } catch (err: any) {
      console.warn('Direct stream notice, redirecting to file endpoint:', err);
      const tplId = activeTemplate?.id;
      const tplQuery = tplId ? `?template_id=${tplId}` : '';
      window.location.href = `/api/v1/projects/${currentProject.id}/export/${mode === 'consolidated_pdf' ? 'bulk-pdf' : mode === 'zip_pdf' ? 'bulk-zip' : 'bulk-png'}${tplQuery}`;
    } finally {
      setIsSubmittingJob(false);
      setDownloadingMode(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-3 sm:p-6 md:p-8 select-none">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Certificate Issuance Center</h2>
              <p className="text-xs text-slate-500">
                Deterministic ReportLab vector PDFs, high-res PNGs & bulk packaging
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setQuickCreateOpen(true)}
              className="flex items-center space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate from Input</span>
            </button>
            <button
              onClick={runPreflight}
              disabled={isRunningPreflight}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunningPreflight ? 'animate-spin text-brand-500' : ''}`} />
              <span>Re-run Preflight</span>
            </button>
          </div>
        </div>

        {/* PREFLIGHT REPORT CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Automated Preflight Inspection</h3>
            </div>
            {preflight && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
                  preflight.passed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {preflight.passed ? 'Ready for Issuance' : 'Issues Detected'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xl font-bold text-slate-800">{recipients.length}</div>
              <div className="text-[11px] text-slate-500">Total Recipients</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xl font-bold text-emerald-700">{preflight?.ready_recipients ?? recipients.length}</div>
              <div className="text-[11px] text-emerald-600">Valid & Ready</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xl font-bold text-amber-700">{preflight?.issues?.length || 0}</div>
              <div className="text-[11px] text-amber-600">Inspection Notices</div>
            </div>
          </div>

          {preflight && preflight.issues.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {preflight.issues.map((iss, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                    iss.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{iss.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SINGLE RECORD EXPORT (ACTIVE RECIPIENT) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Certificate Export</h3>
              <p className="text-xs text-slate-500">
                Recipient: <strong className="text-slate-800">{recData.recipient_name || 'Selected Recipient'}</strong> ({activeRecipientIndex + 1} of {recipients.length})
              </p>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
              A4 Landscape (300 DPI)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDownloadSinglePdf}
              disabled={isDownloadingSingle}
              className="p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50/30 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-105 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Download Vector PDF</div>
                  <div className="text-[11px] text-slate-500">Embedded fonts, selectable text & vector QR</div>
                </div>
              </div>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
            </button>

            <button
              onClick={handleDownloadSinglePng}
              disabled={isDownloadingSingle}
              className="p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50/30 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Download High-Res PNG</div>
                  <div className="text-[11px] text-slate-500">Print-ready raster with antialiasing</div>
                </div>
              </div>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
            </button>
          </div>
        </div>

        {/* BULK ISSUANCE MODES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Bulk Issuance & Packaging</h3>
              <p className="text-xs text-slate-500">
                Generates credentials, registers verification IDs & packages downloads for all recipients
              </p>
            </div>
            {activeTemplate && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 self-start sm:self-center">
                <span className="text-[11px] text-slate-500 font-medium">Export Template:</span>
                <span className="text-xs font-bold text-slate-800">{activeTemplate.name}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  activeTemplate.background_asset_url 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {activeTemplate.background_asset_url ? 'Uploaded Artwork' : 'Default Preset'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between hover:border-brand-500 transition-colors">
              <div>
                <Archive className="h-6 w-6 text-indigo-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-xs">ZIP Archive of Individual PDFs</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Each certificate as a separate vector PDF named by recipient and sequence.
                </p>
              </div>
              <button
                onClick={() => handleStartBulkJob('zip_pdf')}
                disabled={isSubmittingJob}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors"
              >
                {downloadingMode === 'zip_pdf' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Preparing ZIP...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download ZIP (PDF)</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between hover:border-brand-500 transition-colors">
              <div>
                <FileText className="h-6 w-6 text-brand-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-xs">Consolidated Multi-Page PDF</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Single combined PDF document containing all recipient certificates in order.
                </p>
              </div>
              <button
                onClick={() => handleStartBulkJob('consolidated_pdf')}
                disabled={isSubmittingJob}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors"
              >
                {downloadingMode === 'consolidated_pdf' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Combined PDF</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between hover:border-brand-500 transition-colors">
              <div>
                <Archive className="h-6 w-6 text-emerald-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-xs">ZIP Archive of PNG Images</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  High-resolution 300 DPI PNG images bundled into a single ZIP archive.
                </p>
              </div>
              <button
                onClick={() => handleStartBulkJob('zip_png')}
                disabled={isSubmittingJob}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors"
              >
                {downloadingMode === 'zip_png' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Packaging PNGs...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download ZIP (PNG)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ACTIVE JOB PROGRESS BAR */}
          {activeJob && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">Job: {activeJob.output_mode.replace('_', ' ').toUpperCase()}</span>
                  <span className="font-mono text-slate-400">({activeJob.id.substring(0, 8)})</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                  activeJob.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-800'
                }`}>
                  {activeJob.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeJob.progress_percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Completed {activeJob.completed_count} of {activeJob.total_count} certificates ({activeJob.progress_percentage}%)
                </span>

                {activeJob.status === 'completed' && activeJob.artifact_url && (
                  <button
                    onClick={async () => {
                      try {
                        const tplParam = activeTemplate?.id ? `?template_id=${activeTemplate.id}&t=${Date.now()}` : `?t=${Date.now()}`;
                        const res = await fetch(`/api/v1/issuance/jobs/${activeJob.id}/download${tplParam}`, {
                          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
                        });
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = activeJob.artifact_filename || 'certificates_bundle.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (err: any) {
                        alert('Download error: ' + (err.message || 'Network issue'));
                      }
                    }}
                    className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Ready Artifact</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
