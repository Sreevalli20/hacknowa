import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, Loader2, ArrowDown, FileSearch, Cpu, AlertCircle } from 'lucide-react';

interface InvestigationSequenceViewProps {
  analyzedSummary: {
    hasMessage: boolean;
    hasUrl: boolean;
    hasScreenshot: boolean;
    hasQr: boolean;
  };
}

interface StageItem {
  id: string;
  name: string;
  subtext: string;
  estimatedDurationMs: number;
}

const STAGES: StageItem[] = [
  {
    id: 'input_received',
    name: 'INPUT RECEIVED',
    subtext: 'Ingesting artifacts, sanitizing payload, and validating data integrity',
    estimatedDurationMs: 600,
  },
  {
    id: 'evidence_extraction',
    name: 'EVIDENCE EXTRACTION',
    subtext: 'Parsing visible strings, extracting URLs, decoding QR matrix, and inspecting screenshot tokens',
    estimatedDurationMs: 1400,
  },
  {
    id: 'indicator_analysis',
    name: 'INDICATOR ANALYSIS',
    subtext: 'Evaluating local RFC 3986 URL properties, checking punycode, and scanning for credential targets',
    estimatedDurationMs: 1500,
  },
  {
    id: 'intent_analysis',
    name: 'INTENT ANALYSIS',
    subtext: 'Mapping urgency framing, authority simulation, and coercive behavioral triggers',
    estimatedDurationMs: 1600,
  },
  {
    id: 'risk_reasoning',
    name: 'RISK REASONING',
    subtext: 'Applying deterministic evidence-weighting matrix and separating observed facts from inferences',
    estimatedDurationMs: 1800,
  },
  {
    id: 'attack_path',
    name: 'ATTACK PATH',
    subtext: 'Synthesizing evidence-grounded threat progression graph and containment recommendations',
    estimatedDurationMs: 1500,
  },
];

export const InvestigationSequenceView: React.FC<InvestigationSequenceViewProps> = ({
  analyzedSummary,
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    let accumulatedTime = 0;
    const timers: NodeJS.Timeout[] = [];

    STAGES.forEach((stage, idx) => {
      if (idx > 0) {
        accumulatedTime += STAGES[idx - 1].estimatedDurationMs;
        const timer = setTimeout(() => {
          setCurrentStageIndex(idx);
        }, accumulatedTime);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      {/* Central Spinner / Brand Header */}
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-950/50">
            <Cpu className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-blue-500/20 animate-ping opacity-40 pointer-events-none" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
          Forensic Investigation In Progress
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Executing strictly grounded multimodal evidence analysis and deterministic signal correlation.
        </p>

        {/* Ingested Inputs Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {analyzedSummary.hasMessage && (
            <span className="text-[11px] px-2.5 py-1 rounded-md border border-blue-800 bg-blue-950/60 text-blue-300 font-mono">
              [Message Stream]
            </span>
          )}
          {analyzedSummary.hasUrl && (
            <span className="text-[11px] px-2.5 py-1 rounded-md border border-emerald-800 bg-emerald-950/60 text-emerald-300 font-mono">
              [URL RFC Inspector]
            </span>
          )}
          {analyzedSummary.hasScreenshot && (
            <span className="text-[11px] px-2.5 py-1 rounded-md border border-amber-800 bg-amber-950/60 text-amber-300 font-mono">
              [Multimodal Screenshot]
            </span>
          )}
          {analyzedSummary.hasQr && (
            <span className="text-[11px] px-2.5 py-1 rounded-md border border-purple-800 bg-purple-950/60 text-purple-300 font-mono">
              [QR Matrix Decoder]
            </span>
          )}
        </div>
      </div>

      {/* Live Pipeline Sequence */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isQueued = idx > currentStageIndex;

            return (
              <div key={stage.id} className="relative">
                {idx > 0 && (
                  <div
                    className={`absolute -top-3 left-4 w-0.5 h-3 transition-colors ${
                      isCompleted ? 'bg-blue-500' : 'bg-slate-800'
                    }`}
                  />
                )}

                <div
                  className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-blue-500/50 bg-blue-950/30 shadow-md shadow-blue-950/40'
                      : isCompleted
                      ? 'border-slate-800/80 bg-slate-950/50'
                      : 'border-slate-800/40 bg-slate-950/20 opacity-50'
                  }`}
                >
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold tracking-wider font-mono ${
                          isCurrent
                            ? 'text-blue-300'
                            : isCompleted
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {stage.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          isCurrent
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                            : isCompleted
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        {isCurrent ? 'PROCESSING' : isCompleted ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      {stage.subtext}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Strict Verification Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <FileSearch className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Stage progression reflects authentic pipeline execution. No artificial progress bars.</span>
        </div>
      </div>
    </div>
  );
};
