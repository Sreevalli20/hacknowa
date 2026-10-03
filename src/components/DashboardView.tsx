import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SavedReportItem } from '../types/auth';
import { InvestigationResult, RiskLevel } from '../types/investigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Link2,
  Image as ImageIcon,
  QrCode,
  Layers,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Calendar,
  Tag,
  FileText,
  User,
  Settings,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface DashboardViewProps {
  onStartNewInvestigation: (tab?: 'message' | 'url' | 'screenshot' | 'qr' | 'combined') => void;
  onViewReportDetails: (result: InvestigationResult, reportTitle: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartNewInvestigation,
  onViewReportDetails,
  onOpenSettings,
  onOpenAuth,
}) => {
  const { user, savedReports, deleteSavedReport } = useAuth();

  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Calculate statistics across saved reports
  const totalReports = savedReports.length;
  const criticalCount = savedReports.filter((r) => r.result.riskLevel === 'CRITICAL').length;
  const highCount = savedReports.filter((r) => r.result.riskLevel === 'HIGH').length;
  const mediumCount = savedReports.filter((r) => r.result.riskLevel === 'MEDIUM').length;
  const lowCount = savedReports.filter((r) => r.result.riskLevel === 'LOW').length;

  const avgScore =
    totalReports > 0
      ? Math.round(savedReports.reduce((acc, r) => acc + r.result.riskScore, 0) / totalReports)
      : 0;

  // Filtered reports list
  const filteredReports = savedReports.filter((report) => {
    const matchesRisk = filterRisk === 'ALL' || report.result.riskLevel === filterRisk;
    const matchesSearch =
      searchQuery.trim() === '' ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.result.urlAnalysis?.hostname &&
        report.result.urlAnalysis.hostname.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesRisk && matchesSearch;
  });

  const handleCopyMarkdown = (report: SavedReportItem) => {
    const md = `# TRACEZERO INVESTIGATION: ${report.title}
Date: ${new Date(report.createdAt).toLocaleString()}
Risk Level: ${report.result.riskLevel} (${report.result.riskScore}/100)
Status: ${report.status}

Observed Facts:
${report.result.verificationBoundary.observed.map((o) => `- ${o}`).join('\n')}

Inferred Vectors:
${report.result.verificationBoundary.inferred.map((i) => `- ${i}`).join('\n')}

Actions Recommended:
${report.result.recommendedActions.map((a) => `- [${a.priority}] ${a.action}`).join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-950/70 text-red-300 border-red-800/60';
      case 'HIGH':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'MEDIUM':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60';
      case 'LOW':
      default:
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / User Welcome */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              OPERATIONAL INVESTIGATION DASHBOARD
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user ? user.name : 'Guest Investigator'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Monitor grounded forensic results, launch new multimodal audits, and organize incident reports with zero synthetic reputation data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <button
              onClick={onOpenSettings}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-blue-400" />
              <span>Preferences</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Create Account</span>
            </button>
          )}

          <button
            onClick={() => onStartNewInvestigation('message')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-900/40 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 shadow-sm">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Saved Reports
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white">{totalReports}</span>
            <span className="text-[11px] text-slate-500">archived</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-red-950/50 bg-red-950/20 shadow-sm">
          <span className="text-[11px] font-mono text-red-300 uppercase tracking-wider block">
            Critical Risk
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-red-400">{criticalCount}</span>
            <span className="text-[11px] text-red-400/60">cases</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-950/50 bg-amber-950/20 shadow-sm">
          <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider block">
            High Risk
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">{highCount}</span>
            <span className="text-[11px] text-amber-400/60">threats</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-yellow-950/50 bg-yellow-950/20 shadow-sm">
          <span className="text-[11px] font-mono text-yellow-300 uppercase tracking-wider block">
            Medium Caution
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-yellow-400">{mediumCount}</span>
            <span className="text-[11px] text-yellow-400/60">unverified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-950/50 bg-emerald-950/20 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider block">
            Average Risk
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{avgScore}</span>
            <span className="text-[11px] text-emerald-400/60">/ 100</span>
          </div>
        </div>
      </div>

      {/* QUICK LAUNCH OPTIONS FOR NEW INVESTIGATION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            <span>START NEW INVESTIGATION BY ARTIFACT TYPE</span>
          </h2>
          <span className="text-xs text-slate-500 hidden sm:block">Select modality to begin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Message */}
          <div
            onClick={() => onStartNewInvestigation('message')}
            className="p-4 rounded-xl border border-slate-800 hover:border-blue-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
              Suspicious Message
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              SMS phishing, urgent bank alerts, IT support emails, and social coercion.
            </p>
          </div>

          {/* 2. URL */}
          <div
            onClick={() => onStartNewInvestigation('url')}
            className="p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
              URL Structural Audit
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Bare IP hosts, punycode spoofing, excessive subdomains, and credential paths.
            </p>
          </div>

          {/* 3. Screenshot */}
          <div
            onClick={() => onStartNewInvestigation('screenshot')}
            className="p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
              UI Screenshot Vision
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Brand impersonation, fake system dialogs, invoice scams, and login forms.
            </p>
          </div>

          {/* 4. QR Code */}
          <div
            onClick={() => onStartNewInvestigation('qr')}
            className="p-4 rounded-xl border border-slate-800 hover:border-purple-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
              QR Code Matrix
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Client-side canvas QR matrix decode with automatic destination inspection.
            </p>
          </div>

          {/* 5. Combined Multi-Input */}
          <div
            onClick={() => onStartNewInvestigation('combined')}
            className="p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
              Combined Bundle
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Correlate text, destination URLs, and visual screenshots in one investigation.
            </p>
          </div>
        </div>
      </div>

      {/* SAVED INVESTIGATION REPORTS LEDGER */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              SAVED INVESTIGATION REPORTS ({filteredReports.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Retrieved from your authenticated forensic database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports or domains..."
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 w-44 sm:w-56 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Risk Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px]">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterRisk(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterRisk === lvl
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports Grid / Table */}
        {filteredReports.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              {savedReports.length === 0
                ? 'No saved investigations yet'
                : 'No reports match your current filter'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {savedReports.length === 0
                ? 'Completed investigations can be saved and organized here for incident tracking and auditing.'
                : 'Try adjusting your search query or risk level filters.'}
            </p>
            {savedReports.length === 0 && (
              <button
                onClick={() => onStartNewInvestigation('message')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors inline-flex items-center gap-1.5 shadow-md shadow-blue-950 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Run First Investigation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => {
              const result = report.result;
              const badgeClass = getRiskBadge(result.riskLevel);

              return (
                <div
                  key={report.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg group relative"
                >
                  <div>
                    {/* Top Row: Risk Level & Score */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-mono uppercase font-extrabold px-2.5 py-0.5 rounded border ${badgeClass}`}
                      >
                        {result.riskLevel} ({result.riskScore}/100)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Report Title */}
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors line-clamp-2 mb-1.5">
                      {report.title}
                    </h3>

                    {/* Summary / Notes Snippet */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                      {report.notes ? `Note: ${report.notes}` : result.summary}
                    </p>

                    {/* Tags */}
                    {report.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {report.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onViewReportDetails(result, report.title)}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <span>View Forensic Report</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyMarkdown(report)}
                        className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy report markdown"
                      >
                        {copiedId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => deleteSavedReport(report.id)}
                        className="p-1.5 rounded-lg border border-slate-800 hover:border-red-900/60 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
