import React, { useState } from 'react';
import {
  EmergencyChecklist,
  EmergencyPlanResponse,
  RiskLevel,
} from '../types/investigation';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  Clock,
  CheckSquare,
  FileText,
  PhoneCall,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

interface EmergencyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  threatSummary: string;
  riskLevel: RiskLevel;
}

export const EmergencyPlanModal: React.FC<EmergencyPlanModalProps> = ({
  isOpen,
  onClose,
  threatSummary,
  riskLevel,
}) => {
  const [checklist, setChecklist] = useState<EmergencyChecklist>({
    enteredCredentials: true,
    enteredPayment: false,
    downloadedAnything: false,
    grantedPermissions: false,
    sharedOtp: false,
  });

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<EmergencyPlanResponse | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergency-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checklist,
          threatSummary,
          riskLevel,
        }),
      });
      const data = await res.json();
      setPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPlan = () => {
    if (!plan) return;
    const text = `TRACEZERO EMERGENCY CONTAINMENT PROTOCOL
Threat Context: ${threatSummary}
Exposure Tone: ${plan.assessmentTone}
Assessment: ${plan.exposureAssessment}

ACTION STEPS:
${plan.actionItems.map((a) => `[${a.timing}] ${a.title}: ${a.instructions}`).join('\n')}

VERIFICATION CHECKLIST:
${plan.verificationChecklist.map((v) => `- ${v}`).join('\n')}

EVIDENCE PRESERVATION:
${plan.evidencePreservationGuide.map((e) => `- ${e}`).join('\n')}

Official Contact Advice: ${plan.officialContactAdvice}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Emergency Incident Containment
              </h3>
              <p className="text-xs text-slate-400">
                Personalized response plan tailored strictly to your interaction and analyzed evidence.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Triage Questionnaire */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-3">
              POST-INTERACTION TRIAGE QUESTIONNAIRE
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Select all actions that occurred during your interaction:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.enteredCredentials}
                  onChange={(e) =>
                    setChecklist({ ...checklist, enteredCredentials: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Entered credentials?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Username, email, password, or security PIN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.enteredPayment}
                  onChange={(e) =>
                    setChecklist({ ...checklist, enteredPayment: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Entered payment information?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Credit/debit card, CVV, bank account, or crypto seed.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.downloadedAnything}
                  onChange={(e) =>
                    setChecklist({ ...checklist, downloadedAnything: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Downloaded anything?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Installer, zip file, PDF, or software update.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.grantedPermissions}
                  onChange={(e) =>
                    setChecklist({ ...checklist, grantedPermissions: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Granted permissions?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    MDM profile, browser extension, or accessibility rights.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={checklist.sharedOtp}
                  onChange={(e) =>
                    setChecklist({ ...checklist, sharedOtp: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Shared an OTP / 2FA code?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    SMS verification number or authenticator app token.
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-amber-950/50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Response Protocol...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{plan ? 'Regenerate Protocol' : 'Generate Containment Plan'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Plan Output */}
          {plan && (
            <div className="space-y-6">
              {/* Exposure Assessment Callout */}
              <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    EXPOSURE STATUS: {plan.assessmentTone}
                  </span>
                  <button
                    onClick={handleCopyPlan}
                    className="text-xs text-amber-300 hover:text-white flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Plan'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {plan.exposureAssessment}
                </p>
              </div>

              {/* Action Steps Sequence */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-3">
                  STAGED CONTAINMENT ACTIONS
                </h4>
                <div className="space-y-3">
                  {plan.actionItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-amber-400 shrink-0 mt-0.5">
                        {item.stepNumber || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-100">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-semibold">
                            {item.timing}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.instructions}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Checklist */}
              {plan.verificationChecklist.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Account Safety Verification Checklist
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.verificationChecklist.map((chk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-mono">•</span>
                        <span>{chk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Preservation Guide */}
              {plan.evidencePreservationGuide.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Evidence Preservation for Security / Fraud Teams
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.evidencePreservationGuide.map((guide, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 font-mono">•</span>
                        <span>{guide}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Official Contact Advice */}
              <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-slate-300 flex items-start gap-2.5">
                <PhoneCall className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-300 block mb-0.5">
                    Official Contact Advice:
                  </span>
                  <p>{plan.officialContactAdvice}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Emergency guidance is advisory. When in doubt, call the official phone number on your bank card.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
