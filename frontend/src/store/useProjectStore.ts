import { create } from 'zustand';
import { Project, CertificateTemplate, CanvasElement, Form, Recipient } from '../types';
import { api } from '../services/api';

interface ProjectState {
  currentProject: Project | null;
  activeTemplate: CertificateTemplate | null;
  activeForm: Form | null;
  recipients: Recipient[];
  activeRecipientIndex: number;
  isLoading: boolean;
  activeWorkspace: 'dashboard' | 'studio' | 'forms' | 'recipients' | 'issuance' | 'verification';
  isQuickCreateOpen: boolean;
  
  // Actions
  setActiveWorkspace: (ws: 'dashboard' | 'studio' | 'forms' | 'recipients' | 'issuance' | 'verification') => void;
  setQuickCreateOpen: (open: boolean) => void;
  loadProject: (projectId?: string) => Promise<void>;
  setActiveRecipientIndex: (index: number) => void;
  updateActiveRecipientData: (key: string, value: any) => Promise<void>;
  updateRecipientCell: (recipientId: string, key: string, value: any) => Promise<void>;
  refreshRecipients: () => Promise<void>;
  setElements: (elements: CanvasElement[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  activeTemplate: null,
  activeForm: null,
  recipients: [],
  activeRecipientIndex: 0,
  isLoading: false,
  activeWorkspace: 'studio',
  isQuickCreateOpen: false,

  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
  setQuickCreateOpen: (open) => set({ isQuickCreateOpen: open }),

  loadProject: async (projectId) => {
    set({ isLoading: true });
    try {
      let project: Project;
      if (projectId) {
        project = await api.getProject(projectId);
      } else {
        const projects = await api.getProjects();
        project = projects[0];
      }
      
      const tpl = project.templates?.[0] || null;
      const form = project.forms?.[0] || null;
      
      // Load recipients
      const recResp = await api.getRecipients(project.id, 1, 50);
      
      set({
        currentProject: project,
        activeTemplate: tpl,
        activeForm: form,
        recipients: recResp.items,
        activeRecipientIndex: 0,
        isLoading: false
      });
    } catch (err) {
      console.error('Failed to load project:', err);
      set({ isLoading: false });
    }
  },

  setActiveRecipientIndex: (index) => {
    const { recipients } = get();
    if (index >= 0 && index < recipients.length) {
      set({ activeRecipientIndex: index });
    }
  },

  updateActiveRecipientData: async (key: string, value: any) => {
    const { recipients, activeRecipientIndex } = get();
    const activeRec = recipients[activeRecipientIndex];
    if (!activeRec) return;

    const updatedData = { ...activeRec.data, [key]: value };
    const updatedRec = { ...activeRec, data: updatedData };
    
    // Update local state immediately for instant feedback
    const updatedList = [...recipients];
    updatedList[activeRecipientIndex] = updatedRec;
    set({ recipients: updatedList });

    // Persist to backend
    try {
      await api.updateRecipient(activeRec.id, updatedData);
    } catch (err) {
      console.error('Failed to update recipient data:', err);
    }
  },

  updateRecipientCell: async (recipientId: string, key: string, value: any) => {
    const { recipients } = get();
    const idx = recipients.findIndex(r => r.id === recipientId);
    if (idx === -1) return;

    const rec = recipients[idx];
    const updatedData = { ...rec.data, [key]: value };
    const updatedRec = { ...rec, data: updatedData };

    const updatedList = [...recipients];
    updatedList[idx] = updatedRec;
    set({ recipients: updatedList });

    try {
      await api.updateRecipient(recipientId, updatedData);
    } catch (err) {
      console.error('Failed to update recipient cell:', err);
    }
  },

  refreshRecipients: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const resp = await api.getRecipients(currentProject.id, 1, 100);
      set({ recipients: resp.items });
    } catch (err) {
      console.error('Failed to refresh recipients:', err);
    }
  },

  setElements: (elements) => {
    const { activeTemplate } = get();
    if (!activeTemplate) return;
    set({
      activeTemplate: {
        ...activeTemplate,
        elements
      }
    });
  }
}));
