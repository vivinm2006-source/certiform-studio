import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, XCircle, Search, 
  Copy, Check, Download, ExternalLink, ArrowLeft, QrCode, Lock
} from 'lucide-react';
import { api } from '../../services/api';

export const PublicVerificationPage: React.FC = () => {
  // Extract credential ID from path: /verify/CERT-123 or /public/verify/CERT-123
  const getInitialId = () => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const verifyIdx = pathParts.findIndex((p) => p === 'verify');
    if (verifyIdx !== -1 && pathParts[verifyIdx + 1]) {
      return decodeURIComponent(pathParts[verifyIdx + 1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('credential_id') || '';
  };

  const [lookupId, setLookupId] = useState(getInitialId());
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const performLookup = async (idToVerify: string) => {
    const cleanId = idToVerify.trim();
    if (!cleanId) return;
    setIsLoading(true);
    try {
      const data = await api.verifyPublicCredential(cleanId);
      setResult(data);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setResult({ status: 'not_found', credential_id: cleanId });
    }
  };

  useEffect(() => {
    const initial = getInitialId();
    if (initial) {
      performLookup(initial);
    }
  }, []);

  const handleCopyId = () => {
    if (!result?.credential_id) return;
    navigator.clipboard.writeText(result.credential_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <a href="/" className="flex items-center space-x-2.5 text-slate-900 font-bold hover:opacity-90 transition-opacity">
          <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">CertiForm Trust</div>
            <div className="text-[10px] text-slate-400 font-medium">Public Credential Verification Portal</div>
          </div>
        </a>

        <div className="flex items-center space-x-3">
          <a
            href="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Launch Studio</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Verify a Certificate Credential</h2>
          <p className="text-xs text-slate-500">
            Enter the Credential ID found on the digital certificate or encoded in its QR verification stamp:
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              performLookup(lookupId);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. CERT-2026-000001"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:border-brand-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !lookupId.trim()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Authenticity'}
            </button>
          </form>
        </div>

        {/* Verification Result Card */}
        {result && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            
            {/* Status Banner */}
            <div
              className={`p-6 border-b flex items-center space-x-3.5 ${
                result.status === 'valid'
                  ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
                  : result.status === 'revoked'
                  ? 'bg-rose-50/80 border-rose-100 text-rose-900'
                  : 'bg-amber-50/80 border-amber-100 text-amber-900'
              }`}
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  result.status === 'valid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : result.status === 'revoked'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-amber-500 text-white shadow-xs'
                }`}
              >
                {result.status === 'valid' ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : result.status === 'revoked' ? (
                  <XCircle className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div>
                <div className="text-sm font-bold tracking-tight">
                  {result.status === 'valid' && 'Official Certificate Authenticated & Verified'}
                  {result.status === 'revoked' && 'Certificate Has Been Revoked by Issuer'}
                  {result.status === 'not_found' && 'No Certificate Found for this Credential ID'}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {result.status === 'valid' && 'This credential was issued by an authorized signatory and matches the cryptographic record.'}
                  {result.status === 'revoked' && 'This credential is no longer valid and has been officially marked as revoked.'}
                  {result.status === 'not_found' && 'The provided credential ID does not match any certificate in the authoritative registry.'}
                </div>
              </div>
            </div>

            {/* Credential Details */}
            {result.status !== 'not_found' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Conferred Recipient
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {result.recipient_name || 'Honored Recipient'}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {result.certificate_title || 'Certificate of Conformance'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Issuing Organization</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {result.issuing_organization || 'Official Issuing Authority'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Issue Timestamp</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {result.issued_at ? new Date(result.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Verified at Issuance'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Credential Identification Code</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
                        {result.credential_id}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                        title="Copy Credential ID"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Verification Status</span>
                    <span className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span>{result.status}</span>
                    </span>
                  </div>
                </div>

                {/* Revocation Details if Revoked */}
                {result.status === 'revoked' && result.revocation_reason && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                    <span className="font-bold block">Revocation Notice:</span>
                    <p>{result.revocation_reason}</p>
                    {result.revoked_at && (
                      <span className="text-[11px] text-rose-700 block">
                        Revoked on {new Date(result.revoked_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Cryptographic SHA-256 Digest */}
                {result.artifact_digest && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Cryptographic SHA-256 Fingerprint:</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-700 break-all select-all bg-white p-2 border border-slate-200 rounded">
                      {result.artifact_digest}
                    </div>
                  </div>
                )}

                {/* Read-Only Preview if available */}
                {result.read_only_preview_url && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block">Verified Certificate Artwork:</span>
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-slate-100">
                      <img src={result.read_only_preview_url} alt="Certificate Preview" className="w-full h-auto" />
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* Trust & Compliance Footer */}
        <div className="text-center text-xs text-slate-400 space-y-1 pt-6">
          <p>Verified through CertiForm Studio Authoritative Credential Engine.</p>
          <p>Cryptographically secured with immutable audit log verification.</p>
        </div>

      </main>
    </div>
  );
};
