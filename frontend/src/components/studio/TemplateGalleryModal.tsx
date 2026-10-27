import React, { useState, useRef } from 'react';
import { 
  LayoutTemplate, Plus, Upload, Check, Sparkles, 
  Award, GraduationCap, Briefcase, Code, Heart, 
  CheckCircle2, X, FileImage, Copy, Eye
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetOption {
  id: string;
  category: 'academic' | 'executive' | 'tech' | 'appreciation' | 'completion' | 'blank';
  title: string;
  description: string;
  previewBg: string;
  accentColor: string;
  borderStyle: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, createTemplate, selectTemplate, templates } = useProjectStore();
  const [selectedPreset, setSelectedPreset] = useState<string>('academic');
  const [templateName, setTemplateName] = useState('');
  const [pageFormat, setPageFormat] = useState('A4_LANDSCAPE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const presets: PresetOption[] = [
    {
      id: 'academic',
      category: 'academic',
      title: 'Classic Academic Honors',
      description: 'Gold double frame, Cinzel serif typography, formal academic conferral citation, and verified QR stamp.',
      previewBg: '#FCFAF5',
      accentColor: '#C89D42',
      borderStyle: 'border-amber-600',
      badgeText: 'Academic & University',
      icon: GraduationCap,
    },
    {
      id: 'executive',
      category: 'executive',
      title: 'Modern Executive Diploma',
      description: 'Crisp corporate layout with emerald geometric accents, clean Montserrat typography, and dual director signatures.',
      previewBg: '#FFFFFF',
      accentColor: '#059669',
      borderStyle: 'border-emerald-600',
      badgeText: 'Corporate & Executive',
      icon: Briefcase,
    },
    {
      id: 'tech',
      category: 'tech',
      title: 'Innovation & Tech Summit',
      description: 'Futuristic indigo and slate aesthetic with participant credentials, cryptographic hash code, and dynamic QR verification.',
      previewBg: '#F8FAFC',
      accentColor: '#4338CA',
      borderStyle: 'border-indigo-600',
      badgeText: 'Hackathon & Tech Summit',
      icon: Code,
    },
    {
      id: 'appreciation',
      category: 'appreciation',
      title: 'Certificate of Appreciation',
      description: 'Distinguished bronze accents and warm parchment for honoring volunteers, keynotes, committee members, and community leaders.',
      previewBg: '#FFFDF7',
      accentColor: '#B45309',
      borderStyle: 'border-amber-700',
      badgeText: 'Honors & Recognition',
      icon: Heart,
    },
    {
      id: 'completion',
      category: 'completion',
      title: 'Course Completion & Mastery',
      description: 'Accreditation certificate with deep navy borders, certificate ID watermark, course details, and instructor signature block.',
      previewBg: '#F0F9FF',
      accentColor: '#0284C7',
      borderStyle: 'border-sky-600',
      badgeText: 'Bootcamps & Workshops',
      icon: Award,
    },
    {
      id: 'blank',
      category: 'blank',
      title: 'Clean Starter Canvas',
      description: 'Minimal slate with essential variable bindings (Name, Event, Date, QR code). Ideal for uploading custom graphic backgrounds.',
      previewBg: '#FFFFFF',
      accentColor: '#64748B',
      borderStyle: 'border-slate-300',
      badgeText: 'Custom Artwork Ready',
      icon: LayoutTemplate,
    },
  ];

  const pageFormats = [
    { id: 'A4_LANDSCAPE', label: 'A4 Landscape', dims: '297 × 210 mm', width: 841.89, height: 595.28 },
    { id: 'US_LETTER_LANDSCAPE', label: 'US Letter Landscape', dims: '11 × 8.5 in', width: 792.00, height: 612.00 },
    { id: 'WIDESCREEN_16_9', label: 'Digital Widescreen (16:9)', dims: '1920 × 1080 px', width: 960.00, height: 540.00 },
    { id: 'A4_PORTRAIT', label: 'A4 Portrait', dims: '210 × 297 mm', width: 595.28, height: 841.89 },
  ];

  const handleCreateFromPreset = async () => {
    if (!currentProject) return;
    setIsSubmitting(true);
    const chosenPreset = presets.find((p) => p.id === selectedPreset) || presets[0];
    const chosenFormat = pageFormats.find((f) => f.id === pageFormat) || pageFormats[0];
    const finalName = templateName.trim() || `${chosenPreset.title} ${templates.length + 1}`;

    try {
      await createTemplate({
        name: finalName,
        page_format: pageFormat,
        width_pt: chosenFormat.width,
        height_pt: chosenFormat.height,
        background_color: chosenPreset.previewBg,
        preset: chosenPreset.id,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.message || 'Failed to create certificate template');
    }
  };

  const handleUploadCustomFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentProject) return;
    const file = e.target.files[0];
    setIsUploadingCustom(true);

    try {
      // 1. Read file as Base64 Data URL for guaranteed immediate display across all environments
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const chosenFormat = pageFormats.find((f) => f.id === pageFormat) || pageFormats[0];
        const customName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Custom Certificate Template';

        try {
          const newTpl = await createTemplate({
            name: customName,
            page_format: pageFormat,
            width_pt: chosenFormat.width,
            height_pt: chosenFormat.height,
            background_asset_url: dataUrl,
            background_color: '#FFFFFF',
            preset: 'blank',
          });

          // Also try uploading file to server storage if supported
          try {
            await api.uploadTemplateBackground(newTpl.id, file);
          } catch {
            // Base64 already saved in template
          }

          setIsUploadingCustom(false);
          onClose();
        } catch (innerErr: any) {
          setIsUploadingCustom(false);
          alert(innerErr.message || 'Failed to initialize custom template');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingCustom(false);
      alert(err.message || 'Failed to process certificate image');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Add Certificate Template</span>
                <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
                  Library & Custom
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Choose a pre-aligned layout or upload your organization's custom certificate artwork.
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
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* UPLOAD CUSTOM ARTWORK HERO BANNER */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-lg">
              <div className="flex items-center space-x-2 text-brand-900 font-bold text-sm">
                <FileImage className="h-4 w-4 text-brand-600" />
                <span>Upload Existing Certificate Design</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Already designed in Canva, Photoshop, or Figma? Upload your certificate graphic (PNG, JPG, WEBP) to create a new template and position dynamic text variables on top.
              </p>
            </div>
            <div className="flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadCustomFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCustom}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{isUploadingCustom ? 'Processing File...' : 'Upload Certificate File'}</span>
              </button>
            </div>
          </div>

          {/* TEMPLATE GALLERY GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                <span>Select from Built-in Professional Presets</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">6 Presets Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      if (!templateName) {
                        setTemplateName(preset.title);
                      }
                    }}
                    className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 shadow-xs ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    {/* Visual Card Preview Mini-Thumbnail */}
                    <div
                      style={{ backgroundColor: preset.previewBg }}
                      className="w-full h-24 rounded-lg border border-slate-200 relative p-2.5 flex flex-col justify-between mb-3 shadow-2xs overflow-hidden select-none"
                    >
                      <div
                        style={{ borderColor: preset.accentColor }}
                        className="absolute inset-1 border rounded pointer-events-none"
                      />
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 truncate max-w-[120px]">
                          {preset.badgeText}
                        </span>
                        <div
                          style={{ backgroundColor: preset.accentColor }}
                          className="h-2 w-2 rounded-full"
                        />
                      </div>
                      <div className="text-center relative z-10 my-auto">
                        <div className="text-[10px] font-bold text-slate-800 tracking-tight leading-tight">
                          {preset.title}
                        </div>
                        <div className="text-[8px] text-slate-500 mt-0.5">Recipient Full Name</div>
                      </div>
                      <div className="flex items-center justify-between text-[7px] text-slate-400 relative z-10 pt-1">
                        <span>Signature</span>
                        <span>QR Verification</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{preset.title}</span>
                        {isSelected && (
                          <div className="h-4 w-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONFIGURATION: TEMPLATE NAME & FORMAT */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Template Name
              </label>
              <input
                type="text"
                placeholder="e.g. Annual Summit Award"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 bg-white"
              />
              <span className="text-[10px] text-slate-400">Leave blank to use preset title</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Page Format & Orientation
              </label>
              <select
                value={pageFormat}
                onChange={(e) => setPageFormat(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 bg-white"
              >
                {pageFormats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.dims})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">Standard 300 DPI high-resolution vector print</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current templates in project: <span className="font-bold text-slate-700">{templates.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateFromPreset}
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating Template...' : 'Add Template to Studio'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
