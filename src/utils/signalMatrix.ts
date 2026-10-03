import { Signal, SignalCategory, FindingType, ConfidenceLevel } from '../types/investigation';

export interface SignalMatrix {
  signals: Signal[];
  summary: {
    totalSignals: number;
    byCategory: Record<SignalCategory, number>;
    bySeverity: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>;
  };
}

/**
 * Extract signals from text with structured metadata
 */
export function extractSignalsFromText(text: string, source: 'message_text' | 'ocr_text' | 'qr_content'): Signal[] {
  const signals: Signal[] = [];
  let signalId = 1;
  const lowerText = text.toLowerCase();

  // Social Engineering Signals
  if (/urgent|immediate|act now|right now|don't delay|limited time|expires|deadline/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'urgency_indication',
      true,
      extractMatch(text, /urgent|immediate|act now|right now|don't delay|limited time|expires|deadline/i),
      source,
      'HIGH',
      'urgency_coercion'
    ));
  }

  if (/account will be (suspended|locked|closed|deactivated)|unusual (sign-in|activity|login)|security alert/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'account_status_threat',
      true,
      extractMatch(text, /account will be (suspended|locked|closed|deactivated)|unusual (sign-in|activity|login)|security alert/i),
      source,
      'HIGH',
      'urgency_coercion'
    ));
  }

  if (/final notice|last warning|final reminder|this is your final opportunity/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'final_warning_language',
      true,
      extractMatch(text, /final notice|last warning|final reminder|this is your final opportunity/i),
      source,
      'MEDIUM',
      'urgency_coercion'
    ));
  }

  // Identity/Impersonation Signals
  if (/chase bank|wells fargo|bank of america|citibank|your bank|bank security|fraud department/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'financial_institution_claim',
      true,
      extractMatch(text, /chase bank|wells fargo|bank of america|citibank|your bank|bank security|fraud department/i),
      source,
      'HIGH',
      'identity_impersonation'
    ));
  }

  if (/microsoft support|apple support|google support|amazon security|netflix account|paypal security/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'tech_company_claim',
      true,
      extractMatch(text, /microsoft support|apple support|google support|amazon security|netflix account|paypal security/i),
      source,
      'HIGH',
      'identity_impersonation'
    ));
  }

  // Government authority claim - context-aware detection
  // Only trigger when there's actual impersonation context, not benign mentions
  const govKeywords = ['irs', 'internal revenue service', 'social security administration', 'court summons', 'federal agency', 'government official'];
  const benignContexts = ['internship', 'job', 'recruitment', 'career', 'position', 'role', 'opportunity', 'hiring', 'apply', 'application', 'data analyst', 'analytics intern'];
  const hasGovKeyword = govKeywords.some(kw => new RegExp(kw, 'i').test(text));
  const hasBenignContext = benignContexts.some(ctx => new RegExp(ctx, 'i').test(text));

  // Only flag government authority if there's a claim of authority/threat, not just a benign mention
  if (hasGovKeyword && !hasBenignContext) {
    // Check for authority claim context
    const authorityContexts = [
      /irs.* (is|has|will|must|require|demand|need|urgent|immediate|suspend|lock|freeze|audit|investigate|legal|court|action)/i,
      /internal revenue.* (is|has|will|must|require|demand|need|urgent|immediate|suspend|lock|freeze|audit|investigate|legal|court|action)/i,
      /social security.* (is|has|will|must|require|demand|need|urgent|immediate|suspend|lock|freeze|audit|investigate|legal|court|action)/i,
      /court summons/i,
      /federal agency.* (is|has|will|must|require|demand|need|urgent|immediate|suspend|lock|freeze|audit|investigate|legal|court|action)/i,
      /government official.* (is|has|will|must|require|demand|need|urgent|immediate|suspend|lock|freeze|audit|investigate|legal|court|action)/i,
    ];

    const hasAuthorityContext = authorityContexts.some(ctx => ctx.test(text));

    if (hasAuthorityContext) {
      signals.push(createSignal(
        `sig-${signalId++}`,
        'government_authority_claim',
        true,
        extractMatch(text, /irs|internal revenue service|social security administration|court summons|federal agency|government official/i),
        source,
        'HIGH',
        'identity_impersonation'
      ));
    }
  }

  // Credential Targeting Signals
  if (/enter your password|provide your password|send your password|verify your password|password required/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'password_request',
      true,
      extractMatch(text, /enter your password|provide your password|send your password|verify your password|password required/i),
      source,
      'CRITICAL',
      'credential_targeting'
    ));
  }

  if (/sign in to (verify|confirm)|log in to (verify|confirm)|click here to sign in|please log in|authenticate your account/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'login_request',
      true,
      extractMatch(text, /sign in to (verify|confirm)|log in to (verify|confirm)|click here to sign in|please log in|authenticate your account/i),
      source,
      'HIGH',
      'credential_targeting'
    ));
  }

  if (/verify your identity|confirm your identity|verify your account|confirm your account|identity verification required/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'identity_verification_request',
      true,
      extractMatch(text, /verify your identity|confirm your identity|verify your account|confirm your account|identity verification required/i),
      source,
      'HIGH',
      'credential_targeting'
    ));
  }

  if (/enter your passcode|provide your pin|send your pin code|security code required/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'passcode_pin_request',
      true,
      extractMatch(text, /enter your passcode|provide your pin|send your pin code|security code required/i),
      source,
      'CRITICAL',
      'credential_targeting'
    ));
  }

  // Authentication Targeting Signals
  if (/enter the (one-time|otp|verification) code|provide the (verification|security) code|send me the code|what is your (otp|2fa|mfa) code|authentication code/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'otp_verification_code_request',
      true,
      extractMatch(text, /enter the (one-time|otp|verification) code|provide the (verification|security) code|send me the code|what is your (otp|2fa|mfa) code|authentication code/i),
      source,
      'CRITICAL',
      'authentication_targeting'
    ));
  }

  if (/share the code you received|forward the verification code|tell me the code from sms|what code did you get/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'otp_sharing_request',
      true,
      extractMatch(text, /share the code you received|forward the verification code|tell me the code from sms|what code did you get/i),
      source,
      'CRITICAL',
      'authentication_targeting'
    ));
  }

  // Payment Targeting Signals
  if (/credit card number|card number|cvv|cvc|expiration date|billing information/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'credit_card_request',
      true,
      extractMatch(text, /credit card number|card number|cvv|cvc|expiration date|billing information/i),
      source,
      'CRITICAL',
      'payment_targeting'
    ));
  }

  if (/wire (money|funds)|bank transfer|send payment|make a payment|transfer immediately/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'money_transfer_request',
      true,
      extractMatch(text, /wire (money|funds)|bank transfer|send payment|make a payment|transfer immediately/i),
      source,
      'CRITICAL',
      'payment_targeting'
    ));
  }

  if (/unpaid invoice|overdue payment|payment due|outstanding balance|settle this invoice/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'invoice_payment_claim',
      true,
      extractMatch(text, /unpaid invoice|overdue payment|payment due|outstanding balance|settle this invoice/i),
      source,
      'HIGH',
      'payment_targeting'
    ));
  }

  if (/bitcoin|btc|ethereum|eth|crypto wallet|send (bitcoin|crypto)|wallet address|airdrop/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'cryptocurrency_request',
      true,
      extractMatch(text, /bitcoin|btc|ethereum|eth|crypto wallet|send (bitcoin|crypto)|wallet address|airdrop/i),
      source,
      'CRITICAL',
      'payment_targeting'
    ));
  }

  if (/gift card|itunes card|google play card|steam card|amazon card|buy gift cards|scratch-off code/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'gift_card_request',
      true,
      extractMatch(text, /gift card|itunes card|google play card|steam card|amazon card|buy gift cards|scratch-off code/i),
      source,
      'CRITICAL',
      'payment_targeting'
    ));
  }

  // Action Request Signals
  if (/download this (file|attachment|document)|open the attachment|install this update|run this program|click to download/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'download_request',
      true,
      extractMatch(text, /download this (file|attachment|document)|open the attachment|install this update|run this program|click to download/i),
      source,
      'HIGH',
      'action_request'
    ));
  }

  if (/\.exe|\.scr|\.bat|\.vbs|\.jar|\.apk|\.dmg/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'executable_file_reference',
      true,
      extractMatch(text, /\.exe|\.scr|\.bat|\.vbs|\.jar|\.apk|\.dmg/i),
      source,
      'CRITICAL',
      'action_request'
    ));
  }

  if (/install (configuration|security) profile|mdm profile|device management profile|certificate installation/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'profile_installation_request',
      true,
      extractMatch(text, /install (configuration|security) profile|mdm profile|device management profile|certificate installation/i),
      source,
      'HIGH',
      'action_request'
    ));
  }

  if (/grant (access|permission)|allow remote access|enable accessibility|screen sharing|remote control/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'permission_grant_request',
      true,
      extractMatch(text, /grant (access|permission)|allow remote access|enable accessibility|screen sharing|remote control/i),
      source,
      'HIGH',
      'action_request'
    ));
  }

  // URL Anomaly Signals
  if (/bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|buff\.ly/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'url_shortener_detected',
      true,
      extractMatch(text, /bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|buff\.ly/i),
      source,
      'MEDIUM',
      'url_structure'
    ));
  }

  if (/click here|click this link|follow this link|visit (this|the) link/i.test(text)) {
    signals.push(createSignal(
      `sig-${signalId++}`,
      'generic_click_here_cta',
      true,
      extractMatch(text, /click here|click this link|follow this link|visit (this|the) link/i),
      source,
      'MEDIUM',
      'url_structure'
    ));
  }

  return signals;
}

