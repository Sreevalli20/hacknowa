import { Signal, CorrelationPattern, ConfidenceLevel } from '../types/investigation';

export interface CorrelationEngineResult {
  correlations: CorrelationPattern[];
  summary: {
    totalCorrelations: number;
    byConfidence: Record<ConfidenceLevel, number>;
  };
}

/**
 * Correlation rule definitions
 * Each rule defines a pattern of signals that together indicate a specific threat
 */
const CORRELATION_RULES: Array<{
  id: string;
  name: string;
  description: string;
  requiredSignals: string[];
  optionalSignals: string[];
  riskContribution: number;
  baseConfidence: ConfidenceLevel;
  interpretation: string;
}> = [
  {
    id: 'cor-credential-capture',
    name: 'Credential Capture Pattern',
    description: 'Combination of credential request with login destination',
    requiredSignals: ['password_request', 'login_request'],
    optionalSignals: ['urgency_indication', 'account_status_threat'],
    riskContribution: 35,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with credential harvesting attack - user is asked to provide authentication credentials at a destination.'
  },
  {
    id: 'cor-social-engineering',
    name: 'Social Engineering Pattern',
    description: 'Urgency combined with account verification',
    requiredSignals: ['urgency_indication', 'identity_verification_request'],
    optionalSignals: ['account_status_threat', 'final_warning_language'],
    riskContribution: 30,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with social engineering using artificial time pressure to force rapid account verification action.'
  },
  {
    id: 'cor-authentication-targeting',
    name: 'Authentication Code Targeting',
    description: 'OTP request combined with login destination',
    requiredSignals: ['otp_verification_code_request', 'login_request'],
    optionalSignals: ['urgency_indication', 'otp_sharing_request'],
    riskContribution: 40,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with MFA/OTP interception attack - attempts to bypass multi-factor authentication by soliciting verification codes.'
  },
  {
    id: 'cor-payment-phishing',
    name: 'Payment Phishing Pattern',
    description: 'Payment request combined with suspicious URL',
    requiredSignals: ['credit_card_request', 'money_transfer_request'],
    optionalSignals: ['gift_card_request', 'cryptocurrency_request', 'invoice_payment_claim'],
    riskContribution: 45,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with financial fraud - solicitation of payment information or fund transfers.'
  },
  {
    id: 'cor-identity-deception',
    name: 'Identity Deception Pattern',
    description: 'Impersonation combined with credential request',
    requiredSignals: ['financial_institution_claim', 'password_request'],
    optionalSignals: ['tech_company_claim', 'government_authority_claim', 'urgency_indication'],
    riskContribution: 38,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with identity deception - false authority claim combined with credential solicitation.'
  },
  {
    id: 'cor-malicious-download',
    name: 'Malicious Download Pattern',
    description: 'Download request combined with executable file',
    requiredSignals: ['download_request', 'executable_file_reference'],
    optionalSignals: ['urgency_indication', 'profile_installation_request'],
    riskContribution: 42,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with malware delivery - solicitation to download and execute potentially malicious files.'
  },
  {
    id: 'cor-brand-impersonation',
    name: 'Brand Impersonation Pattern',
    description: 'Punycode or brand-like hostname with account terminology',
    requiredSignals: ['punycode_encoding', 'brand_impersonation_subdomain'],
    optionalSignals: ['credential_path', 'suspicious_keywords_in_url'],
    riskContribution: 35,
    baseConfidence: 'MEDIUM',
    interpretation: 'Pattern consistent with brand impersonation using homograph attacks or deceptive subdomain structures.'
  },
  {
    id: 'cor-ip-credential',
    name: 'IP-Based Authentication Targeting',
    description: 'IP hostname combined with login path',
    requiredSignals: ['ip_hostname', 'credential_path'],
    optionalSignals: ['unencrypted_http', 'urgency_indication'],
    riskContribution: 40,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with suspicious authentication destination using bare IP address instead of registered domain.'
  },
  {
    id: 'cor-destination-obfuscation',
    name: 'Destination Obfuscation Pattern',
    description: 'Userinfo @ combined with login path',
    requiredSignals: ['userinfo_at_prefix', 'credential_path'],
    optionalSignals: ['suspicious_encoding', 'excessive_subdomain_depth'],
    riskContribution: 38,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with destination obfuscation using userinfo syntax to visually mask actual server destination.'
  },
  {
    id: 'cor-redirect-abuse',
    name: 'Possible Redirect Abuse',
    description: 'Redirect parameter combined with credential destination',
    requiredSignals: ['suspicious_encoding', 'credential_path'],
    optionalSignals: ['generic_click_here_cta', 'url_shortener_detected'],
    riskContribution: 32,
    baseConfidence: 'MEDIUM',
    interpretation: 'Pattern consistent with possible redirect abuse - parameters may be used to route users to unintended destinations.'
  },
  {
    id: 'cor-urgent-credential',
    name: 'Urgent Credential Harvesting',
    description: 'Urgency combined with multiple credential requests',
    requiredSignals: ['urgency_indication', 'password_request', 'account_status_threat'],
    optionalSignals: ['otp_verification_code_request', 'final_warning_language'],
    riskContribution: 45,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with urgent credential harvesting - artificial time pressure used to bypass critical thinking before credential submission.'
  },
  {
    id: 'cor-financial-impersonation',
    name: 'Financial Impersonation Pattern',
    description: 'Financial institution claim combined with payment request',
    requiredSignals: ['financial_institution_claim', 'money_transfer_request'],
    optionalSignals: ['credit_card_request', 'invoice_payment_claim', 'urgency_indication'],
    riskContribution: 48,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with financial institution impersonation for monetary fraud - false authority claim combined with payment solicitation.'
  },
  {
    id: 'cor-tech-support-scam',
    name: 'Tech Support Scam Pattern',
    description: 'Tech company claim combined with permission request',
    requiredSignals: ['tech_company_claim', 'permission_grant_request'],
    optionalSignals: ['profile_installation_request', 'urgency_indication', 'download_request'],
    riskContribution: 42,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with technical support scam - false authority claim combined with system access or permission solicitation.'
  },
  {
    id: 'cor-government-impersonation',
    name: 'Government Impersonation Pattern',
    description: 'Government authority claim combined with payment or credential request',
    requiredSignals: ['government_authority_claim', 'money_transfer_request'],
    optionalSignals: ['credit_card_request', 'urgency_indication', 'final_warning_language'],
    riskContribution: 50,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with government impersonation - false authority claim using government agency identity to solicit payments or credentials.'
  },
  {
    id: 'cor-cleartext-auth',
    name: 'Cleartext Authentication Pattern',
    description: 'Unencrypted HTTP combined with credential path',
    requiredSignals: ['unencrypted_http', 'credential_path'],
    optionalSignals: ['password_request', 'login_request', 'ip_hostname'],
    riskContribution: 35,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with insecure credential transmission - authentication endpoint served without encryption.'
  },
  {
    id: 'cor-otp-interception',
    name: 'OTP Interception Pattern',
    description: 'OTP sharing request combined with urgency',
    requiredSignals: ['otp_sharing_request', 'urgency_indication'],
    optionalSignals: ['otp_verification_code_request', 'account_status_threat'],
    riskContribution: 40,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with OTP interception - solicitation to share received verification codes, potentially to bypass MFA protections.'
  },
  {
    id: 'cor-multi-factor-threat',
    name: 'Multi-Factor Threat Pattern',
    description: 'Multiple threat vectors combined',
    requiredSignals: ['password_request', 'otp_verification_code_request'],
    optionalSignals: ['urgency_indication', 'account_status_threat', 'financial_institution_claim'],
    riskContribution: 48,
    baseConfidence: 'HIGH',
    interpretation: 'Pattern consistent with multi-factor threat - combination of credential targeting, authentication targeting, and potential impersonation.'
  },
];

