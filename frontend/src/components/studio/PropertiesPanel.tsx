import React from 'react';
import { 
  Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Underline, Move, Copy, Trash2, ArrowUp, ArrowDown, 
  Layers, Lock, Sparkles, Sliders, ChevronDown, X 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export const PropertiesPanel: React.FC = () => {
  const { activeTemplate, activeForm } = useProjectStore();
  const { 
    selectedElementId, updateElementProps, deleteElement, 
    duplicateElement, reorderElement,
    isPropertiesPanelOpen, setPropertiesPanelOpen 
  } = useCanvasStore();

  if (!isPropertiesPanelOpen) return null;

  const elements = activeTemplate?.elements || [];
  const selectedEl = elements.find((el) => el.id === selectedElementId);

  if (!selectedEl) {
    return (
      <>
        <div
          onClick={() => setPropertiesPanelOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-2xs"
        />
        <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] z-40 bg-white shadow-2xl flex flex-col border-l border-slate-200 md:relative md:w-80 md:z-20 md:shadow-none select-none flex-shrink-0 animate-in slide-in-from-right duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-800">Element Properties</span>
            <button
              onClick={() => setPropertiesPanelOpen(false)}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center select-none text-slate-400">
            <Sliders className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No element selected</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              Click any text, border, signature, or QR code on the certificate to inspect and refine its properties.
            </p>
          </div>
        </div>
      </>
    );
  }

  const isText = selectedEl.element_type === 'dynamic_text' || selectedEl.element_type === 'static_text' || selectedEl.element_type === 'signature';

  const fonts = [
    { label: 'Cinzel (Classical Academic)', value: 'Cinzel' },
    { label: 'Playfair Display (Editorial)', value: 'Playfair Display' },
    { label: 'Montserrat (Modern Clean)', value: 'Montserrat' },
    { label: 'Merriweather (Literary Serif)', value: 'Merriweather' },
    { label: 'Helvetica / Arial (Universal Sans)', value: 'Helvetica' },
    { label: 'Times New Roman (Formal Serif)', value: 'Times' },
    { label: 'Great Vibes (Calligraphy Cursive)', value: 'Great Vibes' },
    { label: 'Alex Brush (Signature Script)', value: 'Alex Brush' },
    { label: 'Courier (Monospace)', value: 'Courier' },
  ];

  const colorSwatches = [
    '#0F2841', '#0F172A', '#1A202C', '#C89D42', '#059669', '#0066CC', '#DC2626', '#475569', '#FFFFFF'
  ];

  const availableBindingKeys = [
    'recipient_name', 'email', 'institution', 'event_name', 'event_date', 
    'registration_id', 'certificate_id', 'award_category'
  ];

  // Alignment helpers
  const alignToCanvas = (direction: 'center_x' | 'center_y' | 'left' | 'right' | 'top' | 'bottom') => {
    if (direction === 'center_x') updateElementProps(selectedEl.id, { x: (1.0 - selectedEl.width) / 2 });
    if (direction === 'center_y') updateElementProps(selectedEl.id, { y: (1.0 - selectedEl.height) / 2 });
    if (direction === 'left') updateElementProps(selectedEl.id, { x: 0.05 });
    if (direction === 'right') updateElementProps(selectedEl.id, { x: 0.95 - selectedEl.width });
    if (direction === 'top') updateElementProps(selectedEl.id, { y: 0.05 });
    if (direction === 'bottom') updateElementProps(selectedEl.id, { y: 0.95 - selectedEl.height });
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        onClick={() => setPropertiesPanelOpen(false)}
        className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-2xs"
      />
      <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] z-40 bg-white shadow-2xl flex flex-col border-l border-slate-200 md:relative md:w-80 md:z-20 md:shadow-none select-none flex-shrink-0 animate-in slide-in-from-right duration-150 overflow-y-auto">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono uppercase bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded">
              {selectedEl.element_type.replace('_', ' ')}
            </span>
            <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
              {selectedEl.binding_key || selectedEl.content || 'Properties'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => duplicateElement(selectedEl.id)}
              className="p-1 rounded hover:bg-slate-200 text-slate-600"
              title="Duplicate Element"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => deleteElement(selectedEl.id)}
              className="p-1 rounded hover:bg-rose-100 text-rose-600"
              title="Delete Element"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPropertiesPanelOpen(false)}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 ml-1"
              title="Close Properties"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

      <div className="p-4 space-y-5 text-xs text-slate-700">
        {/* Dynamic Variable Binding (if dynamic text) */}
        {selectedEl.element_type === 'dynamic_text' && (
          <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl space-y-2">
            <label className="block font-bold text-brand-900 text-[11px] uppercase tracking-wider">
              Data Binding Variable
            </label>
            <select
              value={selectedEl.binding_key || ''}
              onChange={(e) => updateElementProps(selectedEl.id, { binding_key: e.target.value })}
              className="w-full bg-white border border-brand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-brand-500 shadow-xs"
            >
              <option value="">-- Custom Formula / Template String --</option>
              {availableBindingKeys.map((key) => (
                <option key={key} value={key}>
                  {`{{${key}}}`}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-brand-700 leading-normal">
              Synchronized with the active recipient roster and public registration form.
            </p>
          </div>
        )}

        {/* Text Content (for both static text and dynamic variables) */}
        {(selectedEl.element_type === 'static_text' || selectedEl.element_type === 'dynamic_text') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-[11px]">
                {selectedEl.element_type === 'dynamic_text' ? 'Text / Fallback Content' : 'Text Content'}
              </label>
              {selectedEl.element_type === 'dynamic_text' && selectedEl.binding_key && (
                <span className="text-[10px] text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-mono font-medium">
                  {`{{${selectedEl.binding_key}}}`}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={selectedEl.content || ''}
              onChange={(e) => {
                const newContent = e.target.value;
                updateElementProps(selectedEl.id, { content: newContent });
                if (selectedEl.binding_key) {
                  useProjectStore.getState().updateActiveRecipientData(selectedEl.binding_key, newContent);
                }
              }}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-brand-500 leading-normal shadow-2xs"
              placeholder="Enter text or {{variable}} formula..."
            />
          </div>
        )}

        {/* TYPOGRAPHY CONTROLS */}
        {isText && (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Typography</h4>

            {/* Font Family */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-medium">Font Family</label>
              <select
                value={selectedEl.font_family}
                onChange={(e) => updateElementProps(selectedEl.id, { font_family: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white outline-none focus:border-brand-500 shadow-xs"
              >
                {fonts.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Size (pt)</label>
                <input
                  type="number"
                  min={8}
                  max={140}
                  value={selectedEl.font_size}
                  onChange={(e) => updateElementProps(selectedEl.id, { font_size: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Weight</label>
                <select
                  value={selectedEl.font_weight}
                  onChange={(e) => updateElementProps(selectedEl.id, { font_weight: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white outline-none focus:border-brand-500 shadow-xs"
                >
                  <option value="normal">Normal (400)</option>
                  <option value="bold">Bold (700)</option>
                </select>
              </div>
            </div>

            {/* Formatting & Alignment Toolbar */}
            <div className="flex items-center space-x-1 bg-slate-100/80 p-1 border border-slate-200 rounded-lg">
              <button
                onClick={() => updateElementProps(selectedEl.id, { font_weight: selectedEl.font_weight === 'bold' ? 'normal' : 'bold' })}
                className={`p-1.5 rounded ${selectedEl.font_weight === 'bold' ? 'bg-white shadow-xs font-bold text-brand-600' : 'text-slate-600 hover:text-slate-900'}`}
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateElementProps(selectedEl.id, { font_style: selectedEl.font_style === 'italic' ? 'normal' : 'italic' })}
                className={`p-1.5 rounded ${selectedEl.font_style === 'italic' ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600 hover:text-slate-900'}`}
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateElementProps(selectedEl.id, { text_decoration: selectedEl.text_decoration === 'underline' ? 'none' : 'underline' })}
                className={`p-1.5 rounded ${selectedEl.text_decoration === 'underline' ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600 hover:text-slate-900'}`}
                title="Underline"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-300 mx-1" />
              <button
                onClick={() => updateElementProps(selectedEl.id, { text_align: 'left' })}
                className={`p-1.5 rounded ${selectedEl.text_align === 'left' ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600'}`}
                title="Align Left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateElementProps(selectedEl.id, { text_align: 'center' })}
                className={`p-1.5 rounded ${selectedEl.text_align === 'center' ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600'}`}
                title="Align Center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateElementProps(selectedEl.id, { text_align: 'right' })}
                className={`p-1.5 rounded ${selectedEl.text_align === 'right' ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600'}`}
                title="Align Right"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateElementProps(selectedEl.id, { uppercase: !selectedEl.uppercase })}
                className={`px-1.5 py-1 rounded text-[10px] font-bold ${selectedEl.uppercase ? 'bg-white shadow-xs text-brand-600' : 'text-slate-600'}`}
                title="Uppercase"
              >
                AA
              </button>
            </div>

            {/* Letter Spacing & Line Height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Tracking (px)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={selectedEl.letter_spacing}
                  onChange={(e) => updateElementProps(selectedEl.id, { letter_spacing: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Line Height</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="2.5"
                  value={selectedEl.line_height}
                  onChange={(e) => updateElementProps(selectedEl.id, { line_height: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none"
                />
              </div>
            </div>

            {/* Text Color Swatches & Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-medium">Text Color</label>
              <div className="flex items-center space-x-1.5">
                {colorSwatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateElementProps(selectedEl.id, { color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border border-slate-300 shadow-xs transition-transform ${selectedEl.color === c ? 'ring-2 ring-brand-500 scale-110' : 'hover:scale-105'}`}
                  />
                ))}
                <input
                  type="color"
                  value={selectedEl.color}
                  onChange={(e) => updateElementProps(selectedEl.id, { color: e.target.value })}
                  className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Auto-fit text toggle */}
            <label className="flex items-center space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEl.auto_fit_text}
                onChange={(e) => updateElementProps(selectedEl.id, { auto_fit_text: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-600">Auto-shrink font size if text exceeds box width</span>
            </label>
          </div>
        )}

        {/* SHAPE CONTROLS */}
        {selectedEl.element_type === 'shape' && (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Shape Appearance</h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Border Width (pt)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={selectedEl.border_width}
                  onChange={(e) => updateElementProps(selectedEl.id, { border_width: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Border Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={selectedEl.border_color}
                    onChange={(e) => updateElementProps(selectedEl.id, { border_color: e.target.value })}
                    className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedEl.border_color}
                    onChange={(e) => updateElementProps(selectedEl.id, { border_color: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALIGNMENT SHORTCUTS */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Canvas Alignment</h4>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => alignToCanvas('center_x')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-center space-x-1"
            >
              <AlignCenter className="h-3 w-3 text-brand-600" />
              <span>Center Horiz.</span>
            </button>
            <button
              onClick={() => alignToCanvas('center_y')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-center space-x-1"
            >
              <Move className="h-3 w-3 text-brand-600" />
              <span>Center Vert.</span>
            </button>
          </div>
        </div>

        {/* GEOMETRY & COORDINATES */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Position & Size (%)</h4>
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">X Ratio</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={Number(selectedEl.x.toFixed(3))}
                onChange={(e) => updateElementProps(selectedEl.id, { x: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Y Ratio</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={Number(selectedEl.y.toFixed(3))}
                onChange={(e) => updateElementProps(selectedEl.id, { y: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Width Ratio</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={Number(selectedEl.width.toFixed(3))}
                onChange={(e) => updateElementProps(selectedEl.id, { width: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Height Ratio</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={Number(selectedEl.height.toFixed(3))}
                onChange={(e) => updateElementProps(selectedEl.id, { height: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* LAYER ARRANGEMENT */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Arrange Layers</h4>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => reorderElement(selectedEl.id, 'front')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Bring to Front
            </button>
            <button
              onClick={() => reorderElement(selectedEl.id, 'back')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Send to Back
            </button>
            <button
              onClick={() => reorderElement(selectedEl.id, 'forward')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Bring Forward
            </button>
            <button
              onClick={() => reorderElement(selectedEl.id, 'backward')}
              className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Send Backward
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
);
};
