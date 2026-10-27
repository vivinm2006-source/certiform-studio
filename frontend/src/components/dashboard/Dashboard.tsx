import React from 'react';
import { 
  Users, Award, FileText, Send, ShieldCheck, 
  ArrowRight, Plus, Download, Sparkles, CheckCircle2,
  LayoutTemplate, Copy, Trash2
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

export const Dashboard: React.FC = () => {
  const { 
    currentProject, templates, selectTemplate, duplicateTemplate, 
    setTemplateGalleryOpen, recipients, setActiveWorkspace, 
    setActiveRecipientIndex, setQuickCreateOpen 
  } = useProjectStore();

  const totalRecipients = recipients.length;
  const issuedCount = recipients.filter((r) => r.status === 'issued').length;
  const validCount = recipients.filter((r) => r.status === 'valid').length;

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-3 sm:p-6 md:p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-navy-900 via-brand-700 to-brand-500 rounded-2xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="text-[11px] font-mono uppercase bg-white/20 px-2.5 py-1 rounded-full tracking-wider font-semibold">
              Platform Overview
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {currentProject?.title || 'CertiForm Studio'}
            </h1>
            <p className="text-xs text-brand-100 leading-relaxed">
              Design once. Collect data once. Generate, issue, and verify certificates at any scale. Fully synchronized between Canva-like visual design, Google Forms intake, and spreadsheet roster data.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5 sm:space-x-3">
              <button
                onClick={() => setQuickCreateOpen(true)}
                className="bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                <span>Instant Certificate from Input</span>
              </button>
              <button
                onClick={() => setActiveWorkspace('studio')}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-xl border border-white/20 transition-colors flex items-center space-x-1.5"
              >
                <span>Certificate Studio</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => setActiveWorkspace('issuance')}
                className="bg-brand-700/60 hover:bg-brand-700 text-white text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-xl border border-white/10 transition-colors"
              >
                Batch Issuance
              </button>
            </div>
          </div>
        </div>

        {/* METRICS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Recipients</span>
              <Users className="h-4 w-4 text-brand-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalRecipients}</div>
            <div className="text-[11px] text-slate-500">{validCount} ready for issuance</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Issued Credentials</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{issuedCount}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Unique IDs registered</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Public Intake Form</span>
              <FileText className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">1 Active</div>
            <div className="text-[11px] text-indigo-600 font-medium">Accepting submissions</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Verification Status</span>
              <ShieldCheck className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">Authoritative</div>
            <div className="text-[11px] text-amber-600 font-medium">Tamper-evident logs</div>
          </div>
        </div>

        {/* WORKSPACE LAUNCHPAD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Application Workspaces</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              onClick={() => setActiveWorkspace('studio')}
              className="p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer transition-all space-y-2 group"
            >
              <div className="h-9 w-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Certificate Studio</h4>
              <p className="text-[11px] text-slate-500">
                Canva-like visual editor with dynamic typography, layers, signatures, and QR codes.
              </p>
            </div>

            <div
              onClick={() => setActiveWorkspace('forms')}
              className="p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer transition-all space-y-2 group"
            >
              <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Form Studio</h4>
              <p className="text-[11px] text-slate-500">
                Google Forms-like public registration intake builder with dynamic variable bindings.
              </p>
            </div>

            <div
              onClick={() => setActiveWorkspace('recipients')}
              className="p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer transition-all space-y-2 group"
            >
              <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Recipient Manager</h4>
              <p className="text-[11px] text-slate-500">
                Spreadsheet roster with XLSX/CSV import, smart column mapping, and inline cell editing.
              </p>
            </div>
          </div>
        </div>

        {/* CERTIFICATE TEMPLATES SHOWCASE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <LayoutTemplate className="h-4 w-4 text-brand-600" />
                <span>Certificate Templates ({templates.length})</span>
              </h3>
              <p className="text-xs text-slate-500">Visual certificate layouts configured in this project</p>
            </div>
            <button
              onClick={() => setTemplateGalleryOpen(true)}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 border border-slate-200 rounded-xl hover:border-brand-400 bg-white hover:bg-slate-50/50 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
              >
                {/* Visual miniature canvas */}
                <div
                  style={{ backgroundColor: tpl.background_color || '#FCFAF5' }}
                  className="w-full h-24 rounded-lg border border-slate-200 relative p-2.5 flex flex-col justify-between overflow-hidden shadow-2xs"
                >
                  <div className="text-[9px] font-bold text-slate-800 tracking-tight truncate max-w-[150px]">
                    {tpl.name}
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {tpl.page_format.replace('_', ' ')}
                  </div>
                  <div className="flex items-center justify-between text-[7px] text-slate-400">
                    <span>{tpl.elements?.length || 0} Canvas Elements</span>
                    <span className="text-brand-600 font-semibold">300 DPI</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      selectTemplate(tpl.id);
                      setActiveWorkspace('studio');
                    }}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center space-x-1"
                  >
                    <span>Open in Studio</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={async () => {
                      await duplicateTemplate(tpl.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Duplicate template"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* "+ Add Template" Card */}
            <div
              onClick={() => setTemplateGalleryOpen(true)}
              className="p-5 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/30 group text-center min-h-[140px]"
            >
              <div className="h-9 w-9 rounded-full bg-brand-100 group-hover:bg-brand-200 text-brand-700 flex items-center justify-center transition-colors">
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-brand-700">
                Add Another Template
              </div>
              <div className="text-[10px] text-slate-400">
                Choose from gallery or upload custom image
              </div>
            </div>
          </div>
        </div>

        {/* RECENT RECIPIENTS PREVIEW TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recipient Roster</h3>
              <p className="text-xs text-slate-500">Active recipients in this certificate project</p>
            </div>
            <button
              onClick={() => setActiveWorkspace('recipients')}
              className="text-xs text-brand-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Open Spreadsheet Roster</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Recipient Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.slice(0, 5).map((rec, idx) => (
                  <tr
                    key={rec.id}
                    onClick={() => {
                      setActiveRecipientIndex(idx);
                      setActiveWorkspace('studio');
                    }}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {rec.data?.recipient_name || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{rec.data?.email || 'N/A'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rec.data?.institution || 'N/A'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          rec.status === 'issued'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
