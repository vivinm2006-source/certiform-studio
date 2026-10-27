import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search, 
  RotateCcw, History, FileText, Ban, ExternalLink, QrCode 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Credential } from '../../types';

export const VerificationCenter: React.FC = () => {
  const { currentProject } = useProjectStore();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Controlled Revocation modal state
  const [revokingCredId, setRevokingCredId] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Controlled Reissuance modal state
  const [reissuingCred, setReissuingCred] = useState<Credential | null>(null);
  const [reissueName, setReissueName] = useState('');
  const [reissueReason, setReissueReason] = useState('');

  // Audit trail state
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  const loadCredentials = async () => {
    if (!currentProject) return;
    try {
      const list = await api.getProjectCredentials(currentProject.id);
      setCredentials(list);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const loadAuditTrail = async () => {
    if (!currentProject) return;
    try {
      const resp = await fetch(`/api/v1/projects/${currentProject.id}/audit-events`);
      if (resp.ok) {
        const events = await resp.json();
        setAuditEvents(events);
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    }
  };

  useEffect(() => {
    loadCredentials();
    loadAuditTrail();
  }, [currentProject?.id]);

  const handleLookup = async (idToLookup?: string) => {
    const cid = (idToLookup || lookupId).trim();
    if (!cid) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyPublicCredential(cid);
      setVerificationResult(res);
      setIsVerifying(false);
    } catch (err: any) {
      setIsVerifying(false);
      setVerificationResult({ status: 'not_found', credential_id: cid });
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingCredId || !revocationReason) return;
    try {
      await api.revokeCredential(revokingCredId, revocationReason);
      setRevokingCredId(null);
      setRevocationReason('');
      loadCredentials();
      loadAuditTrail();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke credential');
    }
  };

  const handleConfirmReissue = async () => {
    if (!reissuingCred || !reissueReason) return;
    try {
      const updatedSnapshot = {
        ...reissuingCred.issued_data_snapshot,
        recipient_name: reissueName || reissuingCred.issued_data_snapshot?.recipient_name,
      };
      await api.reissueCredential(reissuingCred.credential_id, updatedSnapshot, reissueReason);
      setReissuingCred(null);
      setReissueName('');
      setReissueReason('');
      loadCredentials();
      loadAuditTrail();
    } catch (err: any) {
      alert(err.message || 'Failed to reissue credential');
    }
  };

  const filteredCredentials = credentials.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.issued_data_snapshot?.recipient_name || '').toLowerCase();
    return c.credential_id.toLowerCase().includes(q) || name.includes(q);
  });

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-3 sm:p-6 md:p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Credential Verification & Trust Center</h2>
              <p className="text-xs text-slate-500">
                Authoritative credential registry, revocation, reissuance snapshots & tamper-evident audit history
              </p>
            </div>
          </div>
        </div>

        {/* PUBLIC VERIFIER SEARCH TOOL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Public Credential Lookup</h3>
          <p className="text-xs text-slate-500">
            Simulate a public employer, university, or verifier scanning a certificate's QR code or searching a Credential ID:
          </p>

          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center space-x-2 border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-brand-500">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Credential ID, e.g. CERT-2026-000125"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="w-full text-xs text-slate-800 outline-none bg-transparent font-mono"
              />
            </div>
            <button
              onClick={() => handleLookup()}
              disabled={isVerifying}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              Verify Credential
            </button>
          </div>

          {/* Verification Result Card */}
          {verificationResult && (
            <div
              className={`p-5 rounded-xl border space-y-3 ${
                verificationResult.status === 'valid'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : verificationResult.status === 'revoked'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {verificationResult.status === 'valid' && (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  )}
                  {verificationResult.status === 'revoked' && (
                    <XCircle className="h-6 w-6 text-rose-600" />
                  )}
                  {verificationResult.status === 'not_found' && (
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  )}
                  <div>
                    <span className="font-bold text-sm uppercase tracking-wide">
                      {verificationResult.status === 'valid'
                        ? 'Authentic & Valid Credential'
                        : verificationResult.status === 'revoked'
                        ? 'Revoked Credential'
                        : 'Credential Not Found'}
                    </span>
                    <div className="font-mono text-xs opacity-75">{verificationResult.credential_id}</div>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/70 border border-current">
                  Status: {verificationResult.status}
                </span>
              </div>

              {verificationResult.status !== 'not_found' && (
                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-current/10">
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Recipient Name</span>
                    <strong className="text-sm">{verificationResult.recipient_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Certificate Program</span>
                    <strong>{verificationResult.certificate_title || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Issuing Authority</span>
                    <span>{verificationResult.issuing_organization || 'CertiForm Issuing Authority'}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Issued Date</span>
                    <span>{verificationResult.issued_at ? new Date(verificationResult.issued_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {verificationResult.status === 'revoked' && (
                    <div className="col-span-2 p-2.5 bg-rose-100/70 rounded-lg text-rose-900 border border-rose-200">
                      <strong className="block text-[11px]">Revocation Reason:</strong>
                      <span className="text-xs">{verificationResult.revocation_reason}</span>
                    </div>
                  )}
                  {verificationResult.artifact_digest && (
                    <div className="col-span-2 text-[10px] font-mono opacity-60 truncate">
                      SHA-256 Digest: {verificationResult.artifact_digest}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ISSUED CREDENTIALS ROSTER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Issued Credentials Registry</h3>
              <p className="text-xs text-slate-500">Active records, revocation actions, and reissuance history</p>
            </div>
            <div className="w-56">
              <input
                type="text"
                placeholder="Filter credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Credential ID</th>
                  <th className="px-3 py-2.5">Recipient</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Issue Date</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">
                      No issued credentials found. Issue certificates from the Issuance Center to view registry.
                    </td>
                  </tr>
                ) : (
                  filteredCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 font-mono font-semibold text-brand-700">
                        {cred.credential_id}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {cred.issued_data_snapshot?.recipient_name || 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            cred.credential_status === 'valid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {cred.credential_status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {new Date(cred.issued_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setLookupId(cred.credential_id);
                            handleLookup(cred.credential_id);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-brand-600 font-medium hover:bg-slate-100 rounded text-xs"
                          title="Verify Credential"
                        >
                          Verify
                        </button>
                        {cred.credential_status === 'valid' && (
                          <>
                            <button
                              onClick={() => {
                                setReissuingCred(cred);
                                setReissueName(cred.issued_data_snapshot?.recipient_name || '');
                              }}
                              className="px-2 py-1 text-brand-600 hover:text-brand-700 font-medium hover:bg-brand-50 rounded text-xs"
                              title="Correct & Reissue"
                            >
                              Reissue
                            </button>
                            <button
                              onClick={() => setRevokingCredId(cred.credential_id)}
                              className="px-2 py-1 text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded text-xs"
                              title="Revoke Credential"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUDIT TRAIL LOG */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Audit History Log</h3>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No audit events recorded yet.</p>
            ) : (
              auditEvents.map((evt, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-700 px-1.5 py-0.5 bg-brand-50 rounded">
                      {evt.action}
                    </span>
                    <span className="font-mono text-slate-700">{evt.credential_id || 'System'}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-600">{evt.actor}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Revocation Modal */}
      {revokingCredId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Revoke Credential {revokingCredId}</h3>
            <p className="text-xs text-slate-500">
              Revocation is permanent and will immediately reflect on the public verification portal.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason for Revocation *</label>
              <textarea
                rows={3}
                placeholder="e.g. Credential canceled due to course withdrawal, administrative error..."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRevokingCredId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={!revocationReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Reissuance Modal */}
      {reissuingCred && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Controlled Reissuance</h3>
            <p className="text-xs text-slate-500">
              Supersedes <span className="font-mono font-semibold">{reissuingCred.credential_id}</span>, marks it replaced, and issues a new valid credential pointing to the old record.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Corrected Recipient Name</label>
                <input
                  type="text"
                  value={reissueName}
                  onChange={(e) => setReissueName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Audit Reason for Reissuance *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Corrected name spelling per recipient request..."
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setReissuingCred(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReissue}
                disabled={!reissueReason.trim()}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Reissue Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
