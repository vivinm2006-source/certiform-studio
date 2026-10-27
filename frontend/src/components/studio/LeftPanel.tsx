import React, { useState } from 'react';
import { 
  Type, Shapes, QrCode, PenTool, LayoutTemplate, 
  Image as ImageIcon, Layers, Plus, Lock, Unlock, 
  Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Upload, X 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { api } from '../../services/api';

export const LeftPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'elements' | 'templates' | 'signatures' | 'qr' | 'layers'>('text');
  const { activeTemplate, activeForm } = useProjectStore();
  const { 
    addElement, selectedElementId, setSelectedElementId, 
    updateElementProps, deleteElement, reorderElement,
    isLeftPanelOpen, setLeftPanelOpen 
  } = useCanvasStore();

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeTemplate) return;
    try {
      const file = e.target.files[0];
      const res = await api.uploadTemplateBackground(activeTemplate.id, file);
      useProjectStore.setState((s) => ({
        activeTemplate: s.activeTemplate ? { ...s.activeTemplate, background_asset_url: res.background_asset_url } : null,
      }));
    } catch (err) {
      console.error('Failed to upload background:', err);
    }
  };

  const dynamicBindings = [
    { label: 'Recipient Name', key: 'recipient_name', defaultText: 'Ananya Kumar' },
    { label: 'Email Address', key: 'email', defaultText: 'ananya@example.com' },
    { label: 'Institution / Org', key: 'institution', defaultText: 'Stanford University' },
    { label: 'Event / Track Name', key: 'event_name', defaultText: 'Global AI Summit 2026' },
    { label: 'Event Date', key: 'event_date', defaultText: 'October 27, 2026' },
    { label: 'Registration ID', key: 'registration_id', defaultText: 'REG-2026-001' },
    { label: 'Credential ID', key: 'certificate_id', defaultText: 'CERT-2026-000125' },
  ];

  if (!isLeftPanelOpen) return null;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        onClick={() => setLeftPanelOpen(false)}
        className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-2xs"
      />
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] z-40 bg-white shadow-2xl flex flex-col border-r border-slate-200 md:relative md:w-72 md:z-20 md:shadow-none select-none flex-shrink-0 animate-in slide-in-from-left duration-150">
        {/* Mobile Header with Dismiss */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 md:hidden">
          <span className="text-xs font-bold text-slate-800">Add Elements & Presets</span>
          <button
            onClick={() => setLeftPanelOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            title="Close Panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      {/* Icon Navigation Bar */}
      <div className="grid grid-cols-6 border-b border-slate-200 p-1 bg-slate-50 text-slate-500">
        <button
          onClick={() => setActiveTab('text')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'text' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="Text & Variables"
        >
          <Type className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'elements' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="Shapes & Lines"
        >
          <Shapes className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTab('signatures')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'signatures' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="Signatures"
        >
          <PenTool className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'qr' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="QR Code"
        >
          <QrCode className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'templates' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="Templates & Backgrounds"
        >
          <LayoutTemplate className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`p-2 rounded flex flex-col items-center justify-center text-[10px] ${activeTab === 'layers' ? 'bg-white text-brand-600 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
          title="Layers"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Static Text</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => addElement({ element_type: 'static_text', content: 'CERTIFICATE TITLE', font_size: 28, font_weight: 'bold', width: 0.6, height: 0.08 })}
                  className="w-full text-left px-3 py-2 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-brand-50/50 text-slate-800 text-sm font-bold tracking-wide"
                >
                  Add Heading
                </button>
                <button
                  onClick={() => addElement({ element_type: 'static_text', content: 'This is proudly presented to', font_size: 14, width: 0.5, height: 0.05 })}
                  className="w-full text-left px-3 py-2 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-brand-50/50 text-slate-700 text-xs font-medium"
                >
                  Add Subheading
                </button>
                <button
                  onClick={() => addElement({ element_type: 'static_text', content: 'for outstanding contributions and exceptional dedication demonstrated throughout the academic program.', font_size: 12, width: 0.7, height: 0.08 })}
                  className="w-full text-left px-3 py-2 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-brand-50/50 text-slate-600 text-xs"
                >
                  Add Body Description
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Dynamic Variables</h3>
              <p className="text-[11px] text-slate-500 mb-2">
                Variables auto-populate with each recipient's specific data during generation.
              </p>
              <div className="space-y-1.5">
                {dynamicBindings.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => addElement({
                      element_type: 'dynamic_text',
                      binding_key: v.key,
                      content: v.defaultText,
                      font_size: v.key === 'recipient_name' ? 32 : 14,
                      font_weight: v.key === 'recipient_name' ? 'bold' : 'normal',
                      width: v.key === 'recipient_name' ? 0.7 : 0.4,
                      height: v.key === 'recipient_name' ? 0.09 : 0.05,
                      auto_fit_text: true,
                    })}
                    className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-brand-50/50 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{v.label}</div>
                      <div className="text-[10px] text-brand-600 font-mono">{`{{${v.key}}}`}</div>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ELEMENTS / SHAPES TAB */}
        {activeTab === 'elements' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Shapes & Dividers</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addElement({ element_type: 'shape', shape_type: 'line', width: 0.5, height: 0.01, border_color: '#C89D42', border_width: 2 })}
                className="p-3 border border-slate-200 rounded-md hover:border-brand-500 flex flex-col items-center justify-center space-y-2 hover:bg-slate-50"
              >
                <div className="w-12 h-0.5 bg-gold-500" />
                <span className="text-xs text-slate-700">Gold Line</span>
              </button>
              <button
                onClick={() => addElement({ element_type: 'shape', shape_type: 'rectangle', width: 0.9, height: 0.88, border_color: '#0F2841', border_width: 2, fill_color: undefined })}
                className="p-3 border border-slate-200 rounded-md hover:border-brand-500 flex flex-col items-center justify-center space-y-2 hover:bg-slate-50"
              >
                <div className="w-10 h-7 border-2 border-navy-800" />
                <span className="text-xs text-slate-700">Outer Border</span>
              </button>
              <button
                onClick={() => addElement({ element_type: 'shape', shape_type: 'rectangle', width: 0.3, height: 0.1, fill_color: '#F1F5F9', border_color: '#CBD5E1', border_width: 1 })}
                className="p-3 border border-slate-200 rounded-md hover:border-brand-500 flex flex-col items-center justify-center space-y-2 hover:bg-slate-50"
              >
                <div className="w-10 h-6 bg-slate-100 border border-slate-300 rounded" />
                <span className="text-xs text-slate-700">Badge Card</span>
              </button>
              <button
                onClick={() => addElement({ element_type: 'shape', shape_type: 'circle', width: 0.1, height: 0.14, fill_color: '#FDF6B2', border_color: '#C89D42', border_width: 1.5 })}
                className="p-3 border border-slate-200 rounded-md hover:border-brand-500 flex flex-col items-center justify-center space-y-2 hover:bg-slate-50"
              >
                <div className="w-7 h-7 rounded-full bg-amber-50 border border-gold-500" />
                <span className="text-xs text-slate-700">Gold Seal</span>
              </button>
            </div>
          </div>
        )}

        {/* SIGNATURES TAB */}
        {activeTab === 'signatures' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Authority Signatures</h3>
            <p className="text-[11px] text-slate-500">
              Institutional signatures with authorization tracking and designation.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => addElement({
                  element_type: 'static_text',
                  content: 'Dr. Marcus Vance\nOrganizing Secretary',
                  font_family: 'Helvetica',
                  font_size: 11,
                  text_align: 'center',
                  width: 0.25,
                  height: 0.08,
                })}
                className="w-full text-left p-3 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-slate-50"
              >
                <div className="font-semibold text-xs text-slate-800">Organizing Secretary Block</div>
                <div className="text-[11px] text-slate-500 font-serif italic mt-1">Marcus Vance</div>
              </button>
              <button
                onClick={() => addElement({
                  element_type: 'static_text',
                  content: 'Prof. Elena Rostova\nConference Director',
                  font_family: 'Helvetica',
                  font_size: 11,
                  text_align: 'center',
                  width: 0.25,
                  height: 0.08,
                })}
                className="w-full text-left p-3 border border-slate-200 rounded-md hover:border-brand-500 hover:bg-slate-50"
              >
                <div className="font-semibold text-xs text-slate-800">Conference Director Block</div>
                <div className="text-[11px] text-slate-500 font-serif italic mt-1">Elena Rostova</div>
              </button>
            </div>
          </div>
        )}

        {/* QR CODE TAB */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Verification QR Code</h3>
            <p className="text-[11px] text-slate-500">
              Unique QR code dynamically generated for each issued certificate pointing to its authoritative verification page.
            </p>
            <button
              onClick={() => addElement({
                element_type: 'qr_code',
                width: 0.10,
                height: 0.14,
              })}
              className="w-full p-4 border border-brand-200 bg-brand-50/50 rounded-lg hover:border-brand-500 flex flex-col items-center justify-center space-y-2 text-center"
            >
              <QrCode className="h-8 w-8 text-brand-600" />
              <div className="text-xs font-semibold text-slate-800">Insert Dynamic Verification QR</div>
              <div className="text-[10px] text-slate-500">Links to public authenticity record</div>
            </button>
          </div>
        )}

        {/* TEMPLATES & BACKGROUNDS TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                Upload Custom Template
              </h3>
              <p className="text-[11px] text-slate-500 mb-2">
                Use your own certificate background image from Canva, Photoshop, or your organization.
              </p>
              
              <label className="w-full border-2 border-dashed border-brand-300 hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-brand-50/20 hover:bg-brand-50/50 shadow-2xs">
                <Upload className="h-6 w-6 text-brand-600 mb-1" />
                <span className="text-xs font-semibold text-slate-800">Upload Certificate File</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP (300 DPI)</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUploadBg} className="hidden" />
              </label>

              {activeTemplate?.background_asset_url && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                    <span>Custom Template Active</span>
                    <button
                      onClick={async () => {
                        if (!activeTemplate) return;
                        await api.updateTemplate(activeTemplate.id, { background_asset_url: '' });
                        useProjectStore.setState((s) => ({
                          activeTemplate: s.activeTemplate ? { ...s.activeTemplate, background_asset_url: undefined } : null,
                        }));
                      }}
                      className="text-rose-600 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center space-x-1.5 pt-1">
                    <button
                      onClick={async () => {
                        if (!activeTemplate) return;
                        const updated = activeTemplate.elements.map((el) => {
                          if (el.element_type === 'shape' && (el.shape_type === 'rectangle' || el.shape_type === 'line')) {
                            return { ...el, is_visible: false };
                          }
                          return el;
                        });
                        useProjectStore.setState((s) => ({
                          activeTemplate: s.activeTemplate ? { ...s.activeTemplate, elements: updated } : null,
                        }));
                        await api.batchSyncElements(activeTemplate.id, updated);
                      }}
                      className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-1 text-[10px] font-medium text-center"
                    >
                      Hide Borders
                    </button>
                    <button
                      onClick={async () => {
                        if (!activeTemplate) return;
                        const updated = activeTemplate.elements.map((el) => ({ ...el, is_visible: true }));
                        useProjectStore.setState((s) => ({
                          activeTemplate: s.activeTemplate ? { ...s.activeTemplate, elements: updated } : null,
                        }));
                        await api.batchSyncElements(activeTemplate.id, updated);
                      }}
                      className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-1 text-[10px] font-medium text-center"
                    >
                      Show All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Canvas Background Color</h3>
              <div className="flex items-center space-x-2">
                {['#FCFAF5', '#FFFFFF', '#FFFDF7', '#F8FAFC', '#0F2841'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      if (activeTemplate) {
                        useProjectStore.setState((s) => ({
                          activeTemplate: s.activeTemplate ? { ...s.activeTemplate, background_color: c } : null,
                        }));
                        api.updateTemplate(activeTemplate.id, { background_color: c });
                      }
                    }}
                    style={{ backgroundColor: c }}
                    className="w-7 h-7 rounded-full border border-slate-300 shadow-2xs hover:scale-110 transition-transform"
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Design Presets</h3>
              <div className="space-y-1.5">
                <button
                  onClick={async () => {
                    if (!activeTemplate) return;
                    const resp = await fetch(`/api/v1/templates/${activeTemplate.id}/load-preset`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ preset: 'academic' })
                    });
                    if (resp.ok) {
                      const updated = await resp.json();
                      useProjectStore.setState({ activeTemplate: updated });
                    }
                  }}
                  className="w-full text-left p-2.5 border border-slate-200 hover:border-brand-500 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800">Classic Academic Honors</div>
                  <div className="text-[10px] text-slate-500">Gold fine borders, Cinzel serif typography</div>
                </button>
                <button
                  onClick={async () => {
                    if (!activeTemplate) return;
                    const resp = await fetch(`/api/v1/templates/${activeTemplate.id}/load-preset`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ preset: 'executive' })
                    });
                    if (resp.ok) {
                      const updated = await resp.json();
                      useProjectStore.setState({ activeTemplate: updated });
                    }
                  }}
                  className="w-full text-left p-2.5 border border-slate-200 hover:border-brand-500 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800">Modern Executive Diploma</div>
                  <div className="text-[10px] text-slate-500">Navy header accent, Montserrat typography</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Canvas Layers</h3>
            <div className="space-y-1">
              {[...(activeTemplate?.elements || [])]
                .sort((a, b) => b.layer_order - a.layer_order)
                .map((el) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${
                        isSelected ? 'bg-brand-50 border-brand-400 text-brand-900 font-medium' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[10px] uppercase font-mono px-1 py-0.5 bg-slate-100 rounded text-slate-500">
                          {el.element_type.replace('_', ' ')}
                        </span>
                        <span className="truncate max-w-[100px]">{el.content || el.binding_key || 'Element'}</span>
                      </div>
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => reorderElement(el.id, 'forward')}
                          className="p-1 hover:text-brand-600 text-slate-400"
                          title="Move Forward"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => reorderElement(el.id, 'backward')}
                          className="p-1 hover:text-brand-600 text-slate-400"
                          title="Move Backward"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => updateElementProps(el.id, { is_visible: !el.is_visible })}
                          className="p-1 hover:text-brand-600 text-slate-400"
                          title="Toggle Visibility"
                        >
                          {el.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-slate-300" />}
                        </button>
                        <button
                          onClick={() => updateElementProps(el.id, { is_locked: !el.is_locked })}
                          className="p-1 hover:text-brand-600 text-slate-400"
                          title="Toggle Lock"
                        >
                          {el.is_locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => deleteElement(el.id)}
                          className="p-1 hover:text-rose-600 text-slate-400"
                          title="Delete Element"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  </>
);
};
