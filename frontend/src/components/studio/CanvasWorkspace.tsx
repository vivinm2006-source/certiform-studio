import React, { useRef, useState, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Lock, Eye, 
  Trash2, Copy, Move, CheckSquare, Grid, Compass, 
  AlignLeft, AlignCenter, AlignRight, Layers, Sparkles,
  Download, Edit3, X, RefreshCw, Sliders, Upload,
  PanelLeft, PanelRight, ChevronDown, Check, Plus, LayoutTemplate,
  ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { CanvasElement } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasOverlayInput } from './CanvasOverlayInput';
import { TemplateSettingsModal } from './TemplateSettingsModal';
import { api } from '../../services/api';

// Helper to resolve text binding variables in browser preview
function resolveText(templateStr: string | undefined, data: Record<string, any>, credentialId?: string): string {
  if (!templateStr) return '';
  const merged: Record<string, any> = { ...data };
  if (credentialId) {
    merged['certificate_id'] = credentialId;
    merged['credential_id'] = credentialId;
  }
  return templateStr.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const cleanKey = key.trim();
    let val = merged[cleanKey] ?? merged[cleanKey.toLowerCase()] ?? merged[cleanKey.toLowerCase().replace(/ /g, '_')];
    
    // Name aliases
    const ckLower = cleanKey.toLowerCase();
    if (val === undefined && (ckLower.includes('name') || ckLower.includes('student') || ckLower === 's' || ckLower.startsWith('s_') || ckLower.startsWith('s.'))) {
      for (const cand of [
        'recipient_name', 'student_name', 's_name', 'sname', 's.name', 'student',
        'full_name', 'name', 'participant_name', 'candidate_name',
        'Student Name', 'Full Name', 'Name', 'Student', 'S.Name', 'S Name', 'SName'
      ]) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }
    
    // Department aliases
    if (val === undefined && (cleanKey.toLowerCase().includes('department') || cleanKey.toLowerCase().includes('dept'))) {
      for (const cand of ['department', 'dept', 'Department', 'branch', 'Department Name']) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }
    
    // Event / Topic aliases
    if (val === undefined && (cleanKey.toLowerCase().includes('event') || cleanKey.toLowerCase().includes('topic') || cleanKey.toLowerCase().includes('session'))) {
      for (const cand of ['event_name', 'session_topic', 'Session Topic', 'topic', 'Topic', 'event', 'Event']) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }
    
    // Date aliases
    if (val === undefined && cleanKey.toLowerCase().includes('date') && !cleanKey.toLowerCase().includes('birth')) {
      for (const cand of ['event_date', 'date', 'Date', 'event date']) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }

    // Date of Birth aliases
    if (val === undefined && (cleanKey.toLowerCase().includes('dob') || cleanKey.toLowerCase().includes('birth'))) {
      for (const cand of ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'DOB', 'Date of Birth']) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }
    
    // Venue / Institution aliases
    if (val === undefined && (cleanKey.toLowerCase().includes('venue') || cleanKey.toLowerCase().includes('college') || cleanKey.toLowerCase().includes('institution'))) {
      for (const cand of ['venue', 'institution', 'college', 'university', 'Institute']) {
        if (merged[cand] !== undefined && String(merged[cand]).trim() !== '') {
          val = merged[cand];
          break;
        }
      }
    }

    return val !== undefined ? String(val) : `{{${cleanKey}}}`;
  });
}

