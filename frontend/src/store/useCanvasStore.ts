import { create } from 'zustand';
import { CanvasElement } from '../types';
import { useProjectStore } from './useProjectStore';
import { api } from '../services/api';

interface CanvasState {
  zoom: number; // 0.25 to 4.0
  selectedElementId: string | null;
  editingElementId: string | null; // For stable inline double-click text editing
  showGrid: boolean;
  snapToGrid: boolean;
  showRulers: boolean;
  showSafeMargin: boolean;
  
  // History for undo / redo
  history: CanvasElement[][];
  historyIndex: number;
  
  // Save status indicator
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Panel visibility for responsive mobile and desktop layout
  isLeftPanelOpen: boolean;
  isPropertiesPanelOpen: boolean;
  toggleLeftPanel: () => void;
  togglePropertiesPanel: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setPropertiesPanelOpen: (open: boolean) => void;

  // Actions
  setZoom: (zoom: number) => void;
  setSelectedElementId: (id: string | null) => void;
  setEditingElementId: (id: string | null) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSafeMargin: () => void;
  
  // Element manipulation
  updateElementProps: (id: string, props: Partial<CanvasElement>) => void;
  addElement: (element: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorderElement: (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;
  
  // History
  undo: () => void;
  redo: () => void;
  pushHistorySnapshot: (elements: CanvasElement[]) => void;
  
  // Auto-save sync with backend
  saveElementsToBackend: () => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  zoom: 1.0,
  selectedElementId: null,
  editingElementId: null,
  showGrid: false,
  snapToGrid: false,
  showRulers: true,
  showSafeMargin: true,
  
  history: [],
  historyIndex: -1,
  isSaving: false,
  lastSavedAt: null,

  // Responsive panel defaults: Left open on desktop (>=1024px), properties open on wider screens (>=1280px)
  isLeftPanelOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  isPropertiesPanelOpen: typeof window !== 'undefined' ? window.innerWidth >= 1280 : false,
  toggleLeftPanel: () => set((s) => ({ isLeftPanelOpen: !s.isLeftPanelOpen })),
  togglePropertiesPanel: () => set((s) => ({ isPropertiesPanelOpen: !s.isPropertiesPanelOpen })),
  setLeftPanelOpen: (open) => set({ isLeftPanelOpen: open }),
  setPropertiesPanelOpen: (open) => set({ isPropertiesPanelOpen: open }),

  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 4.0) }),
  setSelectedElementId: (id) => {
    // If an element is selected on desktop, ensure properties panel is visible
    if (id && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      set({ selectedElementId: id, isPropertiesPanelOpen: true });
    } else {
      set({ selectedElementId: id });
    }
  },
  setEditingElementId: (id) => set({ editingElementId: id }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleSafeMargin: () => set((s) => ({ showSafeMargin: !s.showSafeMargin })),

  pushHistorySnapshot: (elements) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    if (newHistory.length > 30) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  updateElementProps: (id, props) => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    const elements = template.elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...props };
      }
      return el;
    });

    useProjectStore.getState().setElements(elements);
    get().pushHistorySnapshot(elements);
    get().saveElementsToBackend();
  },

  addElement: (newElProps) => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    const newElement: CanvasElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      template_id: template.id,
      element_type: newElProps.element_type || 'static_text',
      x: newElProps.x ?? 0.2,
      y: newElProps.y ?? 0.2,
      width: newElProps.width ?? 0.4,
      height: newElProps.height ?? 0.08,
      rotation: 0,
      content: newElProps.content ?? 'New Text Element',
      font_family: newElProps.font_family || 'Helvetica',
      font_size: newElProps.font_size || 20,
      font_weight: 'normal',
      font_style: 'normal',
      text_decoration: 'none',
      color: '#1A202C',
      text_align: 'center',
      vertical_align: 'middle',
      letter_spacing: 0,
      line_height: 1.3,
      uppercase: false,
      auto_fit_text: true,
      max_lines: 2,
      border_color: '#D1D5DB',
      border_width: 1,
      opacity: 1,
      layer_order: template.elements.length,
      is_locked: false,
      is_visible: true,
      ...newElProps,
    };

    const elements = [...template.elements, newElement];
    useProjectStore.getState().setElements(elements);
    set({ selectedElementId: newElement.id });
    get().pushHistorySnapshot(elements);
    get().saveElementsToBackend();
  },

  deleteElement: (id) => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    const elements = template.elements.filter((el) => el.id !== id);
    useProjectStore.getState().setElements(elements);
    set({ selectedElementId: null, editingElementId: null });
    get().pushHistorySnapshot(elements);
    get().saveElementsToBackend();
  },

  duplicateElement: (id) => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    const target = template.elements.find((el) => el.id === id);
    if (!target) return;

    const duplicated: CanvasElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: Math.min(target.x + 0.03, 0.8),
      y: Math.min(target.y + 0.03, 0.8),
      layer_order: template.elements.length,
    };

    const elements = [...template.elements, duplicated];
    useProjectStore.getState().setElements(elements);
    set({ selectedElementId: duplicated.id });
    get().pushHistorySnapshot(elements);
    get().saveElementsToBackend();
  },

  reorderElement: (id, direction) => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    const elements = [...template.elements].sort((a, b) => a.layer_order - b.layer_order);
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const target = elements[index];
    elements.splice(index, 1);

    if (direction === 'front') {
      elements.push(target);
    } else if (direction === 'back') {
      elements.unshift(target);
    } else if (direction === 'forward') {
      const newIdx = Math.min(index + 1, elements.length);
      elements.splice(newIdx, 0, target);
    } else if (direction === 'backward') {
      const newIdx = Math.max(index - 1, 0);
      elements.splice(newIdx, 0, target);
    }

    // Re-index layer orders
    elements.forEach((el, idx) => {
      el.layer_order = idx;
    });

    useProjectStore.getState().setElements(elements);
    get().pushHistorySnapshot(elements);
    get().saveElementsToBackend();
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const snapshot = JSON.parse(JSON.stringify(history[newIdx]));
      useProjectStore.getState().setElements(snapshot);
      set({ historyIndex: newIdx });
      get().saveElementsToBackend();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const snapshot = JSON.parse(JSON.stringify(history[newIdx]));
      useProjectStore.getState().setElements(snapshot);
      set({ historyIndex: newIdx });
      get().saveElementsToBackend();
    }
  },

  saveElementsToBackend: async () => {
    const template = useProjectStore.getState().activeTemplate;
    if (!template) return;

    set({ isSaving: true });
    try {
      await api.batchSyncElements(template.id, template.elements);
      set({ isSaving: false, lastSavedAt: new Date() });
    } catch (err) {
      console.error('Failed to auto-save elements:', err);
      set({ isSaving: false });
    }
  },
}));