/**
 * Extract signals from URL structure
 */
export function extractSignalsFromUrl(
  urlAnalysis: any,
  source: 'url_structure'
): Signal[] {
  const signals: Signal[] = [];
  let signalId = 1;

  if (!urlAnalysis || !urlAnalysis.isValidUrl) {
    return signals;
  }

  // Protocol signals
  if (urlAnalysis.protocol === 'http:') {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'unencrypted_http',
      true,
      'Connection uses HTTP instead of HTTPS',
      source,
      'MEDIUM',
      'url_structure'
    ));
  }

  // IP address signals
  if (urlAnalysis.isIpAddress) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'ip_hostname',
      true,
      `Destination uses IP address: ${urlAnalysis.hostname}`,
      source,
      'CRITICAL',
      'url_structure'
    ));
  }

  // Punycode signals
  if (urlAnalysis.hasPunycode) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'punycode_encoding',
      true,
      `Hostname contains punycode: ${urlAnalysis.hostname}`,
      source,
      'HIGH',
      'url_structure'
    ));
  }

  // Userinfo signals
  if (urlAnalysis.userInfoPresent) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'userinfo_at_prefix',
      true,
      'URL contains userinfo @ character before hostname',
      source,
      'CRITICAL',
      'destination_deception'
    ));
  }

  // Subdomain depth signals
  if (urlAnalysis.subdomainDepth >= 3) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'excessive_subdomain_depth',
      urlAnalysis.subdomainDepth,
      `${urlAnalysis.subdomainDepth} subdomain levels: ${urlAnalysis.subdomains.join('.')}`,
      source,
      'HIGH',
      'url_structure'
    ));
  }

  // Credential path signals
  if (urlAnalysis.credentialPathIndicators && urlAnalysis.credentialPathIndicators.length > 0) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'credential_path',
      true,
      `Path contains credential indicators: ${urlAnalysis.credentialPathIndicators.join(', ')}`,
      source,
      'HIGH',
      'credential_targeting'
    ));
  }

  // Download path signals
  if (urlAnalysis.downloadIndicators && urlAnalysis.downloadIndicators.length > 0) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'download_path',
      true,
      `Path targets download: ${urlAnalysis.downloadIndicators.join(', ')}`,
      source,
      'HIGH',
      'action_request'
    ));
  }

  // Suspicious keyword signals
  if (urlAnalysis.detectedSuspiciousKeywords && urlAnalysis.detectedSuspiciousKeywords.length > 0) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'suspicious_keywords_in_url',
      true,
      `URL contains: ${urlAnalysis.detectedSuspiciousKeywords.join(', ')}`,
      source,
      'MEDIUM',
      'url_structure'
    ));
  }

  // Port anomaly signals
  if (urlAnalysis.portAnomaly) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'non_standard_port',
      true,
      `Uses non-standard port: ${urlAnalysis.port}`,
      source,
      'MEDIUM',
      'url_structure'
    ));
  }

  // Encoding signals
  if (urlAnalysis.hasSuspiciousEncoding) {
    signals.push(createSignal(
      `sig-url-${signalId++}`,
      'suspicious_encoding',
      true,
      'URL contains unusual character encoding',
      source,
      'MEDIUM',
      'destination_deception'
    ));
  }

  // Brand impersonation in structural flags
  if (urlAnalysis.structuralFlags) {
    const brandFlag = urlAnalysis.structuralFlags.find((f: any) => f.name.includes('Brand Impersonation'));
    if (brandFlag) {
      signals.push(createSignal(
        `sig-url-${signalId++}`,
        'brand_impersonation_subdomain',
        true,
        brandFlag.details,
        source,
        'CRITICAL',
        'identity_impersonation'
      ));
    }
  }

  return signals;
}