function resolveDynamicValue(
  bindingKey: string | undefined, 
  content: string | undefined, 
  data: Record<string, any>, 
  credentialId?: string
): string {
  if (!data || Object.keys(data).length === 0) {
    return content || '';
  }

  // 1. If content contains {{...}} tags, always resolve template tags first
  if (content && content.includes('{{')) {
    return resolveText(content, data, credentialId);
  }

  // 2. Direct binding key lookup
  if (bindingKey && data[bindingKey] !== undefined && String(data[bindingKey]).trim() !== '') {
    return String(data[bindingKey]);
  }

  // 3. Normalized binding key lookup
  if (bindingKey) {
    const norm = bindingKey.toLowerCase().replace(/ /g, '_');
    if (data[norm] !== undefined && String(data[norm]).trim() !== '') {
      return String(data[norm]);
    }
  }

  // 4. Smart Name fallback: ONLY if binding key looks like a name field, or content is a known name placeholder
  const isNameBinding = (bindingKey && ['recipient_name', 'name', 'full_name', 'student_name', 'participant_name', 'candidate_name', 's_name', 'sname', 's.name', 's_word', 'student'].includes(bindingKey.toLowerCase())) ||
    (!bindingKey && content && ['ananya kumar', 'recipient name', 'student name', 'candidate name', 'full name', 'name', 'john doe', 's name', 's.name', 's word'].includes(content.toLowerCase().trim()));

  if (isNameBinding) {
    const candidateKeys = [
      'recipient_name', 'student_name', 's_name', 'sname', 's.name', 'student',
      'full_name', 'name', 'participant_name', 'candidate_name', 'attendee_name',
      'Student Name', 'Full Name', 'Name', 'Student', 'S.Name', 'S Name', 'SName',
      'name_of_the_student', 'name_of_student', 'students_name'
    ];
    for (const key of candidateKeys) {
      if (data[key] !== undefined && String(data[key]).trim() !== '') {
        return String(data[key]);
      }
    }
    // Fuzzy match person terms first
    for (const [k, v] of Object.entries(data)) {
      const kl = k.toLowerCase();
      if (['student', 'candidate', 'participant', 'recipient', 'person', 'member'].some(term => kl.includes(term)) && v !== undefined && String(v).trim() !== '') {
        return String(v);
      }
    }
    // Fuzzy match any field in data where key contains 'name', but NEVER event/college/dept/topic
    for (const [k, v] of Object.entries(data)) {
      const kl = k.toLowerCase();
      if (['event', 'college', 'dept', 'department', 'topic', 'session', 'institute', 'school', 'venue'].some(skip => kl.includes(skip))) {
        continue;
      }
      if (kl.includes('name') && v !== undefined && String(v).trim() !== '') {
        return String(v);
      }
    }
  }

  // 5. Department fallback
  if (bindingKey && ['department', 'dept'].includes(bindingKey.toLowerCase())) {
    for (const cand of ['department', 'dept', 'Department', 'branch', 'Department Name']) {
      if (data[cand] !== undefined && String(data[cand]).trim() !== '') {
        return String(data[cand]);
      }
    }
  }

  // 5b. Date of Birth (DOB) fallback
  if (bindingKey && ['dob', 'date_of_birth', 'birth_date', 'birthdate'].includes(bindingKey.toLowerCase())) {
    for (const cand of ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'DOB', 'Date of Birth', 'Birth Date']) {
      if (data[cand] !== undefined && String(data[cand]).trim() !== '') {
        return String(data[cand]);
      }
    }
  }

  // 6. Event Name / Topic fallback
  if (bindingKey && ['event_name', 'topic', 'session'].includes(bindingKey.toLowerCase())) {
    for (const cand of ['event_name', 'session_topic', 'Session Topic', 'topic', 'Topic', 'event', 'Event']) {
      if (data[cand] !== undefined && String(data[cand]).trim() !== '') {
        return String(data[cand]);
      }
    }
  }

  // 7. Date fallback
  if (bindingKey && ['event_date', 'date'].includes(bindingKey.toLowerCase())) {
    for (const cand of ['event_date', 'date', 'Date']) {
      if (data[cand] !== undefined && String(data[cand]).trim() !== '') {
        return String(data[cand]);
      }
    }
  }

  // 8. Fallback to content
  return content || '';
}

