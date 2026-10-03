import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { HomeInputView, InvestigationInputPayload } from './components/HomeInputView';
import { InvestigationSequenceView } from './components/InvestigationSequenceView';
import { ResultView } from './components/ResultView';
import { EmergencyPlanModal } from './components/EmergencyPlanModal';
import { AuthModal } from './components/AuthModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { InvestigationResult } from './types/investigation';
import { AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, saveInvestigationReport } = useAuth();

  // Navigation views
  const [currentView, setCurrentView] = useState<'dashboard' | 'investigate' | 'investigating' | 'result'>('dashboard');
  const [selectedInitialTab, setSelectedInitialTab] = useState<'message' | 'url' | 'screenshot' | 'qr' | 'combined'>('message');

  const [analyzedSummary, setAnalyzedSummary] = useState({
    hasMessage: false,
    hasUrl: false,
    hasScreenshot: false,
    hasQr: false,
  });

  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
  const [viewingReportTitle, setViewingReportTitle] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showGlobalEmergency, setShowGlobalEmergency] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleStartInvestigation = async (payload: InvestigationInputPayload) => {
    setErrorMessage(null);
    setViewingReportTitle(undefined);
    setAnalyzedSummary({
      hasMessage: Boolean(payload.messageText),
      hasUrl: Boolean(payload.urlText),
      hasScreenshot: Boolean(payload.screenshotBase64),
      hasQr: Boolean(payload.qrScreenshotBase64 || payload.qrDecodedText),
    });
    setCurrentView('investigating');

    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Investigation failed with status ${response.status}`);
      }

      const resultData: InvestigationResult = await response.json();
      setInvestigationResult(resultData);
      setCurrentView('result');

      // If user enabled auto-save in their settings, auto-save to their ledger
      if (user && user.settings?.autoSaveReports) {
        try {
          await saveInvestigationReport({ result: resultData });
        } catch {
          // ignore background autosave error
        }
      }
    } catch (err: any) {
      console.error('Investigation error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during the investigation.');
      setCurrentView('investigate');
    }
  };

  const handleQuickLaunch = (tab: 'message' | 'url' | 'screenshot' | 'qr' | 'combined' = 'message') => {
    setSelectedInitialTab(tab);
    setInvestigationResult(null);
    setViewingReportTitle(undefined);
    setCurrentView('investigate');
  };

  const handleViewSavedReport = (result: InvestigationResult, reportTitle: string) => {
    setInvestigationResult(result);
    setViewingReportTitle(reportTitle);
    setCurrentView('result');
  };

  const handleResetInvestigation = () => {
    setInvestigationResult(null);
    setViewingReportTitle(undefined);
    setErrorMessage(null);
    setCurrentView('investigate');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentView={currentView === 'investigating' ? 'investigate' : currentView}
        onNavigate={(view) => {
          if (view === 'investigate') {
            handleQuickLaunch(user?.settings?.defaultInputTab || 'message');
          } else {
            setCurrentView('dashboard');
          }
        }}
        onResetInvestigation={handleResetInvestigation}
        onOpenEmergency={() => setShowGlobalEmergency(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        hasActiveInvestigation={currentView === 'result'}
      />

      {/* Main View Display */}
      <main className="flex-1">
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 rounded-xl border border-red-800/80 bg-red-950/40 text-red-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Pipeline Notice:</span>
                <p>{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200 font-mono text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 1. Dashboard View */}
        {currentView === 'dashboard' && (
          <DashboardView
            onStartNewInvestigation={handleQuickLaunch}
            onViewReportDetails={handleViewSavedReport}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {/* 2. Investigation Input (Home View) */}
        {currentView === 'investigate' && (
          <HomeInputView
            initialTab={selectedInitialTab}
            onStartInvestigation={handleStartInvestigation}
            isLoading={false}
            onReturnToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {/* 3. Live Sequence Animation */}
        {currentView === 'investigating' && (
          <InvestigationSequenceView analyzedSummary={analyzedSummary} />
        )}

        {/* 4. Results Assessment View */}
        {currentView === 'result' && investigationResult && (
          <ResultView
            result={investigationResult}
            onReset={handleResetInvestigation}
            onReturnToDashboard={() => setCurrentView('dashboard')}
            onRequireAuth={() => setShowAuthModal(true)}
            reportTitle={viewingReportTitle}
          />
        )}
      </main>

      {/* Global Emergency Containment Modal */}
      <EmergencyPlanModal
        isOpen={showGlobalEmergency}
        onClose={() => setShowGlobalEmergency(false)}
        threatSummary={investigationResult ? investigationResult.summary : 'Unverified artifact interaction'}
        riskLevel={investigationResult ? investigationResult.riskLevel : 'MEDIUM'}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // If we had an unsaved result, stay on result or switch to dashboard
        }}
      />

      {/* User Preferences Modal */}
      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Grounding & Ethics Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 font-mono">TRACEZERO</span>
            <span>• Grounded Forensic Digital Safety</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Strict zero-fabrication protocol. No external threat DB calls, simulated malware verdicts, or invented WHOIS reputation.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>RFC 3986 URL Engine</span>
            <span>Local QR Decoder</span>
            <span>Secure Forensic Store</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