/**
 * Build signal matrix summary
 */
export function buildSignalMatrix(signals: Signal[]): SignalMatrix {
  const summary = {
    totalSignals: signals.length,
    byCategory: {} as Record<SignalCategory, number>,
    bySeverity: {} as Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>,
  };

  // Initialize counters
  const categories: SignalCategory[] = [
    'social_engineering', 'identity_impersonation', 'credential_targeting',
    'authentication_targeting', 'payment_targeting', 'urgency_coercion',
    'url_structure', 'destination_deception', 'content_language',
    'action_request', 'delivery_context', 'correlation', 'user_exposure',
    'verification_gap', 'unknown'
  ];
  categories.forEach(cat => summary.byCategory[cat] = 0);

  const severities: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  severities.forEach(sev => summary.bySeverity[sev] = 0);

  // Count signals
  signals.forEach(signal => {
    summary.byCategory[signal.category] = (summary.byCategory[signal.category] || 0) + 1;
    summary.bySeverity[signal.severity] = (summary.bySeverity[signal.severity] || 0) + 1;
  });

  return { signals, summary };
}

/**
 * Helper to create a signal object
 */
function createSignal(
  id: string,
  name: string,
  value: boolean | string | number,
  evidence: string,
  source: Signal['source'],
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  category: SignalCategory
): Signal {
  // Calculate risk contribution based on severity
  const riskContribution = {
    'LOW': 5,
    'MEDIUM': 10,
    'HIGH': 15,
    'CRITICAL': 25
  }[severity];

  return {
    id,
    name,
    value,
    evidence,
    source,
    type: 'OBSERVED',
    severity,
    confidence: severity === 'CRITICAL' || severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    riskContribution,
    category,
  };
}

/**
 * Helper to extract match from regex
 */
function extractMatch(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match ? match[0] : '';
}
