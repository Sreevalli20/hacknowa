import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, X, User, Sliders, ShieldCheck, Check, Loader2, LogOut } from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateSettings, logout } = useAuth();

  const [autoSaveReports, setAutoSaveReports] = useState(user?.settings?.autoSaveReports ?? true);
  const [defaultInputTab, setDefaultInputTab] = useState<
    'message' | 'url' | 'screenshot' | 'qr' | 'combined'
  >(user?.settings?.defaultInputTab || 'message');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateSettings({
        autoSaveReports,
        defaultInputTab,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Investigator Preferences</h3>
              <p className="text-xs text-slate-400">User profile and analysis defaults.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg border border-red-800/80 bg-red-950/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Profile Card */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900/60 border border-blue-600/40 flex items-center justify-center text-blue-300 font-bold text-sm">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-200 block truncate">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-400 block truncate font-mono">
                {user.email}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold block mt-0.5">
                Role: {user.role}
              </span>
            </div>
          </div>

          {/* Settings toggles */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={autoSaveReports}
                onChange={(e) => setAutoSaveReports(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Automatic Report Archival
                </span>
                <span className="text-[11px] text-slate-400">
                  Automatically save completed investigations to your personal report ledger.
                </span>
              </div>
            </label>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Default Investigation Starting Tab
              </label>
              <select
                value={defaultInputTab}
                onChange={(e: any) => setDefaultInputTab(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="message">Message / SMS / Email</option>
                <option value="url">URL Inspector</option>
                <option value="screenshot">Screenshot Vision</option>
                <option value="qr">QR Matrix Decoder</option>
                <option value="combined">Combined Multi-Input</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
