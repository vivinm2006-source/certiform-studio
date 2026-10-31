import React, { useState, useEffect } from 'react';
import { 
  Users, Upload, Download, Plus, Trash2, Search, 
  CheckCircle2, AlertCircle, FileSpreadsheet, Eye, 
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, Sparkles, FileText, Check, ShieldCheck 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Recipient } from '../../types';
import { BulkQuantityPdfModal } from './BulkQuantityPdfModal';
import { AutonomousQAModal } from '../qa/AutonomousQAModal';
import { cleanCorruptedS, cleanRecordDict } from '../../utils/textCleaner';

export const RecipientManager: React.FC = () => {
  const { 
    currentProject, recipients, activeRecipientIndex, 
    setActiveRecipientIndex, updateRecipientCell, refreshRecipients,
    setActiveWorkspace, setQuickCreateOpen, activeTemplate
  } = useProjectStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBulkPdfModal, setShowBulkPdfModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    headers: string[];
    available_keys: string[];
    suggested_mapping: Record<string, string>;
    preview_rows: any[];
    total_rows: number;
    raw_rows: any[];
  } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedNameCol, setMappedNameCol] = useState<string>('');
  const [mappedDeptCol, setMappedDeptCol] = useState<string>('');
  const [mappedDobCol, setMappedDobCol] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  const [isCleaningS, setIsCleaningS] = useState(false);
  const [isFillingGaps, setIsFillingGaps] = useState(false);
  const [isAutoEnhancing, setIsAutoEnhancing] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

  // Filtered rows
  const filteredRecipients = recipients.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const dataStr = Object.values(r.data || {}).join(' ').toLowerCase();
    return dataStr.includes(s) || r.id.toLowerCase().includes(s);
  });

  const activeRec = recipients[activeRecipientIndex];

  // Derive unique, clean, non-duplicated column keys
  const dataColumns = React.useMemo(() => {
    const rawKeys = new Set<string>();
    recipients.forEach((r) => {
      if (r.data) {
        Object.keys(r.data).forEach((k) => {
          if (k && k.trim()) rawKeys.add(cleanCorruptedS(k.trim()));
        });
      }
    });

    // Primary canonical keys we always present first in standard display order
    const primaryOrder = ['recipient_name', 'department', 'dob', 'event_name', 'event_date', 'institution', 'email'];
    
    // Internal alias keys that should NOT appear as duplicate columns if canonical column exists
    const aliasBlacklist = new Set([
      'name', 'full_name', 'student_name', 's_name', 'sname', 's.name', 's_word', 'participant_name', 'candidate_name',
      'dept', 'date_of_birth', 'birth_date', 'session_topic', 'venue'
    ]);

    const result: string[] = [];

    // 1. Add primary columns that exist in the records or are standard
    for (const p of primaryOrder) {
      if (rawKeys.has(p) || p === 'recipient_name') {
        result.push(p);
      } else if (p === 'department' && (rawKeys.has('dept') || rawKeys.has('department') || rawKeys.has('branch'))) {
        result.push(p);
      } else if (p === 'dob' && (rawKeys.has('dob') || rawKeys.has('date_of_birth') || rawKeys.has('birth_date'))) {
        result.push(p);
      }
    }

    // 2. Add other unique custom columns (case-insensitive deduplication, skipping internal aliases)
    const seenLower = new Set(result.map(k => k.toLowerCase()));
    Array.from(rawKeys).forEach((k) => {
      const kLower = k.toLowerCase().replace(/ /g, '_');
      if (!seenLower.has(kLower) && !aliasBlacklist.has(kLower) && !primaryOrder.includes(kLower)) {
        seenLower.add(kLower);
        result.push(k);
      }
    });

    return result;
  }, [recipients]);

  const handleAddNewRecipient = async () => {
    if (!currentProject) return;
    try {
      const newRec = await api.createRecipient(currentProject.id, {
        recipient_name: 'New Recipient',
        department: 'Engineering',
        dob: '2004-01-01',
        email: 'recipient@example.com',
        event_name: 'Annual Summit 2026',
        event_date: 'October 27, 2026',
      });
      refreshRecipients();
    } catch (err) {
      console.error('Failed to add recipient:', err);
    }
  };

  const handleDeleteRecipient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this recipient?')) return;
    try {
      await api.deleteRecipient(id);
      refreshRecipients();
    } catch (err) {
      console.error('Failed to delete recipient:', err);
    }
  };

  const handleSanitizeCorruptedS = async () => {
    if (!currentProject) return;
    setIsCleaningS(true);
    setCleanMessage(null);
    try {
      const res = await api.sanitizeProjectRecipientsS(currentProject.id);
      await refreshRecipients();
      setCleanMessage(`Sanitized letter 's' substitutions across all ${res.total_recipients} recipient records.`);
      setTimeout(() => setCleanMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to clean recipients:', err);
      alert('Failed to clean recipients: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCleaningS(false);
    }
  };

  const handleFillGapsWithoutSpace = async () => {
    if (!currentProject) return;
    setIsFillingGaps(true);
    setCleanMessage(null);
    try {
      const res = await api.fillRecipientGaps(currentProject.id);
      await refreshRecipients();
      setCleanMessage(`Filled blank gap fields without spaces across all ${res.total_recipients} recipient records.`);
      setTimeout(() => setCleanMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to fill gaps:', err);
      alert('Failed to fill gaps: ' + (err.message || 'Unknown error'));
    } finally {
      setIsFillingGaps(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentProject) return;
    const file = e.target.files[0];
    setImportFile(file);
    try {
      const parsed = await api.parseSpreadsheetFile(currentProject.id, file);
      setImportPreview(parsed);
      setColumnMapping(parsed.suggested_mapping || {});

      // Auto-detect Name, Department, and Date of Birth columns
      const headers = parsed.headers || [];
      const nameMatch = headers.find(h => {
        const hl = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['studentname', 'name', 'fullname', 'recipientname', 'candidatename', 'sname', 'student'].includes(hl);
      }) || headers.find(h => h.toLowerCase().includes('name') && !['event', 'college', 'dept', 'topic'].some(s => h.toLowerCase().includes(s))) || '';
      
      const deptMatch = headers.find(h => {
        const hl = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['department', 'dept', 'branch', 'stream', 'discipline'].includes(hl);
      }) || headers.find(h => h.toLowerCase().includes('department') || h.toLowerCase().includes('dept') || h.toLowerCase().includes('branch')) || '';

      const dobMatch = headers.find(h => {
        const hl = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['dob', 'dateofbirth', 'birthdate', 'birthday'].includes(hl);
      }) || headers.find(h => h.toLowerCase().includes('dob') || h.toLowerCase().includes('birth')) || '';

      setMappedNameCol(nameMatch);
      setMappedDeptCol(deptMatch);
      setMappedDobCol(dobMatch);

      setShowImportModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to parse file');
    } finally {
      // Clear file input value so uploading the same file again triggers onChange
      e.target.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!currentProject || !importPreview) return;
    if (!mappedNameCol) {
      alert('Please select a spreadsheet column for Participant Name before proceeding.');
      return;
    }

    setIsImporting(true);
    try {
      const finalMapping: Record<string, string> = { ...columnMapping };
      if (mappedNameCol) finalMapping[mappedNameCol] = 'recipient_name';
      if (mappedDeptCol) finalMapping[mappedDeptCol] = 'department';
      if (mappedDobCol) finalMapping[mappedDobCol] = 'dob';

      await api.importRecipients(currentProject.id, importPreview.raw_rows, finalMapping, clearExisting);
      setIsImporting(false);
      setShowImportModal(false);
      setImportPreview(null);
      await refreshRecipients();
      setActiveRecipientIndex(0);
    } catch (err: any) {
      setIsImporting(false);
      alert(err.message || 'Import failed');
    }
  };

  const downloadEmptyTemplate = () => {
    if (!currentProject) return;
    window.location.href = `/api/v1/projects/${currentProject.id}/recipients/template`;
  };

  const exportRosterCsv = () => {
    if (!currentProject) return;
    window.location.href = `/api/v1/projects/${currentProject.id}/recipients/export`;
  };

  const handleAutoEnhanceAll = async () => {
    if (!currentProject) return;
    setIsAutoEnhancing(true);
    try {
      const res = await api.autoEnhanceProject(currentProject.id);
      await refreshRecipients();
      alert(`Auto-Enhance Complete!\n- Total Recipients: ${res.total_recipients}\n- Cleaned Records: ${res.cleaned_records}\n- Name Casing Fixes: ${res.casing_fixes}\n- Gaps Auto-Filled: ${res.gaps_filled}\n- Credentials Issued: ${res.credentials_created}\n- Watermark Assurance: ${res.watermark_assurance}\n- Preflight Health Score: ${res.preflight_health_score}%`);
    } catch (err: any) {
      alert('Auto-Enhance error: ' + (err.message || 'Failed to auto-enhance project'));
    } finally {
      setIsAutoEnhancing(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-hidden select-none">
      {/* Action Header */}
      <div className="min-h-14 py-2 border-b border-slate-200 px-3 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 flex-shrink-0">
        <div className="flex items-center flex-wrap gap-2.5 sm:space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipients by name, email, id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs text-slate-800 outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="issued">Issued</option>
              <option value="error">Has Errors</option>
            </select>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <label className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:border-brand-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors">
            <Upload className="h-3.5 w-3.5 text-brand-600" />
            <span>Import CSV / Excel</span>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelected} className="hidden" />
          </label>

          <button
            onClick={downloadEmptyTemplate}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
            title="Download formatted Excel template"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Template</span>
          </button>

          <button
            onClick={exportRosterCsv}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Roster</span>
          </button>

          {/* Clean corrupted 's' substitutions */}
          <button
            onClick={handleSanitizeCorruptedS}
            disabled={isCleaningS}
            className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            title="Clean corrupted 's' characters (Cyrillic Ze з / 3 -> s) across all records"
          >
            <Check className="h-3.5 w-3.5 text-indigo-600" />
            <span>{isCleaningS ? 'Fixing...' : "Fix 's' Letters"}</span>
          </button>

          {/* Fill blank gaps without spaces */}
          <button
            onClick={handleFillGapsWithoutSpace}
            disabled={isFillingGaps}
            className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            title="Auto-fill missing event, date, and institution gap fields without any empty space"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>{isFillingGaps ? 'Filling Gaps...' : 'Fill Blank Gaps'}</span>
          </button>

          {/* UNIFIED AUTO-ENHANCE & HEAL BUTTON */}
          <button
            onClick={handleAutoEnhanceAll}
            disabled={isAutoEnhancing}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-all"
            title="Automatically format names to Title Case, clean corrupted 's' characters, fill all blank gaps without spaces, and issue credentials with Gemini watermark"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>{isAutoEnhancing ? 'Enhancing...' : 'Auto-Enhance All'}</span>
          </button>

          {/* AUTONOMOUS QA & LOAD TEST MODAL BUTTON */}
          <button
            onClick={() => setShowQAModal(true)}
            className="flex items-center space-x-1.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-colors"
            title="Open Autonomous QA & 1,000-User Load Testing Center"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Autonomous QA Test</span>
          </button>

          {/* DIRECT 1-CLICK DOWNLOAD BULK PDF */}
          <a
            href={`/api/v1/projects/${currentProject?.id}/export/bulk-pdf?template_id=${activeTemplate?.id || ''}&watermark=GEMINI`}
            download
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-xs transition-colors"
            title="Download all recipient certificates as a single consolidated multi-page PDF document with Gemini watermark"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Bulk PDF</span>
          </a>

          {/* BULK GENERATE IN PDF BUTTON (MODAL) */}
          <button
            onClick={() => setShowBulkPdfModal(true)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-colors"
            title="Advanced bulk generation options (ZIP of PDFs, consolidated PDF, PNG bundle)"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            <span>Bulk Options</span>
          </button>

          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            title="Provide input to create & issue certificate immediately"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate from Input</span>
          </button>

          <button
            onClick={handleAddNewRecipient}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {cleanMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{cleanMessage}</span>
          </div>
          <button onClick={() => setCleanMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead className="bg-slate-100/90 text-slate-600 sticky top-0 z-10 border-b border-slate-300 font-semibold tracking-wider uppercase text-[10px]">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center border-r border-slate-200">#</th>
              <th className="w-24 px-3 py-2.5 border-r border-slate-200">Status</th>
              {dataColumns.map((col) => {
                const labelMap: Record<string, string> = {
                  recipient_name: 'Participant Name',
                  department: 'Department',
                  dob: 'Date of Birth',
                  event_name: 'Event / Topic',
                  event_date: 'Event Date',
                  institution: 'Institution / College',
                  email: 'Email',
                  registration_id: 'Roll / Reg No'
                };
                const displayTitle = labelMap[col] || cleanCorruptedS(col.replace(/_/g, ' '));
                return (
                  <th key={col} className="px-4 py-2.5 border-r border-slate-200 min-w-[180px]">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-700">{displayTitle}</span>
                        {col === 'recipient_name' && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                            Uniform Font & Size
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-brand-600 bg-brand-50 px-1 py-0.5 rounded lowercase flex-shrink-0">{`{{${col}}}`}</span>
                    </div>
                  </th>
                );
              })}
              <th className="w-20 px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRecipients.map((rec, rIdx) => {
              const isSelected = activeRec?.id === rec.id;
              return (
                <tr
                  key={rec.id}
                  onClick={() => setActiveRecipientIndex(rIdx)}
                  className={`hover:bg-brand-50/40 cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-50/80 font-medium' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                    {rIdx + 1}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        rec.status === 'issued'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'error'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  {dataColumns.map((col) => {
                    let cellVal = rec.data?.[col] ?? '';
                    if (!cellVal && col === 'dob') cellVal = rec.data?.['date_of_birth'] ?? rec.data?.['birth_date'] ?? '';
                    if (!cellVal && col === 'department') cellVal = rec.data?.['dept'] ?? rec.data?.['branch'] ?? '';
                    if (!cellVal && col === 'recipient_name') cellVal = rec.data?.['full_name'] ?? rec.data?.['name'] ?? rec.data?.['student_name'] ?? '';
                    const displayVal = cleanCorruptedS(cellVal);
                    return (
                      <td key={col} className="p-0 border-r border-slate-200 min-w-[180px]">
                        <input
                          type="text"
                          value={displayVal}
                          onChange={(e) => updateRecipientCell(rec.id, col, cleanCorruptedS(e.target.value))}
                          className="w-full h-full px-4 py-2 bg-transparent text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-brand-500 font-sans text-xs"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1">
                      <a
                        href={`/api/v1/recipients/${rec.id}/export-pdf?template_id=${activeTemplate?.id || ''}&watermark=GEMINI`}
                        download
                        className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50"
                        title="Download Certificate with Gemini Watermark as Vector PDF"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                      </a>
                      <a
                        href={`/api/v1/recipients/${rec.id}/export-png?template_id=${activeTemplate?.id || ''}&watermark=GEMINI`}
                        download
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                        title="Download Certificate with Gemini Watermark as High-Res PNG"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      </a>
                      <button
                        onClick={() => {
                          setActiveRecipientIndex(rIdx);
                          setActiveWorkspace('studio');
                        }}
                        className="p-1 text-slate-400 hover:text-brand-600 rounded hover:bg-slate-100"
                        title="View in Certificate Studio"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecipient(rec.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Delete Recipient"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Active Recipient Counter */}
      <div className="h-11 border-t border-slate-200 px-6 flex items-center justify-between bg-slate-50 text-xs text-slate-500">
        <div>
          Showing {filteredRecipients.length} recipients (Total {recipients.length} in project)
        </div>
        <div className="flex items-center space-x-3">
          <span>
            Selected: <strong className="text-slate-800">{activeRec?.data?.recipient_name || 'None'}</strong> (Row {activeRecipientIndex + 1})
          </span>
          <button
            onClick={() => setActiveWorkspace('studio')}
            className="text-brand-600 font-semibold hover:underline"
          >
            Open Live Certificate Preview
          </button>
        </div>
      </div>

      {/* Smart Column Mapping & Import Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <span>Excel Field Mapping & Verification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parsed <strong className="text-slate-800">{importPreview.total_rows}</strong> participants from <strong className="text-slate-800">{importFile?.name}</strong>. Each spreadsheet column is displayed once.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Validation Alert if Name is Unmapped */}
            {!mappedNameCol && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Participant Name column required:</strong> Please select which spreadsheet column contains participant names below.
                </span>
              </div>
            )}

            {/* Primary Required Fields Mapping */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                <span>Primary Certificate Field Mapping</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Participant Name */}
                <div className={`p-3.5 rounded-xl border space-y-1.5 ${mappedNameCol ? 'bg-emerald-50/50 border-emerald-300' : 'bg-amber-50/50 border-amber-300'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Participant Name</label>
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded uppercase">Required</span>
                  </div>
                  <select
                    value={mappedNameCol}
                    onChange={(e) => setMappedNameCol(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500 shadow-2xs font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">Prints as the recipient on the certificate</p>
                </div>

                {/* 2. Department */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Department</label>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">Recommended</span>
                  </div>
                  <select
                    value={mappedDeptCol}
                    onChange={(e) => setMappedDeptCol(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500 shadow-2xs font-medium"
                  >
                    <option value="">-- None / Optional --</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">Maps to {`{{department}}`}</p>
                </div>

                {/* 3. Date of Birth */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Date of Birth (DOB)</label>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">Optional</span>
                  </div>
                  <select
                    value={mappedDobCol}
                    onChange={(e) => setMappedDobCol(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500 shadow-2xs font-medium"
                  >
                    <option value="">-- None / Optional --</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">Maps to {`{{dob}}`} / {`{{date_of_birth}}`}</p>
                </div>
              </div>
            </div>

            {/* Additional Custom Spreadsheet Columns */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Other Spreadsheet Columns
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {importPreview.headers
                  .filter((h) => h !== mappedNameCol && h !== mappedDeptCol && h !== mappedDobCol)
                  .map((hdr) => (
                    <div key={hdr} className="grid grid-cols-2 gap-3 items-center">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded truncate">
                        {hdr}
                      </span>
                      <select
                        value={columnMapping[hdr] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [hdr]: e.target.value })}
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white outline-none focus:border-brand-500 font-mono shadow-2xs"
                      >
                        <option value="">-- Keep Raw Column --</option>
                        {importPreview.available_keys
                          .filter(k => k !== 'recipient_name' && k !== 'department' && k !== 'dob' && k !== 'date_of_birth')
                          .map((k) => (
                            <option key={k} value={k}>
                              {`{{${k}}}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>

            {/* Data Preview Table */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Data Preview (First {Math.min(importPreview.preview_rows.length, 4)} Rows)
                </h4>
                <span className="text-[10px] text-slate-400">Verifies data before importing</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-36">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100/90 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 border-r border-slate-200">#</th>
                      <th className="px-3 py-1.5 border-r border-slate-200 text-brand-700 font-bold bg-brand-50/50">
                        {mappedNameCol ? `${mappedNameCol} (Name)` : 'Participant Name'}
                      </th>
                      {mappedDeptCol && (
                        <th className="px-3 py-1.5 border-r border-slate-200">
                          {mappedDeptCol} (Dept)
                        </th>
                      )}
                      {mappedDobCol && (
                        <th className="px-3 py-1.5 border-r border-slate-200">
                          {mappedDobCol} (DOB)
                        </th>
                      )}
                      {importPreview.headers
                        .filter(h => h !== mappedNameCol && h !== mappedDeptCol && h !== mappedDobCol)
                        .slice(0, 3)
                        .map(h => (
                          <th key={h} className="px-3 py-1.5 border-r border-slate-200 text-slate-500">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.preview_rows.slice(0, 4).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400 border-r border-slate-100">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-semibold text-slate-900 border-r border-slate-100 bg-brand-50/20">
                          {mappedNameCol ? row[mappedNameCol] : '—'}
                        </td>
                        {mappedDeptCol && (
                          <td className="px-3 py-1.5 text-slate-700 border-r border-slate-100">
                            {row[mappedDeptCol] || '—'}
                          </td>
                        )}
                        {mappedDobCol && (
                          <td className="px-3 py-1.5 text-slate-700 border-r border-slate-100">
                            {row[mappedDobCol] || '—'}
                          </td>
                        )}
                        {importPreview.headers
                          .filter(h => h !== mappedNameCol && h !== mappedDeptCol && h !== mappedDobCol)
                          .slice(0, 3)
                          .map(h => (
                            <td key={h} className="px-3 py-1.5 text-slate-600 border-r border-slate-100">
                              {row[h] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Clear existing option */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">Replace existing project recipients with this spreadsheet</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || !mappedNameCol}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-2 disabled:opacity-50 transition-colors"
              >
                {isImporting ? <span>Importing...</span> : <span>Confirm & Import {importPreview.total_rows} Recipients</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Quantity PDF Generation Modal */}
      <BulkQuantityPdfModal
        isOpen={showBulkPdfModal}
        onClose={() => setShowBulkPdfModal(false)}
      />

      {/* Master Autonomous QA & 1,000-User Testing Modal */}
      <AutonomousQAModal
        isOpen={showQAModal}
        onClose={() => setShowQAModal(false)}
      />
    </div>
  );
};