/**
 * Analyze signals for correlation patterns
 */
export function analyzeCorrelations(signals: Signal[]): CorrelationEngineResult {
  const correlations: CorrelationPattern[] = [];
  const signalNames = new Set(signals.map(s => s.name));

  for (const rule of CORRELATION_RULES) {
    // Check if all required signals are present
    const hasRequired = rule.requiredSignals.every(sig => signalNames.has(sig));
    
    if (hasRequired) {
      // Count how many optional signals are present
      const optionalMatches = rule.optionalSignals.filter(sig => signalNames.has(sig));
      
      // Adjust confidence based on optional signal matches
      let confidence = rule.baseConfidence;
      if (optionalMatches.length >= 2) {
        confidence = 'HIGH';
      } else if (optionalMatches.length === 1 && rule.baseConfidence === 'MEDIUM') {
        confidence = 'HIGH';
      }

      // Adjust risk contribution based on optional matches
      const riskAdjustment = optionalMatches.length * 5;
      const finalRiskContribution = Math.min(100, rule.riskContribution + riskAdjustment);

      correlations.push({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        signals: [...rule.requiredSignals, ...optionalMatches],
        riskContribution: finalRiskContribution,
        confidence,
        interpretation: rule.interpretation,
      });
    }
  }

  // Build summary
  const summary = {
    totalCorrelations: correlations.length,
    byConfidence: {
      HIGH: correlations.filter(c => c.confidence === 'HIGH').length,
      MEDIUM: correlations.filter(c => c.confidence === 'MEDIUM').length,
      LOW: correlations.filter(c => c.confidence === 'LOW').length,
    },
  };

  return { correlations, summary };
}

/**
 * Get correlation by ID
 */
export function getCorrelationById(correlations: CorrelationPattern[], id: string): CorrelationPattern | undefined {
  return correlations.find(c => c.id === id);
}

/**
 * Get correlations by category (inferred from pattern names)
 */
export function getCorrelationsByType(correlations: CorrelationPattern[], type: string): CorrelationPattern[] {
  return correlations.filter(c => 
    c.name.toLowerCase().includes(type.toLowerCase()) ||
    c.description.toLowerCase().includes(type.toLowerCase())
  );
}
