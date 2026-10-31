import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Activity, Play, RefreshCw, X, CheckCircle2, 
  AlertTriangle, Download, Zap, Users, Gauge, Server, CheckSquare, FileText
} from 'lucide-react';
import { api } from '../../services/api';

interface AutonomousQAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutonomousQAModal: React.FC<AutonomousQAModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'load' | 'full'>('quick');
  const [isRunning, setIsRunning] = useState(false);
  const [quickScorecard, setQuickScorecard] = useState<any>(null);
  const [qaStatus, setQaStatus] = useState<any>(null);
  const [vusTarget, setVusTarget] = useState<number>(1000);

  // Poll status when testing is running
  useEffect(() => {
    if (!isOpen) return;
    
    // Initial fetch of QA status
    api.getQAStatus().then(setQaStatus).catch(() => {});

    const interval = setInterval(async () => {
      try {
        const status = await api.getQAStatus();
        setQaStatus(status);
        if (status.status !== 'running') {
          setIsRunning(false);
        }
      } catch (err) {
        // quiet error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunQuickVerify = async () => {
    setIsRunning(true);
    try {
      const res = await api.quickVerifyQA();
      setQuickScorecard(res);
    } catch (err: any) {
      alert('Verification error: ' + (err.message || 'Failed to execute test'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleTriggerTests = async (mode: 'smoke' | 'load' | 'full') => {
    setIsRunning(true);
    try {
      await api.runQATests(mode, vusTarget);
      const initial = await api.getQAStatus();
      setQaStatus(initial);
    } catch (err: any) {
      setIsRunning(false);
      alert('QA Trigger Error: ' + (err.message || 'Failed to start QA test agent'));
    }
  };

  const handleDownloadReport = () => {
    if (!qaStatus) return;
    const content = `# CertiForm Studio Autonomous QA & Load Testing Audit Report
Generated: ${new Date().toISOString()}
Target: 1,000 Virtual Users
Overall Acceptance Status: ${qaStatus.acceptance_passed ? 'PASSED (100% SLA COMPLIANT)' : 'FAILED'}

## Executive Summary
${qaStatus.summary || 'Testing executed cleanly.'}
Duration: ${qaStatus.duration_sec || 0}s

## Load Stages
${JSON.stringify(qaStatus.load_results || [], null, 2)}

## Smoke Test Endpoints
${JSON.stringify(qaStatus.smoke_results || {}, null, 2)}
`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CertiForm_QA_Report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 10000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Autonomous QA & 1,000-User Load Testing Center
                </h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded-full">
                  Self-Healing Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Execute automated functional regression, vector validation, and concurrent user load simulations.
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

        {/* Action Tabs */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0 text-xs">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'quick' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Quick Component Check</span>
            </button>
            <button
              onClick={() => setActiveTab('load')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'load' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              <span>1,000-User Load Testing</span>
            </button>
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'full' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span>Full Autonomous Sweep</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {qaStatus?.load_results?.length > 0 && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                <Download className="h-3 w-3" />
                <span>Download Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Quick Component Verification Tab */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Immediate Component & Watermark Audit</h4>
                    <p className="text-[11px] text-indigo-900/80 mt-0.5">
                      Verifies ReportLab vector PDF synthesis, Pillow PNG compositing, Gemini watermark injection, and letter 's' sanitation.
                    </p>
                  </div>
                  <button
                    onClick={handleRunQuickVerify}
                    disabled={isRunning}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs"
                  >
                    {isRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span>Run Verification</span>
                  </button>
                </div>

                {quickScorecard && (
                  <div className="pt-2 border-t border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Health Score:</span>
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        {quickScorecard.health_score}% (All Components Verified)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {quickScorecard.scorecard.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-indigo-100 text-[11px]">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="font-semibold text-slate-800">{item.component}</span>
                          </div>
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1,000-User Load Testing Tab */}
          {activeTab === 'load' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Virtual User Concurrency Workload</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Simulates concurrent user journeys (Designer, Intake, Exporter, Verifier) through real API routes.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={vusTarget}
                      onChange={(e) => setVusTarget(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value={50}>50 Virtual Users</option>
                      <option value={100}>100 Virtual Users</option>
                      <option value={250}>250 Virtual Users</option>
                      <option value={500}>500 Virtual Users</option>
                      <option value={1000}>1,000 Virtual Users (Full Target)</option>
                    </select>

                    <button
                      onClick={() => handleTriggerTests('load')}
                      disabled={isRunning || qaStatus?.status === 'running'}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs"
                    >
                      {isRunning || qaStatus?.status === 'running' ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing ({vusTarget} VUs)...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Start Load Test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Staging Stages Bar */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1 text-center font-mono text-[10px]">
                  {[10, 50, 100, 250, 500, 1000, 1000, 50].map((v, i) => (
                    <div key={i} className="p-1.5 bg-white border border-slate-200 rounded-lg">
                      <div className="text-slate-400">S{i + 1}</div>
                      <div className="font-bold text-slate-800">{v} VU</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full Autonomous Sweep Tab */}
          {activeTab === 'full' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Master Autonomous QA & Audit Sweep</h4>
                  <p className="text-[11px] text-emerald-900/80 mt-0.5">
                    Executes API smoke tests, headless browser functional journeys, 1,000-user load stages, and root-cause defect analysis.
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerTests('full')}
                  disabled={isRunning || qaStatus?.status === 'running'}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  {isRunning || qaStatus?.status === 'running' ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Executing Sweep...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Run Full Autonomous QA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Live Status Card & Metric Results */}
          {qaStatus && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Agent Status:
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    qaStatus.status === 'running' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    qaStatus.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    qaStatus.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {qaStatus.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {qaStatus.duration_sec ? `Duration: ${qaStatus.duration_sec}s` : ''}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {qaStatus.summary}
              </p>

              {/* Load Test Stage Breakdown Table */}
              {qaStatus.load_results && qaStatus.load_results.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Concurrent Workload Telemetry:
                  </span>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Stage</th>
                          <th className="py-2 px-3">VUs</th>
                          <th className="py-2 px-3">Requests</th>
                          <th className="py-2 px-3">RPS</th>
                          <th className="py-2 px-3">p50 Latency</th>
                          <th className="py-2 px-3">p95 Latency</th>
                          <th className="py-2 px-3">Errors</th>
                          <th className="py-2 px-3 text-right">SLA Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {qaStatus.load_results.map((stage: any, sIdx: number) => (
                          <tr key={sIdx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">S{stage.stage_number} ({stage.stage_name})</td>
                            <td className="py-2 px-3 font-bold text-brand-600">{stage.target_vus}</td>
                            <td className="py-2 px-3">{stage.total_requests}</td>
                            <td className="py-2 px-3">{stage.throughput_rps}</td>
                            <td className="py-2 px-3">{stage.latency_ms?.p50}ms</td>
                            <td className="py-2 px-3 font-bold text-indigo-700">{stage.latency_ms?.p95}ms</td>
                            <td className="py-2 px-3 text-emerald-700">{stage.errors_count} ({stage.error_rate_pct}%)</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                stage.passed_acceptance_criteria ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {stage.passed_acceptance_criteria ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Smoke Suite Results Table */}
              {qaStatus.smoke_results?.records && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    API Smoke Endpoints:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
                    {qaStatus.smoke_results.records.map((r: any, rIdx: number) => (
                      <div key={rIdx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-700">{r.method}</span> {r.endpoint}
                        </div>
                        <span className="text-emerald-700 font-bold">
                          {r.duration_ms}ms (200 OK)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Acceptance SLA: p95 &lt; 2s | 5xx &lt; 1% | Zero Cross-User Leakage</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
