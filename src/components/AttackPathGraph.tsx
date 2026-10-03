import React from 'react';
import { ArrowDown, AlertOctagon, HelpCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { AttackPathStep } from '../types/investigation';

interface AttackPathGraphProps {
  steps: AttackPathStep[];
}

export const AttackPathGraph: React.FC<AttackPathGraphProps> = ({ steps }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-400">
        No attack progression path derived from supplied input.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          EVIDENCE-GROUNDED ATTACK PROGRESSION GRAPH
        </h4>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Observed Ingress
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Possible Downstream Vector
          </span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
        {steps.map((step, idx) => {
          const isPossible = step.isPossibleOnly || step.status === 'possible';

          return (
            <div key={idx} className="relative group">
              {/* Node Marker Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                  isPossible
                    ? 'border-amber-500 bg-slate-950 text-amber-400 shadow-sm shadow-amber-950'
                    : 'border-blue-500 bg-slate-950 text-blue-400 shadow-sm shadow-blue-950'
                }`}
              >
                {step.stepNumber || idx + 1}
              </div>

              {/* Node Card */}
              <div
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isPossible
                    ? 'border-amber-900/40 bg-gradient-to-r from-amber-950/20 to-slate-900/60 hover:border-amber-800/60'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wide text-slate-100 uppercase">
                      {step.label}
                    </span>
                  </div>

                  {isPossible ? (
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 bg-amber-950/50 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-amber-400" />
                      POSSIBLE (INFERRED)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded border border-blue-500/30 text-blue-300 bg-blue-950/40 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-blue-400" />
                      OBSERVED INPUT
                    </span>
                  )}
                </div>

                {step.description && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
