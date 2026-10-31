import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle2, RefreshCw, X, 
  Archive, ShieldCheck, AlertCircle, Play, Sparkles, Users 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { IssuanceJob } from '../../types';

interface BulkQuantityPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkQuantityPdfModal: React.FC<BulkQuantityPdfModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, recipients, refreshRecipients, activeTemplate, templates, selectTemplate } = useProjectStore();

  const [outputMode, setOutputMode] = useState<'consolidated_pdf' | 'zip_pdf' | 'zip_png'>('consolidated_pdf');
  const [watermark, setWatermark] = useState<string>('GEMINI');
  const [activeJob, setActiveJob] = useState<IssuanceJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveJob(null);
      setIsSubmitting(false);
      setIsDownloading(false);
    }
  }, [isOpen]);

  // Direct In-Memory Stream Downloader (Prevents 304 Caching and SPA navigation disconnects)
  const triggerDirectDownload = async (url: string, defaultFilename: string) => {
    setIsDownloading(true);
    try {
      const resp = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!resp.ok) {
        throw new Error(`Server returned HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      
      const dispo = resp.headers.get('content-disposition');
      let filename = defaultFilename;
      if (dispo && dispo.includes('filename=')) {
        filename = dispo.split('filename=')[1].replace(/["']/g, '').trim();
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 30000);
      setIsDownloading(false);
      onClose();
    } catch (err: any) {
      console.warn('Job stream failed, using direct export endpoint:', err);
      if (!currentProject) {
        setIsDownloading(false);
        return;
      }
      const fallbackUrl = `/api/v1/projects/${currentProject.id}/export/${outputMode === 'consolidated_pdf' ? 'bulk-pdf' : outputMode === 'zip_pdf' ? 'bulk-zip' : 'bulk-png'}?template_id=${activeTemplate?.id || ''}&watermark=${encodeURIComponent(watermark)}&t=${Date.now()}`;
      try {
        const fResp = await fetch(fallbackUrl);
        if (!fResp.ok) throw new Error(`Direct export failed with HTTP ${fResp.status}`);
        const fBlob = await fResp.blob();
        const fUrl = window.URL.createObjectURL(fBlob);
        const a = document.createElement('a');
        a.href = fUrl;
        a.download = defaultFilename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(fUrl);
        }, 30000);
        setIsDownloading(false);
        onClose();
      } catch (fErr: any) {
        setIsDownloading(false);
        alert('Download failed: ' + (fErr.message || 'Please check network'));
      }
    }
  };

  // Poll for background generation progress
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await api.getIssuanceJob(activeJob.id);
        setActiveJob(updated);
        if (updated.status === 'completed' || updated.status === 'completed_with_errors') {
          clearInterval(interval);
          refreshRecipients();
        }
      } catch (err) {
        console.error('Job polling failed:', err);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  if (!isOpen || !currentProject) return null;

  const validRecipients = recipients.filter((r) => r.status !== 'error');
  const totalCount = validRecipients.length;

  const handleStartGeneration = async () => {
    if (totalCount === 0) {
      alert('Please add or import recipients in the spreadsheet first.');
      return;
    }

    setIsSubmitting(true);
    const tplId = activeTemplate?.id;
    const tplParam = tplId ? `?template_id=${tplId}` : '';
    const watermarkParam = `${tplParam ? '&' : '?'}watermark=${encodeURIComponent(watermark)}`;
    const defaultFilename = outputMode === 'consolidated_pdf'
      ? `certificates_consolidated_${currentProject.id.slice(0, 8)}.pdf`
      : `certificates_bundle_${currentProject.id.slice(0, 8)}.zip`;

    try {
      const job = await api.createIssuanceJob(currentProject.id, outputMode, tplId);
      setActiveJob(job);
      setIsSubmitting(false);
      if (job.status === 'completed' || job.artifact_url) {
        const dlUrl = `/api/v1/issuance/jobs/${job.id}/download${tplParam}${watermarkParam}&t=${Date.now()}`;
        await triggerDirectDownload(dlUrl, defaultFilename);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      const directUrl = `/api/v1/projects/${currentProject.id}/export/${outputMode === 'consolidated_pdf' ? 'bulk-pdf' : outputMode === 'zip_pdf' ? 'bulk-zip' : 'bulk-png'}${tplParam}${watermarkParam}&t=${Date.now()}`;
      await triggerDirectDownload(directUrl, defaultFilename);
    }
  };

  const handleDownloadArtifact = async () => {
    if (!activeJob || !currentProject) return;
    const tplParam = activeTemplate?.id ? `?template_id=${activeTemplate.id}` : '';
    const watermarkParam = `${tplParam ? '&' : '?'}watermark=${encodeURIComponent(watermark)}`;
    const defaultFilename = activeJob.artifact_filename || (outputMode === 'consolidated_pdf' ? 'certificates_consolidated.pdf' : 'certificates_bundle.zip');
    const dlUrl = `/api/v1/issuance/jobs/${activeJob.id}/download${tplParam}${watermarkParam}&t=${Date.now()}`;
    await triggerDirectDownload(dlUrl, defaultFilename);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Bulk Quantity Certificate Generation
              </h2>
              <p className="text-xs text-slate-500">
                Generate high-resolution vector PDF certificates in bulk for all spreadsheet recipients.
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Recipient Count & Active Template Summary Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-brand-600 font-bold shadow-2xs">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-700">Spreadsheet Recipient Roster</div>
                  <div className="text-[11px] text-slate-500">
                    {totalCount} recipients ready for bulk generation
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-slate-900">{totalCount}</span>
                <span className="text-xs text-slate-400 ml-1">Certificates</span>
              </div>
            </div>

            {/* Template Selector for Bulk Generation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl gap-2 text-xs">
              <span className="text-indigo-900 font-bold">
                Certificate Template for Export:
              </span>
              <select
                value={activeTemplate?.id || ''}
                onChange={(e) => selectTemplate(e.target.value)}
                className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none shadow-2xs"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.background_asset_url ? '(Custom Artwork)' : '(Preset Frame)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Output Format */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Choose Bulk PDF Output Format
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Option 1: Consolidated Multi-Page PDF */}
              <label
                onClick={() => setOutputMode('consolidated_pdf')}
                className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  outputMode === 'consolidated_pdf'
                    ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="outputMode"
                  checked={outputMode === 'consolidated_pdf'}
                  onChange={() => setOutputMode('consolidated_pdf')}
                  className="mt-0.5 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">Consolidated Multi-Page PDF</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    All {totalCount} certificates compiled into a single vector PDF document (1 page per recipient). Ideal for printing, archival, and fast batch exports.
                  </p>
                </div>
              </label>

              {/* Option 2: ZIP of Individual PDFs */}
              <label
                onClick={() => setOutputMode('zip_pdf')}
                className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  outputMode === 'zip_pdf'
                    ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="outputMode"
                  checked={outputMode === 'zip_pdf'}
                  onChange={() => setOutputMode('zip_pdf')}
                  className="mt-0.5 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">ZIP Archive (Individual Vector PDFs)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    A compressed ZIP file containing {totalCount} individual PDF files named after each recipient (e.g. <code>0001_Ananya_Kumar.pdf</code>).
                  </p>
                </div>
              </label>

              {/* Option 3: ZIP of High-Res PNGs */}
              <label
                onClick={() => setOutputMode('zip_png')}
                className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  outputMode === 'zip_png'
                    ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="outputMode"
                  checked={outputMode === 'zip_png'}
                  onChange={() => setOutputMode('zip_png')}
                  className="mt-0.5 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">ZIP Archive (High-Res 300 DPI PNG Images)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Rasterized 300 DPI image package for web distribution or individual email attachments.
                  </p>
                </div>
              </label>

            </div>
          </div>

          {/* Watermark Security Options Card */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950">Gemini Security Watermark</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold uppercase">
                {watermark}
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              Applies a high-authority translucent vector watermark (GEMINI / VERIFIED ACADEMIC & INSTITUTIONAL CREDENTIAL) with digital verification footer on all exported documents.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: 'Gemini (Default)', val: 'GEMINI' },
                { label: 'Verified', val: 'VERIFIED' },
                { label: 'Official', val: 'OFFICIAL' },
                { label: 'None', val: 'NONE' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setWatermark(opt.val)}
                  className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all text-center ${
                    watermark === opt.val
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-bold'
                      : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Job Progress & Completion Card */}
          {activeJob && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {activeJob.status === 'completed'
                    ? 'Generation Complete!'
                    : activeJob.status === 'failed'
                    ? 'Generation Failed'
                    : 'Generating Certificates...'}
                </span>
                <span className="font-mono text-brand-600 font-bold">
                  {Math.round(activeJob.progress_percentage)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    activeJob.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${activeJob.progress_percentage}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Completed: {activeJob.completed_count} of {activeJob.total_count || totalCount}
                </span>
                {activeJob.error_count > 0 && (
                  <span className="text-rose-600 font-semibold">Errors: {activeJob.error_count}</span>
                )}
              </div>

              {/* Big Download Button Upon Completion */}
              {activeJob.status === 'completed' && activeJob.artifact_url && (
                <div className="pt-2">
                  <button
                    onClick={handleDownloadArtifact}
                    disabled={isDownloading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-colors text-xs"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Downloading File to Browser...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>
                          {outputMode === 'consolidated_pdf'
                            ? 'Download Multi-Page PDF Document'
                            : 'Download Bulk ZIP Archive'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            {activeJob?.status === 'completed' ? 'Close' : 'Cancel'}
          </button>

          {!activeJob || activeJob.status === 'failed' ? (
            <button
              onClick={handleStartGeneration}
              disabled={isSubmitting || isDownloading || totalCount === 0}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Downloading Certificates...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Starting Background Job...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Generate {totalCount} Certificates in Bulk</span>
                </>
              )}
            </button>
          ) : activeJob.status === 'completed' ? (
            <button
              onClick={handleDownloadArtifact}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-brand-600 font-semibold">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Processing in background...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
