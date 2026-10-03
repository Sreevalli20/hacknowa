import React, { useState } from 'react';
import { EvidenceItem, FindingType } from '../types/investigation';
import { ShieldCheck, HelpCircle, AlertCircle, Filter, Search } from 'lucide-react';

interface EvidenceLedgerTableProps {
  evidenceLedger: EvidenceItem[];
}

export const EvidenceLedgerTable: React.FC<EvidenceLedgerTableProps> = ({
  evidenceLedger,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = evidenceLedger.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.finding.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.evidence.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const countObserved = evidenceLedger.filter((e) => e.type === 'OBSERVED').length;
  const countInferred = evidenceLedger.filter((e) => e.type === 'INFERRED').length;
  const countUnknown = evidenceLedger.filter((e) => e.type === 'UNKNOWN').length;

  return (
    <div className="space-y-3">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          EVIDENCE LEDGER ({evidenceLedger.length} FINDINGS)
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings..."
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 w-36 sm:w-44 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({evidenceLedger.length})
            </button>
            <button
              onClick={() => setFilterType('OBSERVED')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterType === 'OBSERVED'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Observed ({countObserved})
            </button>
            <button
              onClick={() => setFilterType('INFERRED')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterType === 'INFERRED'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inferred ({countInferred})
            </button>
            {countUnknown > 0 && (
              <button
                onClick={() => setFilterType('UNKNOWN')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  filterType === 'UNKNOWN'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unknown ({countUnknown})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-4 font-semibold">Finding</th>
                <th className="py-2.5 px-4 font-semibold">Grounded Evidence</th>
                <th className="py-2.5 px-3 font-semibold text-center w-28">Type</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                    No findings match the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isObserved = item.type === 'OBSERVED';
                  const isInferred = item.type === 'INFERRED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Finding */}
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {item.finding}
                      </td>

                      {/* Quoted Evidence */}
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-md">
                        <span className="bg-slate-900/90 border border-slate-800/80 px-2 py-1 rounded inline-block text-slate-300 break-words">
                          "{item.evidence}"
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            isObserved
                              ? 'border-blue-500/40 text-blue-300 bg-blue-950/50'
                              : isInferred
                              ? 'border-amber-500/40 text-amber-300 bg-amber-950/50'
                              : 'border-slate-700 text-slate-400 bg-slate-900'
                          }`}
                        >
                          {isObserved ? (
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                          ) : (
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                          )}
                          {item.type}
                        </span>
                      </td>

                      {/* Confidence Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                            item.confidence === 'HIGH'
                              ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-800/40'
                              : item.confidence === 'MEDIUM'
                              ? 'text-blue-300 bg-blue-950/50 border border-blue-800/40'
                              : 'text-slate-400 bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {item.confidence}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
