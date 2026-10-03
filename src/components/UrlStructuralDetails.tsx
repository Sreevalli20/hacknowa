import React, { useState } from 'react';
import { URLStructuralAnalysis } from '../types/investigation';
import {
  Link2,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
  Copy,
  Check,
} from 'lucide-react';

interface UrlStructuralDetailsProps {
  urlAnalysis: URLStructuralAnalysis;
}

export const UrlStructuralDetails: React.FC<UrlStructuralDetailsProps> = ({
  urlAnalysis,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(urlAnalysis.originalInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
      {/* Accordion Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors border-b border-slate-800 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                LOCAL URL STRUCTURAL FORENSICS
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                Deterministic
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md sm:max-w-xl font-mono">
              {urlAnalysis.originalInput}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Copy URL string"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 text-xs">
          {/* Key Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950">
              <span className="text-slate-400 text-[11px] block">Protocol</span>
              <span
                className={`font-mono font-bold text-sm ${
                  urlAnalysis.protocol === 'http:' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {urlAnalysis.protocol || 'None'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {urlAnalysis.protocol === 'http:' ? 'Unencrypted cleartext' : 'TLS Encrypted'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950">
              <span className="text-slate-400 text-[11px] block">Host Type</span>
              <span
                className={`font-mono font-bold text-sm ${
                  urlAnalysis.isIpAddress ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {urlAnalysis.isIpAddress ? 'Bare IP' : 'Domain Name'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                {urlAnalysis.hostname}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950">
              <span className="text-slate-400 text-[11px] block">Subdomain Depth</span>
              <span
                className={`font-mono font-bold text-sm ${
                  urlAnalysis.subdomainDepth >= 3 ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {urlAnalysis.subdomainDepth} level{urlAnalysis.subdomainDepth !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                {urlAnalysis.subdomains.length > 0 ? urlAnalysis.subdomains.join('.') : 'No subdomains'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950">
              <span className="text-slate-400 text-[11px] block">IDN / Punycode</span>
              <span
                className={`font-mono font-bold text-sm ${
                  urlAnalysis.hasPunycode ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {urlAnalysis.hasPunycode ? 'YES (Homograph)' : 'Standard ASCII'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {urlAnalysis.hasPunycode ? 'Potential spoofed glyph' : 'No punycode found'}
              </span>
            </div>
          </div>

          {/* Path and Query Params */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-400 text-[11px]">Normalized Path:</span>
              <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 break-all">
                {urlAnalysis.pathname || '/'}
              </span>
            </div>

            {urlAnalysis.searchParams.length > 0 && (
              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5">
                  Extracted Query Parameters ({urlAnalysis.searchParams.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {urlAnalysis.searchParams.map((param, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-900 border border-slate-800 truncate">
                      <span className="text-blue-400">{param.key}</span> ={' '}
                      <span className="text-slate-300">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detected Keywords and Sensitive Indicators */}
          {(urlAnalysis.detectedSuspiciousKeywords.length > 0 ||
            urlAnalysis.credentialPathIndicators.length > 0 ||
            urlAnalysis.downloadIndicators.length > 0) && (
            <div className="space-y-2">
              <span className="text-slate-400 text-[11px] block font-mono uppercase tracking-wider">
                Targeting & Action Signatures
              </span>
              <div className="flex flex-wrap gap-2">
                {urlAnalysis.credentialPathIndicators.map((cp, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono text-[11px]"
                  >
                    Credential Path: {cp}
                  </span>
                ))}
                {urlAnalysis.downloadIndicators.map((dl, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800/60 text-red-300 font-mono text-[11px]"
                  >
                    Executable Download: {dl}
                  </span>
                ))}
                {urlAnalysis.detectedSuspiciousKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]"
                  >
                    Keyword: {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Structural Flags */}
          {urlAnalysis.structuralFlags.length > 0 && (
            <div className="space-y-2">
              <span className="text-slate-400 text-[11px] block font-mono uppercase tracking-wider">
                Structural Anomaly Flags
              </span>
              <div className="space-y-1.5">
                {urlAnalysis.structuralFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 text-slate-200 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">{flag.name}</span>
                      <p className="text-slate-300 text-[11px] mt-0.5">{flag.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strict Verification Boundary Disclaimer */}
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-300 font-semibold block">
                Verification Boundary:
              </span>
              External WHOIS ownership, registrar records, server-side payload execution, and third-party reputation feeds were NOT queried to prevent unverified reputation claims.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
