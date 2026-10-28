import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Topbar } from './components/layout/Topbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { CanvasWorkspace } from './components/studio/CanvasWorkspace';
import { LeftPanel } from './components/studio/LeftPanel';
import { PropertiesPanel } from './components/studio/PropertiesPanel';
import { FormStudio } from './components/forms/FormStudio';
import { RecipientManager } from './components/recipients/RecipientManager';
import { IssuanceCenter } from './components/issuance/IssuanceCenter';
import { VerificationCenter } from './components/verification/VerificationCenter';
import { InstantCertificateModal } from './components/issuance/InstantCertificateModal';
import { TemplateGalleryModal } from './components/studio/TemplateGalleryModal';
import { PublicVerificationPage } from './components/public/PublicVerificationPage';
import { PublicFormPage } from './components/public/PublicFormPage';
import { useProjectStore } from './store/useProjectStore';

export function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Public standalone routes
  if (pathname.startsWith('/verify') || pathname.startsWith('/public/verify')) {
    return <PublicVerificationPage />;
  }

  if (pathname.startsWith('/forms') || pathname.startsWith('/public/forms')) {
    return <PublicFormPage />;
  }

  const { 
    currentProject, loadProject, activeWorkspace, isLoading, 
    isQuickCreateOpen, setQuickCreateOpen, 
    isTemplateGalleryOpen, setTemplateGalleryOpen 
  } = useProjectStore();

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (isLoading && !currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-600 space-y-3">
        <RefreshCw className="h-7 w-7 animate-spin text-brand-600" />
        <div className="text-sm font-semibold text-slate-800">Loading CertiForm Studio...</div>
        <div className="text-xs text-slate-400">Initializing templates and digital certificate workspace</div>
      </div>
    );
  }

  if (!currentProject && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-600 space-y-3 p-4 text-center">
        <div className="h-10 w-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="text-sm font-bold text-slate-800">Connecting to Project Workspace...</div>
        <button
          onClick={() => loadProject()}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Topbar />

      <main className="flex-1 flex overflow-hidden">
        {activeWorkspace === 'dashboard' && <Dashboard />}

        {activeWorkspace === 'studio' && (
          <div className="flex-1 flex overflow-hidden">
            <LeftPanel />
            <CanvasWorkspace />
            <PropertiesPanel />
          </div>
        )}

        {activeWorkspace === 'forms' && <FormStudio />}
        {activeWorkspace === 'recipients' && <RecipientManager />}
        {activeWorkspace === 'issuance' && <IssuanceCenter />}
        {activeWorkspace === 'verification' && <VerificationCenter />}
      </main>

      <InstantCertificateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />

      <TemplateGalleryModal
        isOpen={isTemplateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
      />
    </div>
  );
}

export default App;
