import React, { useState } from 'react';
import { 
  Upload, X, CheckCircle2, LayoutTemplate, Palette, 
  Trash2, Sparkles, Layers, Sliders, RefreshCw, FileText 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeTemplate, currentProject } = useProjectStore();

  const [templateName, setTemplateName] = useState(activeTemplate?.name || 'Certificate Template');
  const [pageFormat, setPageFormat] = useState(activeTemplate?.page_format || 'A4_LANDSCAPE');
  const [bgColor, setBgColor] = useState(activeTemplate?.background_color || '#FCFAF5');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !activeTemplate) return null;

  const pageFormats = [
    { id: 'A4_LANDSCAPE', label: 'A4 Landscape (297 × 210 mm)', width: 841.89, height: 595.28 },
    { id: 'A4_PORTRAIT', label: 'A4 Portrait (210 × 297 mm)', width: 595.28, height: 841.89 },
    { id: 'US_LETTER_LANDSCAPE', label: 'US Letter Landscape (11 × 8.5 in)', width: 792.00, height: 612.00 },
    { id: 'US_LETTER_PORTRAIT', label: 'US Letter Portrait (8.5 × 11 in)', width: 612.00, height: 792.00 },
    { id: 'WIDESCREEN_16_9', label: 'Digital Widescreen (16:9)', width: 960.00, height: 540.00 },
  ];

  const colorPresets = [
    { label: 'Ivory Parchment', value: '#FCFAF5' },
    { label: 'Pure White', value: '#FFFFFF' },
    { label: 'Warm Cream', value: '#FFFDF7' },
    { label: 'Soft Slate', value: '#F8FAFC' },
    { label: 'Luxury Navy', value: '#0F2841' },
    { label: 'Charcoal Minimal', value: '#1E293B' },
  ];

  const handleUploadCustomTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeTemplate) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const res = await api.uploadTemplateBackground(activeTemplate.id, file);
      
      // Update template in store and clean legacy static overlays so old fonts don't overlay the artwork
      useProjectStore.setState((s) => ({
        activeTemplate: s.activeTemplate ? { ...s.activeTemplate, background_asset_url: res.background_asset_url, background_color: '' } : null,
      }));
      await useProjectStore.getState().cleanTemplateForArtwork(activeTemplate.id);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      alert(err.message || 'Failed to upload template image');
    }
  };

  const handleRemoveBackground = async () => {
    if (!activeTemplate) return;
    try {
      await api.updateTemplate(activeTemplate.id, { background_asset_url: '' });
      useProjectStore.setState((s) => ({
        activeTemplate: s.activeTemplate ? { ...s.activeTemplate, background_asset_url: undefined } : null,
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to remove background');
    }
  };

  const handleHideDefaultBorders = async () => {
    if (!activeTemplate) return;
    // Hide default outer frame and decorative lines so user's uploaded artwork is clear
    const updatedElements = activeTemplate.elements.map((el) => {
      if (el.element_type === 'shape' && (el.shape_type === 'rectangle' || el.shape_type === 'line')) {
        return { ...el, is_visible: false };
      }
      return el;
    });
    useProjectStore.setState((s) => ({
      activeTemplate: s.activeTemplate ? { ...s.activeTemplate, elements: updatedElements } : null,
    }));
    await api.batchSyncElements(activeTemplate.id, updatedElements);
  };

  const handleShowAllElements = async () => {
    if (!activeTemplate) return;
    const updatedElements = activeTemplate.elements.map((el) => ({ ...el, is_visible: true }));
    useProjectStore.setState((s) => ({
      activeTemplate: s.activeTemplate ? { ...s.activeTemplate, elements: updatedElements } : null,
    }));
    await api.batchSyncElements(activeTemplate.id, updatedElements);
  };

  const handleLoadPreset = async (preset: string) => {
    if (!activeTemplate) return;
    try {
      const resp = await fetch(`/api/v1/templates/${activeTemplate.id}/load-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset })
      });
      if (resp.ok) {
        const updated = await resp.json();
        useProjectStore.setState({ activeTemplate: updated });
        setTemplateName(updated.name);
        setPageFormat(updated.page_format);
        setBgColor(updated.background_color);
      }
    } catch (err) {
      console.error('Failed to load preset:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeTemplate) return;
    setIsSaving(true);
    const selectedFormat = pageFormats.find((f) => f.id === pageFormat) || pageFormats[0];

    try {
      const updated = await api.updateTemplate(activeTemplate.id, {
        name: templateName,
        page_format: pageFormat,
        width_pt: selectedFormat.width,
        height_pt: selectedFormat.height,
        background_color: bgColor,
      });

      useProjectStore.setState((s) => ({
        activeTemplate: s.activeTemplate ? {
          ...s.activeTemplate,
          name: templateName,
          page_format: pageFormat,
          width_pt: selectedFormat.width,
          height_pt: selectedFormat.height,
          background_color: bgColor,
        } : null,
      }));

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      alert(err.message || 'Failed to save template settings');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-xs">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Certificate Template Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Upload your own certificate design, change canvas dimensions, or adjust background styling.
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
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* SECTION 1: USER GIVES / UPLOADS CUSTOM TEMPLATE */}
          <div className="p-4 bg-brand-50/50 border border-brand-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-brand-900 font-bold text-xs">
                <Upload className="h-4 w-4 text-brand-600" />
                <span>Upload Your Certificate Design (PNG / JPG / WEBP)</span>
              </div>
              <span className="text-[10px] text-brand-600 font-medium">300 DPI Supported</span>
            </div>
            <p className="text-[11px] text-brand-800/80 leading-relaxed">
              Have an existing certificate designed in Canva, Photoshop, or from your institution? Upload it as the background image and place dynamic name/date variables directly on top!
            </p>

            <div className="flex items-center space-x-3 pt-1">
              <label className="flex-1 border-2 border-dashed border-brand-300 hover:border-brand-500 bg-white hover:bg-brand-50/40 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer transition-colors shadow-2xs">
                {isUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
                ) : (
                  <Upload className="h-4 w-4 text-brand-600" />
                )}
                <span className="text-xs font-semibold text-slate-700">
                  {isUploading ? 'Uploading Image...' : 'Choose Certificate Image File'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadCustomTemplate}
                  className="hidden"
                />
              </label>

              {activeTemplate.background_asset_url && (
                <button
                  type="button"
                  onClick={handleRemoveBackground}
                  className="px-3 py-3 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center space-x-1"
                  title="Remove uploaded custom template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            {/* Custom Template Options */}
            {activeTemplate.background_asset_url && (
              <div className="pt-2 flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={handleHideDefaultBorders}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium"
                >
                  Hide Default Borders (Feature My Artwork)
                </button>
                <button
                  type="button"
                  onClick={handleShowAllElements}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium"
                >
                  Show All Elements
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: TEMPLATE DETAILS & DIMENSIONS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Template Geometry & Details
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Classic Academic Honors"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Paper Size & Format</label>
              <select
                value={pageFormat}
                onChange={(e) => setPageFormat(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white focus:border-brand-500 outline-none"
              >
                {pageFormats.map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>
                    {fmt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Background Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Canvas Background Color</label>
              <div className="flex items-center space-x-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBgColor(preset.value)}
                    style={{ backgroundColor: preset.value }}
                    className={`h-8 w-8 rounded-full border border-slate-300 shadow-2xs transition-transform ${
                      bgColor === preset.value ? 'ring-2 ring-brand-500 scale-110' : 'hover:scale-105'
                    }`}
                    title={preset.label}
                  />
                ))}
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-24 text-xs font-mono border border-slate-300 rounded-lg px-2 py-1.5 text-center text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: BUILT-IN PRESET SWITCHER */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Standard Design Presets
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => handleLoadPreset('academic')}
                className="p-3 border border-slate-200 hover:border-brand-500 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors space-y-1"
              >
                <div className="font-bold text-xs text-slate-900">Classic Academic Honors</div>
                <div className="text-[11px] text-slate-500">Traditional luxury gold borders, Cinzel serif typography, dual cursive signatures.</div>
              </div>
              <div
                onClick={() => handleLoadPreset('executive')}
                className="p-3 border border-slate-200 hover:border-brand-500 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors space-y-1"
              >
                <div className="font-bold text-xs text-slate-900">Modern Executive Diploma</div>
                <div className="text-[11px] text-slate-500">Contemporary navy header accent, Montserrat typography, clean modern layout.</div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Apply Template Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};
