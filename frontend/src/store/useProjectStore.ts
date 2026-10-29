import { create } from 'zustand';
import { Project, CertificateTemplate, CanvasElement, Form, Recipient } from '../types';
import { api } from '../services/api';

interface ProjectState {
  currentProject: Project | null;
  templates: CertificateTemplate[];
  activeTemplate: CertificateTemplate | null;
  activeForm: Form | null;
  recipients: Recipient[];
  activeRecipientIndex: number;
  isLoading: boolean;
  activeWorkspace: 'dashboard' | 'studio' | 'forms' | 'recipients' | 'issuance' | 'verification';
  isQuickCreateOpen: boolean;
  isTemplateGalleryOpen: boolean;
  
  // Actions
  setActiveWorkspace: (ws: 'dashboard' | 'studio' | 'forms' | 'recipients' | 'issuance' | 'verification') => void;
  setQuickCreateOpen: (open: boolean) => void;
  setTemplateGalleryOpen: (open: boolean) => void;
  loadProject: (projectId?: string) => Promise<void>;
  selectTemplate: (templateId: string) => Promise<void>;
  createTemplate: (data: Partial<CertificateTemplate> & { preset?: string }) => Promise<CertificateTemplate>;
  duplicateTemplate: (templateId: string) => Promise<CertificateTemplate>;
  deleteTemplate: (templateId: string) => Promise<void>;
  cleanTemplateForArtwork: (templateId: string) => Promise<void>;
  refreshTemplates: () => Promise<void>;
  setActiveRecipientIndex: (index: number) => void;
  updateActiveRecipientData: (key: string, value: any) => Promise<void>;
  updateRecipientCell: (recipientId: string, key: string, value: any) => Promise<void>;
  refreshRecipients: () => Promise<void>;
  setElements: (elements: CanvasElement[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  templates: [],
  activeTemplate: null,
  activeForm: null,
  recipients: [],
  activeRecipientIndex: 0,
  isLoading: false,
  activeWorkspace: 'studio',
  isQuickCreateOpen: false,
  isTemplateGalleryOpen: false,

  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
  setQuickCreateOpen: (open) => set({ isQuickCreateOpen: open }),
  setTemplateGalleryOpen: (open) => set({ isTemplateGalleryOpen: open }),

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
      
      let tpls: CertificateTemplate[] = [];
      try {
        tpls = await api.getTemplates(project.id);
      } catch (e) {
        tpls = project.templates || [];
      }
      
      const tpl = tpls.find((t) => t.is_active) || tpls[0] || (project.templates?.find((t) => t.is_active) ?? project.templates?.[0] ?? null);
      const form = project.forms?.[0] || null;
      
      // Load recipients
      const recResp = await api.getRecipients(project.id, 1, 50);
      
      set({
        currentProject: project,
        templates: tpls,
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

  selectTemplate: async (templateId: string) => {
    set({ isLoading: true });
    try {
      // Activate on backend so serverless exports and issuance use this template
      const tpl = await api.activateTemplate(templateId);
      const updatedList = get().templates.map(t => ({
        ...t,
        is_active: t.id === templateId
      }));
      set({ activeTemplate: tpl, templates: updatedList, isLoading: false });
    } catch (err) {
      console.warn('Failed to activate on server, falling back to local select:', err);
      try {
        const tpl = await api.getTemplate(templateId);
        set({ activeTemplate: tpl, isLoading: false });
      } catch (innerErr) {
        const found = get().templates.find(t => t.id === templateId);
        if (found) set({ activeTemplate: found });
        set({ isLoading: false });
      }
    }
  },

  cleanTemplateForArtwork: async (templateId: string) => {
    try {
      const cleaned = await api.cleanTemplateForArtwork(templateId);
      const { templates } = get();
      const updatedList = templates.map(t => t.id === templateId ? cleaned : t);
      set({ activeTemplate: cleaned, templates: updatedList });
    } catch (err) {
      console.error('Failed to clean template overlays:', err);
    }
  },

  createTemplate: async (data: Partial<CertificateTemplate> & { preset?: string }) => {
    const { currentProject, templates } = get();
    const projectId = currentProject?.id || '00000000-0000-0000-0000-000000000001';
    const newTpl = await api.createTemplate(projectId, data);
    set({
      templates: [...templates, newTpl],
      activeTemplate: newTpl,
      activeWorkspace: 'studio'
    });
    return newTpl;
  },

  duplicateTemplate: async (templateId: string) => {
    const { templates } = get();
    const dup = await api.duplicateTemplate(templateId);
    set({
      templates: [...templates, dup],
      activeTemplate: dup,
      activeWorkspace: 'studio'
    });
    return dup;
  },

  deleteTemplate: async (templateId: string) => {
    const { templates, activeTemplate } = get();
    if (templates.length <= 1) {
      alert('Cannot delete the only template in the project.');
      return;
    }
    await api.deleteTemplate(templateId);
    const updated = templates.filter(t => t.id !== templateId);
    set({
      templates: updated,
      activeTemplate: activeTemplate?.id === templateId ? updated[0] : activeTemplate
    });
  },

  refreshTemplates: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const tpls = await api.getTemplates(currentProject.id);
      set({ templates: tpls });
    } catch (err) {
      console.error('Failed to refresh templates:', err);
    }
  },

  setActiveRecipientIndex: (index) => {
    const { recipients } = get();
    if (index >= 0 && index < recipients.length) {
      set({ activeRecipientIndex: index });
    }
  },

  updateActiveRecipientData: async (key: string, value: any) => {
    const { recipients, activeRecipientIndex, currentProject } = get();
    let activeRec = recipients[activeRecipientIndex];
    let updatedList = [...recipients];

    if (!activeRec) {
      activeRec = {
        id: 'draft-rec-001',
        project_id: currentProject?.id || 'sample-project',
        data: {},
        source: 'manual',
        status: 'draft',
        validation_errors: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updatedList = [activeRec];
    }

    const updatedData = { ...activeRec.data, [key]: value };

    // Synchronize person/student name synonyms
    const kLow = key.toLowerCase();
    if (['recipient_name', 'name', 'full_name', 'student_name', 's_name', 'sname', 's.name', 's_word', 'participant_name', 'candidate_name'].includes(kLow)) {
      updatedData.recipient_name = value;
      updatedData.name = value;
      updatedData.full_name = value;
      updatedData.student_name = value;
      updatedData.s_name = value;
      updatedData.sname = value;
    }
    // Synchronize event / topic synonyms
    if (['event_name', 'session_topic', 'topic', 'event'].includes(kLow)) {
      updatedData.event_name = value;
      updatedData.session_topic = value;
      updatedData.topic = value;
    }
    // Synchronize department synonyms
    if (['department', 'dept', 'branch'].includes(kLow)) {
      updatedData.department = value;
      updatedData.dept = value;
    }
    // Synchronize Date of Birth (DOB) synonyms
    if (['dob', 'date_of_birth', 'birth_date', 'birthdate', 'birthday'].includes(kLow)) {
      updatedData.dob = value;
      updatedData.date_of_birth = value;
      updatedData.birth_date = value;
    }
    // Synchronize date synonyms
    if (['event_date', 'date'].includes(kLow)) {
      updatedData.event_date = value;
      updatedData.date = value;
    }
    // Synchronize venue / institution synonyms
    if (['institution', 'venue', 'college', 'university'].includes(kLow)) {
      updatedData.institution = value;
      updatedData.venue = value;
      updatedData.college = value;
    }

    const updatedRec = { ...activeRec, data: updatedData };
    const curIdx = activeRecipientIndex >= 0 && activeRecipientIndex < updatedList.length ? activeRecipientIndex : 0;
    updatedList[curIdx] = updatedRec;
    set({ recipients: updatedList, activeRecipientIndex: curIdx });

    // Persist to backend if real ID
    if (!activeRec.id.startsWith('draft-')) {
      try {
        await api.updateRecipient(activeRec.id, updatedData);
      } catch (err) {
        console.error('Failed to update recipient data:', err);
      }
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
    const { currentProject, activeRecipientIndex } = get();
    if (!currentProject) return;
    try {
      const resp = await api.getRecipients(currentProject.id, 1, 100);
      const newItems = resp.items || [];
      const nextIndex = activeRecipientIndex >= newItems.length ? 0 : activeRecipientIndex;
      set({ recipients: newItems, activeRecipientIndex: nextIndex });
    } catch (err) {
      console.error('Failed to refresh recipients:', err);
    }
  },

  setElements: (elements) => {
    const { activeTemplate, templates } = get();
    if (!activeTemplate) return;
    const updatedTpl = {
      ...activeTemplate,
      elements
    };
    const updatedList = templates.map(t => t.id === activeTemplate.id ? updatedTpl : t);
    set({
      activeTemplate: updatedTpl,
      templates: updatedList
    });
  }
}));