export const CanvasWorkspace: React.FC = () => {
  const { 
    activeTemplate, templates, selectTemplate, duplicateTemplate, 
    deleteTemplate, setTemplateGalleryOpen, recipients, 
    activeRecipientIndex, setActiveRecipientIndex, updateActiveRecipientData,
    cleanTemplateForArtwork
  } = useProjectStore();
  const { 
    zoom, setZoom, selectedElementId, setSelectedElementId,
    editingElementId, setEditingElementId, showGrid, toggleGrid,
    showRulers, toggleRulers, showSafeMargin, toggleSafeMargin,
    updateElementProps, deleteElement, duplicateElement,
    isLeftPanelOpen, toggleLeftPanel, isPropertiesPanelOpen, togglePropertiesPanel,
    saveElementsToBackend
  } = useCanvasStore();

  const [isAutoFit, setIsAutoFit] = useState(true);
  const [showLiveInputDrawer, setShowLiveInputDrawer] = useState(false);
  const [showTemplateSettingsModal, setShowTemplateSettingsModal] = useState(false);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRec = recipients[activeRecipientIndex];
  const recData: Record<string, any> = activeRec?.data || {
    recipient_name: 'Student Name',
    name: 'Student Name',
    full_name: 'Student Name',
    student_name: 'Student Name',
    department: 'Department of Artificial Intelligence and Machine Learning (AI & ML)',
    dob: '2004-05-14',
    event_name: 'STARTUP & ENTREPRENEURSHIP',
    session_topic: 'STARTUP & ENTREPRENEURSHIP',
    event_date: '26/10/2026',
    institution: 'Nehru Institute of Technology',
    venue: 'Nehru Institute of Technology',
    email: 'student@example.com'
  };

  const studentElement = activeTemplate?.elements.find(e => 
    e.binding_key === 'recipient_name' || 
    e.binding_key === 'student_name' || 
    (e.content && e.content.toLowerCase().includes('student name'))
  );
  const currentStudentFont = studentElement?.font_family || 'Great Vibes';

  const handleStudentFontChange = (font: string) => {
    if (studentElement) {
      updateElementProps(studentElement.id, { font_family: font });
    }
  };

  const handleUpdateCertificateWord = (field: 'name' | 'topic' | 'dept' | 'dob' | 'date' | 'venue' | 'title' | 'signatory', value: string) => {
    if (field === 'name') {
      updateActiveRecipientData('recipient_name', value);
      if (studentElement) updateElementProps(studentElement.id, { content: value });
    } else if (field === 'topic') {
      updateActiveRecipientData('event_name', value);
      const el = activeTemplate?.elements.find(e => 
        e.binding_key === 'event_name' || 
        (e.content && (e.content.toUpperCase().includes('STARTUP') || e.content.toUpperCase().includes('ENTREPRENEURSHIP') || e.content.toUpperCase().includes('AI')))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'dept') {
      updateActiveRecipientData('department', value);
      const el = activeTemplate?.elements.find(e => 
        e.binding_key === 'department' || 
        (e.content && e.content.toLowerCase().includes('department'))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'dob') {
      updateActiveRecipientData('dob', value);
      const el = activeTemplate?.elements.find(e => 
        e.binding_key === 'dob' || e.binding_key === 'date_of_birth' ||
        (e.content && (e.content.toLowerCase().includes('dob') || e.content.toLowerCase().includes('birth')))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'date') {
      updateActiveRecipientData('event_date', value);
      const el = activeTemplate?.elements.find(e => 
        e.binding_key === 'event_date' || 
        (e.content && (e.content.includes('/202') || e.content.toLowerCase().includes('date')))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'venue') {
      updateActiveRecipientData('institution', value);
      const el = activeTemplate?.elements.find(e => 
        e.binding_key === 'institution' || 
        (e.content && e.content.toLowerCase().includes('institute'))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'title') {
      const el = activeTemplate?.elements.find(e => 
        e.content && (e.content.includes('PARTICIPATION') || e.content.includes('EXCELLENCE') || e.content.includes('CERTIFICATE'))
      );
      if (el) updateElementProps(el.id, { content: value });
    } else if (field === 'signatory') {
      const el = activeTemplate?.elements.find(e => 
        e.content && (e.content.includes('Signatory') || e.content.includes('Director') || e.content.includes('President'))
      );
      if (el) updateElementProps(el.id, { content: value });
    }
  };

  // Standard base canvas dimensions in CSS pixels (1 pt ≈ 1.25 px for clean high-DPI display)
  const baseWidthPx = (activeTemplate?.width_pt || 841.89) * 1.2;
  const baseHeightPx = (activeTemplate?.height_pt || 595.28) * 1.2;

  // Snapping guides state
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);

  // Dragging and resizing interaction state
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    handle?: string;
  } | null>(null);

  // Keyboard navigation & nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        editingElementId || 
        !selectedElementId || 
        activeTag === 'input' || 
        activeTag === 'textarea' || 
        activeTag === 'select' || 
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      const el = (activeTemplate?.elements || []).find((el) => el.id === selectedElementId);
      if (!el || el.is_locked) return;

      const step = e.shiftKey ? 0.02 : 0.005;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateElementProps(el.id, { y: Math.max(0, el.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateElementProps(el.id, { y: Math.min(1 - el.height, el.y + step) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateElementProps(el.id, { x: Math.max(0, el.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateElementProps(el.id, { x: Math.min(1 - el.width, el.x + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteElement(el.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, editingElementId, activeTemplate]);

  // Pointer move & up handlers for dragging/resizing with smart center-snapping
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState) return;

      const dx = (e.clientX - dragState.startX) / (baseWidthPx * zoom);
      const dy = (e.clientY - dragState.startY) / (baseHeightPx * zoom);

      if (!dragState.handle) {
        // Dragging whole element
        let newX = Math.max(0, Math.min(1 - dragState.initialW, dragState.initialX + dx));
        let newY = Math.max(0, Math.min(1 - dragState.initialH, dragState.initialY + dy));

        // Snap to horizontal center (x = 0.5 - w/2) within threshold of 0.015
        const centerX = 0.5 - dragState.initialW / 2;
        if (Math.abs(newX - centerX) < 0.015) {
          newX = centerX;
          setSnapGuideX(0.5);
        } else {
          setSnapGuideX(null);
        }

        // Snap to vertical center (y = 0.5 - h/2) within threshold
        const centerY = 0.5 - dragState.initialH / 2;
        if (Math.abs(newY - centerY) < 0.015) {
          newY = centerY;
          setSnapGuideY(0.5);
        } else {
          setSnapGuideY(null);
        }

        updateElementProps(dragState.elementId, { x: newX, y: newY });
      } else {
        // Resizing with 8 handles
        let newX = dragState.initialX;
        let newY = dragState.initialY;
        let newW = dragState.initialW;
        let newH = dragState.initialH;

        if (dragState.handle.includes('e')) newW = Math.max(0.02, dragState.initialW + dx);
        if (dragState.handle.includes('s')) newH = Math.max(0.02, dragState.initialH + dy);
        if (dragState.handle.includes('w')) {
          const clampedDx = Math.min(dx, dragState.initialW - 0.02);
          newX = dragState.initialX + clampedDx;
          newW = dragState.initialW - clampedDx;
        }
        if (dragState.handle.includes('n')) {
          const clampedDy = Math.min(dy, dragState.initialH - 0.02);
          newY = dragState.initialY + clampedDy;
          newH = dragState.initialH - clampedDy;
        }

        updateElementProps(dragState.elementId, {
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: Math.min(1, newW),
          height: Math.min(1, newH),
        });
      }
    };

    const handlePointerUp = () => {
      if (dragState) {
        setDragState(null);
        setSnapGuideX(null);
        setSnapGuideY(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, baseWidthPx, baseHeightPx, zoom]);

  // Calculate optimal zoom scale to fit entire certificate in viewport
  const calculateFitScale = () => {
    if (!containerRef.current) return 0.65;
    const rect = containerRef.current.getBoundingClientRect();
    const paddingX = typeof window !== 'undefined' && window.innerWidth < 640 ? 24 : 48;
    const paddingY = typeof window !== 'undefined' && window.innerWidth < 640 ? 24 : 48;
    const availW = Math.max(120, rect.width - paddingX);
    const availH = Math.max(120, rect.height - paddingY);
    const scale = Math.min(availW / baseWidthPx, availH / baseHeightPx);
    return Number(Math.max(0.15, Math.min(2.0, scale)).toFixed(2));
  };

  const fitToScreen = () => {
    const scale = calculateFitScale();
    setZoom(scale);
    setIsAutoFit(true);
  };

  // Auto-fit on initial mount, template changes, or dimension changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeTemplate?.id, activeTemplate?.width_pt, activeTemplate?.height_pt]);

  // Keep fitted dynamically when container dimensions change (e.g. sidebars toggled, window resized)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (isAutoFit) {
        const scale = calculateFitScale();
        setZoom(scale);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [isAutoFit, baseWidthPx, baseHeightPx]);

  // Quick 1-click center alignment action
  const centerSelectedElement = () => {
    if (!selectedElementId || !activeTemplate) return;
    const el = (activeTemplate.elements || []).find(e => e.id === selectedElementId);
    if (!el) return;
    const centeredX = (1.0 - el.width) / 2;
    updateElementProps(el.id, { x: centeredX });
  };

  // Quick switch to preset
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
        setSelectedElementId(null);
      }
    } catch (err) {
      console.error('Failed to load preset:', err);
    }
  };

  const handleDownloadActivePdf = async () => {
    if (!activeTemplate) return;
    setIsExporting(true);
    try {
      const resp = await fetch('/api/v1/render/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: {
            width_pt: activeTemplate.width_pt,
            height_pt: activeTemplate.height_pt,
            background_color: activeTemplate.background_color,
            background_asset_url: activeTemplate.background_asset_url,
          },
          elements: activeTemplate.elements,
          recipient_data: recData,
          format: 'pdf',
          credential_id: `CERT-SAMPLE-${(activeRecipientIndex + 1).toString().padStart(4, '0')}`,
        }),
      });
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recData.recipient_name || 'Certificate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadActivePng = async () => {
    if (!activeTemplate) return;
    setIsExporting(true);
    try {
      const resp = await api.renderPreview({
        template: {
          width_pt: activeTemplate.width_pt,
          height_pt: activeTemplate.height_pt,
          background_color: activeTemplate.background_color,
          background_asset_url: activeTemplate.background_asset_url,
        },
        elements: activeTemplate.elements,
        recipient_data: recData,
        format: 'png',
        credential_id: `CERT-SAMPLE-${(activeRecipientIndex + 1).toString().padStart(4, '0')}`,
      });
      const a = document.createElement('a');
      a.href = resp.data_url;
      a.download = `${recData.recipient_name || 'Certificate'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const templateElements = activeTemplate?.elements || [];
  const selectedEl = templateElements.find((el) => el.id === selectedElementId);
  const editingEl = templateElements.find((el) => el.id === editingElementId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-200/60 overflow-hidden relative select-none">
      {/* Top Floating Canvas Toolbar */}
      <div className="min-h-11 py-1 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between z-20 shadow-xs overflow-x-auto scrollbar-none gap-2 flex-shrink-0">
        {/* Left Side: Toggle Left Panel & Zoom Controls */}
        <div className="flex items-center space-x-1.5 text-xs flex-shrink-0">
          <button
            onClick={toggleLeftPanel}
            className={`p-1.5 rounded transition-colors mr-1 flex items-center space-x-1 ${
              isLeftPanelOpen ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={isLeftPanelOpen ? 'Collapse Elements Panel' : 'Expand Elements Panel'}
          >
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Elements</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200" />

          <button
            onClick={() => {
              setIsAutoFit(false);
              setZoom(Math.max(0.2, Number((zoom - 0.1).toFixed(2))));
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-semibold text-slate-700 min-w-[38px] text-center font-mono text-[11px]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => {
              setIsAutoFit(false);
              setZoom(Math.min(3.0, Number((zoom + 0.1).toFixed(2))));
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />
          <button
            onClick={fitToScreen}
            className={`px-2 py-1 rounded flex items-center space-x-1 font-medium text-[11px] transition-colors ${
              isAutoFit
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Auto-Fit Certificate to Screen (Prevents overflow on normal screens)"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Fit Screen</span>
          </button>
          <button
            onClick={() => {
              setIsAutoFit(false);
              setZoom(1.0);
            }}
            className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 font-medium text-[11px] hidden sm:inline"
            title="100% Zoom"
          >
            100%
          </button>
        </div>

        {/* Template Selector, + Add Template, Alignment & Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {selectedEl && (
            <button
              onClick={centerSelectedElement}
              className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded text-[11px] font-semibold flex items-center space-x-1"
              title="Align Selected Element Horizontally Center"
            >
              <AlignCenter className="h-3 w-3" />
              <span className="hidden sm:inline">Center</span>
            </button>
          )}

          {/* Template Switcher Dropdown & Mode Indicator */}
          <div className="relative flex items-center space-x-1.5">
            <button
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="px-2 sm:px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded text-[11px] font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors max-w-[140px] sm:max-w-[210px]"
              title="Switch or manage certificate templates"
            >
              <LayoutTemplate className="h-3.5 w-3.5 text-brand-600 flex-shrink-0" />
              <span className="truncate">{activeTemplate?.name || 'Select Template'}</span>
              <ChevronDown className="h-3 w-3 text-slate-400 flex-shrink-0 ml-0.5" />
            </button>

            {/* Template Mode Badge & Clean Overlays Shortcut */}
            {activeTemplate?.background_asset_url ? (
              <div className="flex items-center space-x-1">
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                  Uploaded Artwork
                </span>
                <button
                  onClick={() => cleanTemplateForArtwork(activeTemplate.id)}
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Remove old preset text/fonts that overlay your uploaded certificate artwork"
                >
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  <span className="hidden md:inline">Clean Overlays</span>
                </button>
              </div>
            ) : (
              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                Default Preset
              </span>
            )}

            {isTemplateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsTemplateDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Project Templates</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{templates.length}</span>
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-100">
                    {/* Section 1: Uploaded Artwork */}
                    {templates.filter(t => !!t.background_asset_url).length > 0 && (
                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50/50">
                          Uploaded Artwork Designs
                        </div>
                        {templates.filter(t => !!t.background_asset_url).map((tpl) => {
                          const isActive = activeTemplate?.id === tpl.id;
                          return (
                            <div
                              key={tpl.id}
                              className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer group transition-colors ${
                                isActive ? 'bg-purple-50 text-purple-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                              onClick={() => {
                                selectTemplate(tpl.id);
                                setIsTemplateDropdownOpen(false);
                              }}
                            >
                              <div className="flex items-center space-x-2 truncate pr-2">
                                {isActive ? (
                                  <Check className="h-3.5 w-3.5 text-purple-600 flex-shrink-0 stroke-[2.5]" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                                )}
                                <div className="truncate">
                                  <div className="truncate text-[11px] leading-tight">{tpl.name}</div>
                                  <div className="text-[9px] text-purple-600/70 font-normal mt-0.5">
                                    Custom Artwork • {tpl.elements?.length || 0} dynamic fields
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={async () => {
                                    await duplicateTemplate(tpl.id);
                                    setIsTemplateDropdownOpen(false);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                                  title="Duplicate template"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                {templates.length > 1 && (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Delete template "${tpl.name}"?`)) {
                                        await deleteTemplate(tpl.id);
                                      }
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Section 2: Default Presets */}
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                        Default Presets
                      </div>
                      {templates.filter(t => !t.background_asset_url).map((tpl) => {
                        const isActive = activeTemplate?.id === tpl.id;
                        return (
                          <div
                            key={tpl.id}
                            className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer group transition-colors ${
                              isActive ? 'bg-brand-50/70 text-brand-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              selectTemplate(tpl.id);
                              setIsTemplateDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center space-x-2 truncate pr-2">
                              {isActive ? (
                                <Check className="h-3.5 w-3.5 text-brand-600 flex-shrink-0 stroke-[2.5]" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                              )}
                              <div className="truncate">
                                <div className="truncate text-[11px] leading-tight">{tpl.name}</div>
                                <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                                  {tpl.page_format.replace('_', ' ')} • {tpl.elements?.length || 0} elements
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={async () => {
                                  await duplicateTemplate(tpl.id);
                                  setIsTemplateDropdownOpen(false);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                                title="Duplicate template"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {templates.length > 1 && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Delete template "${tpl.name}"?`)) {
                                      await deleteTemplate(tpl.id);
                                    }
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="Delete template"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={() => {
                        setIsTemplateDropdownOpen(false);
                        setTemplateGalleryOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add New Template</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Direct "+ Add Template" Button */}
          <button
            onClick={() => setTemplateGalleryOpen(true)}
            className="px-2 sm:px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-colors"
            title="Add a new certificate template from library or upload custom artwork"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Template</span>
          </button>

          {/* Template Settings Button */}
          <button
            onClick={() => setShowTemplateSettingsModal(true)}
            className="px-2 sm:px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
            title="Edit template name, upload custom certificate design, or adjust paper format"
          >
            <Sliders className="h-3 w-3 text-slate-500" />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>

        {/* Recipient Carousel Switcher */}
        {recipients && recipients.length > 0 && (
          <div className="flex items-center space-x-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setActiveRecipientIndex(Math.max(0, activeRecipientIndex - 1))}
              disabled={activeRecipientIndex === 0}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Recipient"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="px-1.5 py-0.5 flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
              <User className="h-3 w-3 text-brand-600 flex-shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-[150px] font-semibold">
                {activeRec?.data?.recipient_name || activeRec?.data?.name || activeRec?.data?.full_name || `Recipient ${activeRecipientIndex + 1}`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({activeRecipientIndex + 1}/{recipients.length})
              </span>
            </div>
            <button
              onClick={() => setActiveRecipientIndex(Math.min(recipients.length - 1, activeRecipientIndex + 1))}
              disabled={activeRecipientIndex >= recipients.length - 1}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Recipient"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* View toggles & Quick Export Actions */}
        <div className="flex items-center space-x-1.5 text-xs flex-shrink-0">
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={toggleGrid}
              className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-brand-50 text-brand-600 font-semibold' : 'hover:bg-slate-100 text-slate-500'}`}
              title="Toggle Alignment Grid"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleRulers}
              className={`p-1.5 rounded transition-colors ${showRulers ? 'bg-brand-50 text-brand-600 font-semibold' : 'hover:bg-slate-100 text-slate-500'}`}
              title="Toggle Rulers"
            >
              <Compass className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleSafeMargin}
              className={`p-1.5 rounded transition-colors ${showSafeMargin ? 'bg-brand-50 text-brand-600 font-semibold' : 'hover:bg-slate-100 text-slate-500'}`}
              title="Toggle Safe Margins"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block mx-0.5" />

          {/* Edit Certificate Words Drawer Toggle */}
          <button
            onClick={() => setShowLiveInputDrawer(!showLiveInputDrawer)}
            className={`px-2.5 py-1 sm:px-3 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-colors ${
              showLiveInputDrawer
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs'
            }`}
            title="Open Certificate Words Edit Table to change student name, topic, and certificate words"
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-700" />
            <span>Edit Certificate Words</span>
          </button>

          {/* Quick PDF & PNG Download Buttons */}
          <button
            onClick={handleDownloadActivePdf}
            disabled={isExporting}
            className="px-2 py-1 sm:px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
            title="Download current recipient certificate as Vector PDF"
          >
            {isExporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span>PDF</span>
          </button>

          <button
            onClick={handleDownloadActivePng}
            disabled={isExporting}
            className="px-2 py-1 sm:px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
            title="Download current recipient certificate as High-Res PNG"
          >
            <Download className="h-3 w-3 text-slate-500" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

          {/* Right Side: Toggle Properties Panel */}
          <button
            onClick={togglePropertiesPanel}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
              isPropertiesPanelOpen ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={isPropertiesPanelOpen ? 'Collapse Properties Panel' : 'Expand Properties Panel'}
          >
            <PanelRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Props</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area with Rulers */}
      <div
        ref={containerRef}
        onClick={() => {
          setSelectedElementId(null);
          setEditingElementId(null);
        }}
        className={`flex-1 overflow-auto flex p-3 sm:p-6 md:p-8 ${showGrid ? 'canvas-grid-pattern' : ''}`}
      >
        <div className="m-auto relative flex items-center justify-center">
          <div
            style={{
              width: `${baseWidthPx * zoom}px`,
              height: `${baseHeightPx * zoom}px`,
              backgroundColor: activeTemplate?.background_color || '#FFFFFF',
              position: 'relative',
            }}
            className="canvas-shadow transition-shadow rounded-xs relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Background image if set */}
          {activeTemplate?.background_asset_url && (
            <img
              src={activeTemplate.background_asset_url}
              alt="Certificate Background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}

          {/* Center Smart Snapping Guidelines */}
          {snapGuideX !== null && (
            <div
              style={{
                position: 'absolute',
                left: `${snapGuideX * 100}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: '#0066CC',
                zIndex: 40,
                pointerEvents: 'none',
              }}
            />
          )}
          {snapGuideY !== null && (
            <div
              style={{
                position: 'absolute',
                top: `${snapGuideY * 100}%`,
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: '#0066CC',
                zIndex: 40,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Safe Margin Guide (dashed border 2% from edges) */}
          {showSafeMargin && (
            <div
              style={{
                position: 'absolute',
                left: '2%',
                top: '2%',
                width: '96%',
                height: '96%',
                border: '1px dashed rgba(200, 157, 66, 0.45)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          )}

          {/* Canvas Elements */}
          {templateElements
            .filter((el) => el.is_visible)
            .sort((a, b) => a.layer_order - b.layer_order)
            .map((el) => {
              const isSelected = selectedElementId === el.id;
              const isEditing = editingElementId === el.id;

              // Render element contents
              let renderedContent = null;
              const justifyClass = el.vertical_align === 'top' ? 'justify-start' : el.vertical_align === 'bottom' ? 'justify-end' : 'justify-center';
              const alignClass = el.text_align === 'left' ? 'items-start text-left' : el.text_align === 'right' ? 'items-end text-right' : 'items-center text-center';

              const activeCredId = `CERT-2026-${(activeRecipientIndex + 1).toString().padStart(6, '0')}`;
              if (el.element_type === 'dynamic_text') {
                const textVal = resolveDynamicValue(el.binding_key, el.content, recData, activeCredId);

                const scaledFont = Math.max(8, el.font_size * zoom * (baseWidthPx / 841.89));

                renderedContent = (
                  <div
                    className={`w-full h-full flex flex-col ${justifyClass} ${alignClass} overflow-hidden whitespace-pre-line`}
                    style={{
                      fontFamily: el.font_family,
                      fontSize: `${scaledFont}px`,
                      fontWeight: el.font_weight,
                      fontStyle: el.font_style,
                      textDecoration: el.text_decoration,
                      color: el.color,
                      textAlign: el.text_align,
                      textTransform: el.uppercase ? 'uppercase' : 'none',
                      lineHeight: el.line_height,
                      letterSpacing: el.letter_spacing ? `${el.letter_spacing}px` : undefined,
                    }}
                  >
                    <span className={`w-full block leading-snug ${el.text_align === 'left' ? 'text-left' : el.text_align === 'right' ? 'text-right' : 'text-center'}`}>
                      {textVal || 'Double click to type'}
                    </span>
                  </div>
                );
              } else if (el.element_type === 'static_text') {
                const textVal = resolveText(el.content, recData, activeCredId);
                const scaledFont = Math.max(8, el.font_size * zoom * (baseWidthPx / 841.89));

                renderedContent = (
                  <div
                    className={`w-full h-full flex flex-col ${justifyClass} ${alignClass} overflow-hidden whitespace-pre-line`}
                    style={{
                      fontFamily: el.font_family,
                      fontSize: `${scaledFont}px`,
                      fontWeight: el.font_weight,
                      fontStyle: el.font_style,
                      textDecoration: el.text_decoration,
                      color: el.color,
                      textAlign: el.text_align,
                      textTransform: el.uppercase ? 'uppercase' : 'none',
                      lineHeight: el.line_height,
                      letterSpacing: el.letter_spacing ? `${el.letter_spacing}px` : undefined,
                    }}
                  >
                    <span className={`w-full block leading-snug ${el.text_align === 'left' ? 'text-left' : el.text_align === 'right' ? 'text-right' : 'text-center'}`}>
                      {textVal}
                    </span>
                  </div>
                );
              } else if (el.element_type === 'qr_code') {
                renderedContent = (
                  <div className="w-full h-full flex items-center justify-center p-1 bg-white border border-slate-200 rounded shadow-xs">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                      <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="5" width="20" height="20" fill="#fff" />
                      <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="75" y="5" width="20" height="20" fill="#fff" />
                      <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="75" width="20" height="20" fill="#fff" />
                      <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                      <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                      <rect x="45" y="45" width="10" height="10" fill="#fff" />
                      <circle cx="50" cy="50" r="3" fill="currentColor" />
                      <rect x="40" y="10" width="15" height="10" fill="currentColor" />
                      <rect x="10" y="45" width="10" height="15" fill="currentColor" />
                      <rect x="70" y="50" width="15" height="20" fill="currentColor" />
                      <rect x="45" y="75" width="20" height="15" fill="currentColor" />
                    </svg>
                  </div>
                );
              } else if (el.element_type === 'signature') {
                if (el.asset_url) {
                  renderedContent = (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img
                        src={el.asset_url}
                        alt="Signature"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    </div>
                  );
                } else {
                  // Authentic cursive font rendering for typed signature
                  const signerName = el.content || 'Authorized Signer';
                  const scaledFont = Math.max(16, (el.font_size || 28) * zoom * (baseWidthPx / 841.89));
                  renderedContent = (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        fontFamily: el.font_family || 'Great Vibes',
                        fontSize: `${scaledFont}px`,
                        color: el.color || '#0F2841',
                        letterSpacing: '1px',
                      }}
                    >
                      {signerName}
                    </div>
                  );
                }
              } else if (el.element_type === 'image') {
                renderedContent = (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    {el.asset_url ? (
                      <img
                        src={el.asset_url}
                        alt="Asset"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="border border-dashed border-slate-300 w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        Image Placeholder
                      </div>
                    )}
                  </div>
                );
              } else if (el.element_type === 'shape') {
                const borderW = (el.border_width || 1) * zoom;
                if (el.shape_type === 'line') {
                  renderedContent = (
                    <div
                      className="w-full h-0 border-t"
                      style={{
                        borderColor: el.border_color,
                        borderTopWidth: `${Math.max(1, borderW)}px`,
                      }}
                    />
                  );
                } else {
                  renderedContent = (
                    <div
                      className="w-full h-full"
                      style={{
                        borderColor: el.border_color,
                        borderWidth: `${borderW}px`,
                        borderStyle: 'solid',
                        backgroundColor: el.fill_color || 'transparent',
                        borderRadius: el.shape_type === 'circle' ? '9999px' : '0px',
                      }}
                    />
                  );
                }
              }

              // Normalized geometry to canvas pixels
              const elLeft = el.x * baseWidthPx * zoom;
              const elTop = el.y * baseHeightPx * zoom;
              const elWidth = el.width * baseWidthPx * zoom;
              const elHeight = el.height * baseHeightPx * zoom;

              // Check if this is an empty decorative border frame
              const isHollowFrame = el.element_type === 'shape' && !el.fill_color && (el.is_locked || !isSelected);

              return (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: `${elLeft}px`,
                    top: `${elTop}px`,
                    width: `${elWidth}px`,
                    height: `${elHeight}px`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    zIndex: el.layer_order + 1,
                    // If locked or a hollow border, do not intercept clicks so user can click elements inside!
                    pointerEvents: isHollowFrame ? 'none' : 'auto',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (el.element_type === 'dynamic_text' || el.element_type === 'static_text') {
                      setSelectedElementId(el.id);
                      setEditingElementId(el.id);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (el.is_locked || isEditing) return;
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                    setDragState({
                      elementId: el.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialX: el.x,
                      initialY: el.y,
                      initialW: el.width,
                      initialH: el.height,
                    });
                  }}
                  className={`group relative cursor-move ${
                    isSelected ? 'ring-2 ring-brand-500 ring-offset-1 shadow-sm' : 'hover:ring-1 hover:ring-brand-300/60'
                  }`}
                >
                  {renderedContent}

                  {/* 8 Resize Handles when selected */}
                  {isSelected && !el.is_locked && !isEditing && (
                    <>
                      {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
                        let handleClass = 'absolute w-2 h-2 bg-white border border-brand-500 rounded-xs z-30 ';
                        if (handle === 'nw') handleClass += '-top-1 -left-1 cursor-nwse-resize';
                        if (handle === 'n') handleClass += '-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize';
                        if (handle === 'ne') handleClass += '-top-1 -right-1 cursor-nesw-resize';
                        if (handle === 'e') handleClass += 'top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize';
                        if (handle === 'se') handleClass += '-bottom-1 -right-1 cursor-nwse-resize';
                        if (handle === 's') handleClass += '-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize';
                        if (handle === 'sw') handleClass += '-bottom-1 -left-1 cursor-nesw-resize';
                        if (handle === 'w') handleClass += 'top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize';

                        return (
                          <div
                            key={handle}
                            className={handleClass}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                elementId: el.id,
                                startX: e.clientX,
                                startY: e.clientY,
                                initialX: el.x,
                                initialY: el.y,
                                initialW: el.width,
                                initialH: el.height,
                                handle,
                              });
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}

          {/* Stable Inline Editing Input Overlay */}
          {editingEl && (
            <CanvasOverlayInput
              element={editingEl}
              canvasWidthPx={baseWidthPx}
              canvasHeightPx={baseHeightPx}
              zoom={zoom}
            />
          )}
        </div>
      </div>
    </div>

      {/* Sliding Certificate Words Edit Table Drawer */}
      {showLiveInputDrawer && (
        <div className="absolute right-4 top-14 w-96 max-w-[92vw] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-5 z-40 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Edit Certificate Words
                </h4>
                <p className="text-[10px] text-slate-500">Live editor table with 1-click font switching</p>
              </div>
            </div>
            <button
              onClick={() => setShowLiveInputDrawer(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5 py-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {/* Student Name & Font Selector */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-900 block">Student / Recipient Name</label>
                <span className="text-[10px] text-amber-700 font-mono">Font: {currentStudentFont}</span>
              </div>
              <input
                type="text"
                value={recData.recipient_name || recData.full_name || recData.name || ''}
                onChange={(e) => handleUpdateCertificateWord('name', e.target.value)}
                placeholder="Enter student name (e.g. Vivin M)"
                className="w-full border border-amber-300 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 font-medium shadow-2xs"
              />
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-amber-800 block">Student Name Font:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Cursive Script', font: 'Great Vibes' },
                    { label: 'Classic Serif', font: 'Playfair Display' },
                    { label: 'Clean Sans', font: 'Montserrat' },
                    { label: 'Academic Serif', font: 'Cinzel' },
                  ].map((f) => (
                    <button
                      key={f.font}
                      type="button"
                      onClick={() => handleStudentFontChange(f.font)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold text-center border transition-all ${
                        currentStudentFont === f.font
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Event / Session Topic */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Session Topic / Event Name</label>
              <input
                type="text"
                value={recData.event_name || ''}
                onChange={(e) => handleUpdateCertificateWord('topic', e.target.value)}
                placeholder="e.g. STARTUP & ENTREPRENEURSHIP"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Department / Branch</label>
              <input
                type="text"
                value={recData.department || ''}
                onChange={(e) => handleUpdateCertificateWord('dept', e.target.value)}
                placeholder="e.g. Department of Artificial Intelligence and Machine Learning (AI & ML)"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>

            {/* Date of Birth (DOB) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Date of Birth (DOB)</label>
              <input
                type="text"
                value={recData.dob || recData.date_of_birth || ''}
                onChange={(e) => handleUpdateCertificateWord('dob', e.target.value)}
                placeholder="e.g. 15/08/2004 or 2004-08-15"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>

            {/* Date of Event */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Date of Conformance / Conduct</label>
              <input
                type="text"
                value={recData.event_date || ''}
                onChange={(e) => handleUpdateCertificateWord('date', e.target.value)}
                placeholder="e.g. 26/10/2026"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>

            {/* Venue / College */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Institution / College / Venue</label>
              <input
                type="text"
                value={recData.institution || ''}
                onChange={(e) => handleUpdateCertificateWord('venue', e.target.value)}
                placeholder="e.g. Nehru Institute of Technology"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>

            {/* Recipient Email */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">Recipient Email</label>
              <input
                type="email"
                value={recData.email || ''}
                onChange={(e) => updateActiveRecipientData('email', e.target.value)}
                placeholder="e.g. recipient@example.com"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={async () => {
                await saveElementsToBackend();
                alert('All certificate words and styling saved successfully!');
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-2xs"
              title="Save all edits to the template and recipient store"
            >
              <CheckSquare className="h-3 w-3" />
              <span>Save & Sync</span>
            </button>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleDownloadActivePdf}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleDownloadActivePng}
                disabled={isExporting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
              >
                PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Configuration & Custom Upload Modal */}
      <TemplateSettingsModal
        isOpen={showTemplateSettingsModal}
        onClose={() => setShowTemplateSettingsModal(false)}
      />
    </div>
  );
};
