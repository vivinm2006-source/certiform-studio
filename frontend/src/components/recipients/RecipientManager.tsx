import React, { useState, useEffect } from 'react';
import { 
  Users, Upload, Download, Plus, Trash2, Search, 
  CheckCircle2, AlertCircle, FileSpreadsheet, Eye, 
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, Sparkles, FileText 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Recipient } from '../../types';
import { BulkQuantityPdfModal } from './BulkQuantityPdfModal';

export const RecipientManager: React.FC = () => {
  const { 
    currentProject, recipients, activeRecipientIndex, 
    setActiveRecipientIndex, updateRecipientCell, refreshRecipients,
    setActiveWorkspace, setQuickCreateOpen 
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
  const [isImporting, setIsImporting] = useState(false);

  // Filtered rows
  const filteredRecipients = recipients.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const dataStr = Object.values(r.data || {}).join(' ').toLowerCase();
    return dataStr.includes(s) || r.id.toLowerCase().includes(s);
  });

  const activeRec = recipients[activeRecipientIndex];

  // Derive unique column keys from current recipients or form fields
  const dataColumns = React.useMemo(() => {
    const keys = new Set<string>();
    recipients.forEach((r) => {
      if (r.data) {
        Object.keys(r.data).forEach((k) => keys.add(k));
      }
    });
    // Ensure primary keys exist
    keys.add('recipient_name');
    keys.add('email');
    keys.add('institution');
    keys.add('event_name');
    keys.add('event_date');
    return Array.from(keys);
  }, [recipients]);

  const handleAddNewRecipient = async () => {
    if (!currentProject) return;
    try {
      const newRec = await api.createRecipient(currentProject.id, {
        recipient_name: 'New Recipient',
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentProject) return;
    const file = e.target.files[0];
    setImportFile(file);
    try {
      const parsed = await api.parseSpreadsheetFile(currentProject.id, file);
      setImportPreview(parsed);
      setColumnMapping(parsed.suggested_mapping);
      setShowImportModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to parse file');
    }
  };

  const handleExecuteImport = async () => {
    if (!currentProject || !importPreview) return;
    setIsImporting(true);
    try {
      await api.importRecipients(currentProject.id, importPreview.raw_rows, columnMapping);
      setIsImporting(false);
      setShowImportModal(false);
      setImportPreview(null);
      refreshRecipients();
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

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-hidden select-none">
      {/* Action Header */}
      <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs w-64">
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

        <div className="flex items-center space-x-2">
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

          {/* BULK GENERATE IN PDF BUTTON */}
          <button
            onClick={() => setShowBulkPdfModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-xs transition-colors"
            title="Generate bulk PDF certificates for all spreadsheet recipients"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Bulk Generate in PDF</span>
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

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead className="bg-slate-100/90 text-slate-600 sticky top-0 z-10 border-b border-slate-300 font-semibold tracking-wider uppercase text-[10px]">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center border-r border-slate-200">#</th>
              <th className="w-24 px-3 py-2.5 border-r border-slate-200">Status</th>
              {dataColumns.map((col) => (
                <th key={col} className="px-4 py-2.5 border-r border-slate-200 min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <span>{col.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[9px] text-slate-400 lowercase">{`{{${col}}}`}</span>
                  </div>
                </th>
              ))}
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
                    const cellVal = rec.data?.[col] ?? '';
                    return (
                      <td key={col} className="p-0 border-r border-slate-200 min-w-[180px]">
                        <input
                          type="text"
                          value={cellVal}
                          onChange={(e) => updateRecipientCell(rec.id, col, e.target.value)}
                          className="w-full h-full px-3 py-2 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-brand-500 text-xs text-slate-800"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1">
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Smart Column Mapping</h3>
                <p className="text-xs text-slate-500">
                  Found {importPreview.total_rows} rows in <strong className="text-slate-800">{importFile?.name}</strong>. Verify column bindings below:
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Mapping Grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2">
                <span>Spreadsheet Column Header</span>
                <span>Certificate Dynamic Field</span>
              </div>
              {importPreview.headers.map((hdr) => (
                <div key={hdr} className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-xs font-medium text-slate-800 bg-slate-100 px-3 py-2 rounded">
                    {hdr}
                  </span>
                  <select
                    value={columnMapping[hdr] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [hdr]: e.target.value })}
                    className="border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 bg-white outline-none focus:border-brand-500 font-mono"
                  >
                    <option value="">-- Ignore Column --</option>
                    {importPreview.available_keys.map((k) => (
                      <option key={k} value={k}>
                        {`{{${k}}}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
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
                disabled={isImporting}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-2 disabled:opacity-50"
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
    </div>
  );
};
