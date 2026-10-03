import { Signal } from '../types/investigation';

export interface BenignContextAnalysis {
  isBenign: boolean;
  benignSignals: string[];
  benignIndicators: string[];
  scoreAdjustment: number;
  rationale: string;
}

/**
 * Analyze context for benign indicators that reduce false positives
 */
export function analyzeBenignContext(signals: Signal[], text: string, urlHostname?: string): BenignContextAnalysis {
  const benignSignals: string[] = [];
  const benignIndicators: string[] = [];
  let scoreAdjustment = 0;
  const lowerText = text.toLowerCase();

  // Check for benign context indicators in text
  const benignPhrases = [
    'meeting at',
    'see you there',
    'lunch tomorrow',
    'coffee break',
    'team meeting',
    'project update',
    'status report',
    'follow up on',
    'check in on',
    'how are you',
    'thanks for',
    'appreciate your',
    'looking forward to',
    'happy to help',
    'please review',
    'when you have time',
    'no rush',
    'at your convenience',
    'normal business hours',
    'our normal',
    'regular login',
    'standard procedure',
    'usual process',
    // Internship/recruitment contexts
    'internship',
    'intern',
    'job opening',
    'job opportunity',
    'career opportunity',
    'recruitment',
    'hiring',
    'position available',
    'data analyst',
    'analytics intern',
    'apply now',
    'application',
    'resume',
    'cv',
    'interview',
    'joining',
    'onboarding',
  ];

  for (const phrase of benignPhrases) {
    if (lowerText.includes(phrase)) {
      benignIndicators.push(`Benign language: "${phrase}"`);
      scoreAdjustment -= 3;
    }
  }

  // Check for legitimate-sounding company portal references
  if (/(our company portal|internal portal|employee portal|staff portal|work portal)/i.test(text)) {
    benignIndicators.push('References internal/company portal');
    scoreAdjustment -= 5;
  }

  // Check for lack of urgency indicators when other signals are present
  const hasUrgency = signals.some(s => s.category === 'urgency_coercion');
  const hasCredential = signals.some(s => s.category === 'credential_targeting');
  
  if (hasCredential && !hasUrgency) {
    benignIndicators.push('Credential request without urgency coercion');
    scoreAdjustment -= 5;
  }

  // Check for benign URL patterns
  if (urlHostname) {
    const lowerHostname = urlHostname.toLowerCase();
    
    // Known legitimate TLDs with simple structure
    const knownLegitPatterns = [
      /\.com$/i,
      /\.org$/i,
      /\.edu$/i,
      /\.gov$/i,
    ];
    
    const hasSimpleStructure = knownLegitPatterns.some(pattern => pattern.test(lowerHostname));
    const hasNoSuspiciousKeywords = !signals.some(s => 
      s.name === 'punycode_encoding' || 
      s.name === 'ip_hostname' ||
      s.name === 'userinfo_at_prefix' ||
      s.name === 'brand_impersonation_subdomain'
    );
    
    if (hasSimpleStructure && hasNoSuspiciousKeywords && signals.length <= 2) {
      benignIndicators.push('URL has simple structure with no deceptive markers');
      scoreAdjustment -= 5;
    }
  }

  // Check for single low-severity signal only
  if (signals.length === 1 && signals[0].severity === 'LOW') {
    benignIndicators.push('Single low-severity indicator without corroborating signals');
    scoreAdjustment -= 8;
  }

  // Check for generic "login" without other red flags
  const hasLogin = signals.some(s => s.name === 'login_request' || s.name === 'credential_path');
  const hasOtherRedFlags = signals.some(s => 
    s.severity === 'CRITICAL' || 
    s.category === 'urgency_coercion' ||
    s.category === 'payment_targeting' ||
    s.category === 'authentication_targeting'
  );
  
  // Only apply benign adjustment for login if it's a simple domain (not suspicious-looking)
  const suspiciousKeywordSignal = signals.find(s => s.name === 'suspicious_keywords_in_url');
  const hasSuspiciousKeywords = suspiciousKeywordSignal && (
    suspiciousKeywordSignal.evidence.includes('verification') || 
    suspiciousKeywordSignal.evidence.includes('secure') ||
    suspiciousKeywordSignal.evidence.includes('account')
  );
  
  // Count how many suspicious keywords are present
  const keywordCount = suspiciousKeywordSignal ? 
    (suspiciousKeywordSignal.evidence.match(/login|verification|account|secure|password|credential/gi) || []).length : 0;
  
  if (hasLogin && !hasOtherRedFlags && signals.length <= 2 && !hasSuspiciousKeywords) {
    benignIndicators.push('Login request without other threat indicators');
    scoreAdjustment -= 5;
  } else if (hasSuspiciousKeywords && keywordCount >= 3) {
    // Too many suspicious keywords - remove benign adjustment
    const filteredIndicators = benignIndicators.filter(ind => !ind.includes('Benign'));
    benignIndicators.length = 0;
    benignIndicators.push(...filteredIndicators);
    scoreAdjustment = Math.max(0, scoreAdjustment + 10);
  }

  // Check for verification without urgency or credential request
  const hasVerification = signals.some(s => s.name === 'identity_verification_request');
  if (hasVerification && !hasUrgency && !hasCredential) {
    benignIndicators.push('Verification request without urgency or credential solicitation');
    scoreAdjustment -= 5;
  }

  // Check for generic payment mention without transfer request
  const hasPayment = signals.some(s => s.category === 'payment_targeting');
  const hasTransferRequest = signals.some(s => s.name === 'money_transfer_request' || s.name === 'credit_card_request');
  
  if (hasPayment && !hasTransferRequest && !hasUrgency) {
    benignIndicators.push('Payment mention without direct transfer request or urgency');
    scoreAdjustment -= 5;
  }

  // Determine if overall context is benign
  const isBenign = scoreAdjustment <= -10 || (benignIndicators.length >= 2 && signals.length <= 2);

  // Build rationale
  let rationale = '';
  if (isBenign) {
    rationale = 'Context contains multiple benign indicators suggesting this may be routine communication rather than adversarial.';
  } else if (benignIndicators.length > 0) {
    rationale = 'Some benign context detected, but risk indicators outweigh benign factors.';
  } else {
    rationale = 'No significant benign context indicators detected.';
  }

  return {
    isBenign,
    benignSignals,
    benignIndicators,
    scoreAdjustment: Math.max(-20, scoreAdjustment), // Cap adjustment at -20
    rationale,
  };
}
