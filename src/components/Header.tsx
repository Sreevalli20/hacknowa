import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  PlusCircle,
  Bookmark,
  User,
  LogOut,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'dashboard' | 'investigate' | 'result';
  onNavigate: (view: 'dashboard' | 'investigate') => void;
  onResetInvestigation?: () => void;
  onOpenEmergency?: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  hasActiveInvestigation?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onResetInvestigation,
  onOpenEmergency,
  onOpenAuth,
  onOpenSettings,
  hasActiveInvestigation,
}) => {
  const { user, savedReports } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-500/30 group-hover:border-blue-400 transition-colors">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider text-white">
                TRACE<span className="text-blue-400">ZERO</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-300 bg-blue-950/50 hidden sm:inline-block">
                Grounded Security
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Understand what you're about to trust.
            </p>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800/80 rounded-xl p-1 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
            {savedReports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300 font-mono">
                {savedReports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('investigate')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'investigate' || currentView === 'result'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Investigate</span>
          </button>
        </nav>

        {/* Right Status / User Controls */}
        <div className="flex items-center gap-2.5">
          {/* Emergency button if currently viewing a result */}
          {hasActiveInvestigation && onOpenEmergency && (
            <button
              onClick={onOpenEmergency}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-500/40 text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">I interacted with it</span>
            </button>
          )}

          {/* User Profile or Sign In */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition-colors"
                title="User Preferences & Settings"
              >
                <div className="w-6 h-6 rounded-full bg-blue-900/80 border border-blue-500/40 flex items-center justify-center text-[11px] font-bold text-blue-300">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-medium hidden sm:inline-block max-w-[120px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <Settings className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-900/30"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
