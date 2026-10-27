import React, { useState } from 'react';
import { 
  LayoutDashboard, Palette, FileText, Users, Send, ShieldCheck, 
  ChevronLeft, ChevronRight, CheckCircle2, RefreshCw, Download, 
  ExternalLink, Sparkles, Menu, X 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export const Topbar: React.FC = () => {
  const { 
    currentProject, activeWorkspace, setActiveWorkspace, 
    recipients, activeRecipientIndex, setActiveRecipientIndex,
    setQuickCreateOpen 
  } = useProjectStore();
  
  const { isSaving, lastSavedAt } = useCanvasStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const totalRecipients = recipients.length;
  const currentRecipient = recipients[activeRecipientIndex];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'studio', label: 'Certificate Studio', icon: Palette },
    { id: 'forms', label: 'Form Studio', icon: FileText },
    { id: 'recipients', label: 'Recipient Manager', icon: Users },
    { id: 'issuance', label: 'Issuance Center', icon: Send },
    { id: 'verification', label: 'Verification Center', icon: ShieldCheck },
  ] as const;

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between select-none z-30 sticky top-0 shadow-sm flex-shrink-0">
        {/* Brand & Project Info */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="h-8 w-8 sm:h-9 sm:w-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold tracking-wider shadow-sm flex-shrink-0">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-900 text-xs sm:text-sm tracking-tight truncate">CertiForm Studio</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">SaaS</span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[180px]">
              {currentProject?.title || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Primary Workspace Navigation Tabs (Desktop lg and above) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Recipient Navigator, Save Status & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* Recipient Quick Carousel Navigator (Available in Studio & Recipient views) */}
          {totalRecipients > 0 && (
            <div className="hidden md:flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <button
                disabled={activeRecipientIndex <= 0}
                onClick={() => setActiveRecipientIndex(activeRecipientIndex - 1)}
                className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500"
                title="Previous recipient"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="text-xs font-medium text-slate-700 px-1 min-w-[90px] sm:min-w-[120px] text-center truncate max-w-[140px]">
                {currentRecipient?.data?.recipient_name || `Recipient ${activeRecipientIndex + 1}`}
                <span className="text-slate-400 font-normal ml-1 hidden sm:inline">
                  ({activeRecipientIndex + 1}/{totalRecipients})
                </span>
              </div>
              <button
                disabled={activeRecipientIndex >= totalRecipients - 1}
                onClick={() => setActiveRecipientIndex(activeRecipientIndex + 1)}
                className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500"
                title="Next recipient"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Auto-save state */}
          <div className="hidden sm:flex items-center text-xs text-slate-500 space-x-1 min-w-[55px]">
            {isSaving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-brand-500" />
                <span className="text-[11px]">Saving</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px]">Saved</span>
              </>
            )}
          </div>

          {/* Instant Certificate Generator Trigger */}
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            title="Instant Certificate Generator from Input"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            <span className="hidden sm:inline">Quick Certificate</span>
            <span className="sm:hidden text-[11px]">Quick</span>
          </button>

          {/* Direct Issuance Shortcut Button */}
          <button
            onClick={() => setActiveWorkspace('issuance')}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Issue</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu for View Switching */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-white border-b border-slate-200 shadow-xl z-30 p-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeWorkspace === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveWorkspace(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Icon className="h-4 w-4 text-brand-600 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Recipient Switcher */}
          {totalRecipients > 0 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
              <span className="text-slate-500 font-medium">Active Recipient:</span>
              <div className="flex items-center space-x-1">
                <button
                  disabled={activeRecipientIndex <= 0}
                  onClick={() => setActiveRecipientIndex(activeRecipientIndex - 1)}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-semibold text-slate-800 px-1 truncate max-w-[120px]">
                  {currentRecipient?.data?.recipient_name || `Recipient ${activeRecipientIndex + 1}`}
                </span>
                <button
                  disabled={activeRecipientIndex >= totalRecipients - 1}
                  onClick={() => setActiveRecipientIndex(activeRecipientIndex + 1)}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
