import {
  RiskLevel,
  EvidenceItem,
  DeterministicSignal,
  DeterministicScoreBreakdown,
  URLStructuralAnalysis,
} from '../types/investigation';

interface SignalDefinition {
  id: string;
  name: string;
  baseWeight: number;
  category: 'credential' | 'urgency' | 'otp' | 'payment' | 'url_anomaly' | 'malware' | 'impersonation' | 'permission';
  testEvidence: (items: EvidenceItem[], urlAnalysis?: URLStructuralAnalysis) => { matched: boolean; snippet: string } | null;
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: 'credential_solicitation',
    name: 'Credential / Password Solicitation',
    baseWeight: 28,
    category: 'credential',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'credential' ||
        /password|passcode|secret key|seed phrase|login credential|pin code/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'otp_interception',
    name: 'MFA / OTP Code Solicitation',
    baseWeight: 32,
    category: 'otp',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'otp' ||
        /one-time password|otp|verification code|2fa code|authenticator code|sms code/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'urgency_coercion',
    name: 'Artificial Urgency / Coercive Deadline',
    baseWeight: 18,
    category: 'urgency',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'urgency' ||
        /urgent|immediately|within \d+|suspended|locked within|expire|cancel your account|unusual activity/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'payment_solicitation',
    name: 'Direct Financial Transfer / Credit Card Request',
    baseWeight: 26,
    category: 'payment',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'payment' ||
        /credit card|cvv|bank transfer|wire|crypto address|gift card|invoice payment|unpaid toll/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'executable_download',
    name: 'Executable / Archive File Delivery Path',
    baseWeight: 30,
    category: 'malware',
    testEvidence: (items, url) => {
      if (url && url.downloadIndicators && url.downloadIndicators.length > 0) {
        return { matched: true, snippet: `URL path targets: ${url.downloadIndicators.join(', ')}` };
      }
      const hit = items.find((i) =>
        i.signalCategory === 'malware' ||
        /\.exe|\.scr|\.apk|\.dmg|\.bat|\.vbs|download this file|run update/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'bare_ip_or_punycode',
    name: 'Deceptive Hostname (Bare IP, Punycode, or Subdomain Masquerade)',
    baseWeight: 28,
    category: 'url_anomaly',
    testEvidence: (_items, url) => {
      if (!url) return null;
      if (url.isIpAddress) {
        return { matched: true, snippet: `Numerical IP address used as hostname: ${url.hostname}` };
      }
      if (url.hasPunycode) {
        return { matched: true, snippet: `Punycode / IDN encoding detected: ${url.hostname}` };
      }
      const brandFlag = url.structuralFlags.find((f) => f.name.includes('Brand Impersonation in Subdomain'));
      if (brandFlag) {
        return { matched: true, snippet: brandFlag.details };
      }
      return null;
    },
  },
  {
    id: 'userinfo_obfuscation',
    name: 'URL Userinfo (@) Visual Redirection Trick',
    baseWeight: 35,
    category: 'url_anomaly',
    testEvidence: (_items, url) => {
      if (url && url.userInfoPresent) {
        return { matched: true, snippet: 'URL embeds @ character before hostname to obscure destination server.' };
      }
      return null;
    },
  },
  {
    id: 'unencrypted_auth',
    name: 'Cleartext HTTP Used for Sensitive Actions',
    baseWeight: 20,
    category: 'url_anomaly',
    testEvidence: (_items, url) => {
      if (url && url.protocol === 'http:' && (url.credentialPathIndicators.length > 0 || url.detectedSuspiciousKeywords.length > 0)) {
        return { matched: true, snippet: `Insecure HTTP connection paired with sensitive path: ${url.pathname}` };
      }
      return null;
    },
  },
  {
    id: 'excessive_subdomains',
    name: 'Suspicious Subdomain Nesting (>2 levels)',
    baseWeight: 14,
    category: 'url_anomaly',
    testEvidence: (_items, url) => {
      if (url && url.subdomainDepth >= 3) {
        return { matched: true, snippet: `${url.subdomainDepth} subdomain levels: ${url.subdomains.join('.')}` };
      }
      return null;
    },
  },
  {
    id: 'brand_impersonation',
    name: 'Visual or Textual Brand Impersonation',
    baseWeight: 22,
    category: 'impersonation',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'impersonation' ||
        /impersonat|spoofed brand|fake logo|lookalike|claims to be from/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
  {
    id: 'permission_request',
    name: 'Privileged Permission or Profile Installation Request',
    baseWeight: 22,
    category: 'permission',
    testEvidence: (items) => {
      const hit = items.find((i) =>
        i.signalCategory === 'permission' ||
        /mdm profile|accessibility permission|install configuration|grant permission/i.test(i.finding + ' ' + i.evidence)
      );
      return hit ? { matched: true, snippet: hit.evidence || hit.finding } : null;
    },
  },
];

/**
 * Computes a completely deterministic, evidence-grounded risk score (0-100)
 * strictly from verified evidence items and structural URL analysis.
 */
export function calculateDeterministicRisk(
  evidenceItems: EvidenceItem[],
  urlAnalysis?: URLStructuralAnalysis
): DeterministicScoreBreakdown {
  const triggered: DeterministicSignal[] = [];
  let cumulativeWeight = 0;

  for (const def of SIGNAL_DEFINITIONS) {
    const result = def.testEvidence(evidenceItems, urlAnalysis);
    if (result && result.matched) {
      triggered.push({
        name: def.name,
        weight: def.baseWeight,
        category: def.category,
        matchedEvidence: result.snippet,
      });
      cumulativeWeight += def.baseWeight;
    }
  }

  // Account for multiple generic observed evidence if no high-risk signals were hit
  const observedCount = evidenceItems.filter((e) => e.type === 'OBSERVED').length;
  if (triggered.length === 0 && observedCount > 0) {
    // Check if neutral or low-concern
    cumulativeWeight += Math.min(observedCount * 4, 15);
  }

  // Cap and normalize strictly to 0-100
  // If multiple compounding high-risk signals are present (e.g. Credential + Urgency + Bare IP),
  // they compound smoothly toward 90-100 without arbitrary random numbers.
  let normalizedScore = Math.min(100, Math.round(cumulativeWeight));

  // Determine risk level tier based on clear standard thresholds
  let riskLevel: RiskLevel = 'LOW';
  if (normalizedScore >= 80) {
    riskLevel = 'CRITICAL';
  } else if (normalizedScore >= 55) {
    riskLevel = 'HIGH';
  } else if (normalizedScore >= 25) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  let rationale = '';
  if (triggered.length === 0) {
    rationale = 'No high-risk threat indicators, credential solicitation, or deceptive structural markers were found in the supplied input.';
  } else {
    rationale = `Score calculated from ${triggered.length} triggered indicators (${triggered.map((t) => `${t.name} [+${t.weight}]`).join(', ')}).`;
  }

  return {
    rawScore: cumulativeWeight,
    normalizedScore,
    riskLevel,
    signalsTriggered: triggered,
    scoringRationale: rationale,
  };
}
