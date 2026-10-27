import React, { useEffect } from 'react';
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
import { useProjectStore } from './store/useProjectStore';

export function App() {
  const { loadProject, activeWorkspace, isLoading, isQuickCreateOpen, setQuickCreateOpen } = useProjectStore();

  useEffect(() => {
    loadProject();
  }, [loadProject]);

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
    </div>
  );
}

export default App;
