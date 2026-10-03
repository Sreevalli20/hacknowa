import { EvidenceItem, AttackPathStep, RecommendedAction } from '../types/investigation';

interface DetectionRule {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'urgency' | 'credential' | 'otp' | 'payment' | 'impersonation' | 'malware' | 'permission' | 'url_anomaly';
  patterns: RegExp[];
  extractEvidence: (match: RegExpMatchArray, text: string) => string;
}

const DETECTION_RULES: DetectionRule[] = [
  // Urgency / Time Pressure
  {
    id: 'URGENCY_IMMEDIATE',
    name: 'Immediate Action Required',
    severity: 'HIGH',
    category: 'urgency',
    patterns: [
      /immediate action required/i,
      /act immediately/i,
      /respond right now/i,
      /don't delay/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'URGENCY_DEADLINE',
    name: 'Time-Based Deadline Threat',
    severity: 'HIGH',
    category: 'urgency',
    patterns: [
      /within \d+ (minutes|hours|mins|hrs)/i,
      /in \d+ hours/i,
      /expires in \d+/i,
      /limited time offer/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'URGENCY_ACCOUNT_STATUS',
    name: 'Account Suspension/Lock Threat',
    severity: 'HIGH',
    category: 'urgency',
    patterns: [
      /account will be (suspended|locked|closed|deactivated)/i,
      /your account has been (suspended|locked|limited)/i,
      /unusual (sign-in|activity|login) detected/i,
      /security alert/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'URGENCY_FINAL_NOTICE',
    name: 'Final Warning Notice',
    severity: 'MEDIUM',
    category: 'urgency',
    patterns: [
      /final notice/i,
      /last warning/i,
      /final reminder/i,
      /this is your final opportunity/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // Credential Solicitation
  {
    id: 'CREDENTIAL_PASSWORD',
    name: 'Password Request',
    severity: 'CRITICAL',
    category: 'credential',
    patterns: [
      /enter your password/i,
      /provide your password/i,
      /send your password/i,
      /verify your password/i,
      /password required/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'CREDENTIAL_LOGIN',
    name: 'Login/Sign-in Request',
    severity: 'HIGH',
    category: 'credential',
    patterns: [
      /sign in to (verify|confirm)/i,
      /log in to (verify|confirm)/i,
      /click here to sign in/i,
      /please log in/i,
      /authenticate your account/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'CREDENTIAL_VERIFY',
    name: 'Identity Verification Request',
    severity: 'HIGH',
    category: 'credential',
    patterns: [
      /verify your identity/i,
      /confirm your identity/i,
      /verify your account/i,
      /confirm your account/i,
      /identity verification required/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'CREDENTIAL_PASSCODE',
    name: 'Passcode/PIN Request',
    severity: 'CRITICAL',
    category: 'credential',
    patterns: [
      /enter your passcode/i,
      /provide your pin/i,
      /send your pin code/i,
      /security code required/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // OTP / 2FA Interception
  {
    id: 'OTP_REQUEST',
    name: 'OTP/Verification Code Request',
    severity: 'CRITICAL',
    category: 'otp',
    patterns: [
      /enter the (one-time|otp|verification) code/i,
      /provide the (verification|security) code/i,
      /send me the code/i,
      /what is your (otp|2fa|mfa) code/i,
      /authentication code/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'OTP_CODE_SHARED',
    name: 'Request to Share Received Code',
    severity: 'CRITICAL',
    category: 'otp',
    patterns: [
      /share the code you received/i,
      /forward the verification code/i,
      /tell me the code from sms/i,
      /what code did you get/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // Payment / Financial
  {
    id: 'PAYMENT_CARD',
    name: 'Credit Card/Payment Information Request',
    severity: 'CRITICAL',
    category: 'payment',
    patterns: [
      /credit card number/i,
      /card number/i,
      /cvv|cvc/i,
      /expiration date/i,
      /billing information/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'PAYMENT_TRANSFER',
    name: 'Money Transfer Request',
    severity: 'CRITICAL',
    category: 'payment',
    patterns: [
      /wire (money|funds)/i,
      /bank transfer/i,
      /send payment/i,
      /make a payment/i,
      /transfer immediately/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'PAYMENT_INVOICE',
    name: 'Invoice/Payment Due Claim',
    severity: 'HIGH',
    category: 'payment',
    patterns: [
      /unpaid invoice/i,
      /overdue payment/i,
      /payment due/i,
      /outstanding balance/i,
      /settle this invoice/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'PAYMENT_CRYPTO',
    name: 'Cryptocurrency Request',
    severity: 'CRITICAL',
    category: 'payment',
    patterns: [
      /bitcoin|btc|ethereum|eth/i,
      /crypto wallet/i,
      /send (bitcoin|crypto)/i,
      /wallet address/i,
      /airdrop/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'PAYMENT_GIFT_CARD',
    name: 'Gift Card Request',
    severity: 'CRITICAL',
    category: 'payment',
    patterns: [
      /gift card/i,
      /itunes card|google play card/i,
      /steam card|amazon card/i,
      /buy gift cards/i,
      /scratch-off code/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // Brand/Service Impersonation
  {
    id: 'IMPERSONATION_BANK',
    name: 'Financial Institution Impersonation',
    severity: 'HIGH',
    category: 'impersonation',
    patterns: [
      /chase bank|wells fargo|bank of america|citibank/i,
      /your bank/i,
      /bank security/i,
      /fraud department/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'IMPERSONATION_TECH',
    name: 'Tech Company Impersonation',
    severity: 'HIGH',
    category: 'impersonation',
    patterns: [
      /microsoft support|apple support|google support/i,
      /amazon security/i,
      /netflix account/i,
      /paypal security/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'IMPERSONATION_GOVERNMENT',
    name: 'Government/Official Impersonation',
    severity: 'HIGH',
    category: 'impersonation',
    patterns: [
      /irs|internal revenue service/i,
      /social security administration/i,
      /court summons/i,
      /federal agency/i,
      /government official/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // Malware/Download
  {
    id: 'MALWARE_DOWNLOAD',
    name: 'Suspicious Download Request',
    severity: 'HIGH',
    category: 'malware',
    patterns: [
      /download this (file|attachment|document)/i,
      /open the attachment/i,
      /install this update/i,
      /run this program/i,
      /click to download/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'MALWARE_EXECUTABLE',
    name: 'Executable File Reference',
    severity: 'CRITICAL',
    category: 'malware',
    patterns: [
      /\.exe\b/i,
      /\.scr\b/i,
      /\.bat\b/i,
      /\.vbs\b/i,
      /\.jar\b/i,
      /\.apk\b/i,
      /\.dmg\b/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // Permission/Profile
  {
    id: 'PERMISSION_PROFILE',
    name: 'Configuration Profile/MDM Request',
    severity: 'HIGH',
    category: 'permission',
    patterns: [
      /install (configuration|security) profile/i,
      /mdm profile/i,
      /device management profile/i,
      /certificate installation/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'PERMISSION_ACCESS',
    name: 'System Access/Permission Request',
    severity: 'HIGH',
    category: 'permission',
    patterns: [
      /grant (access|permission)/i,
      /allow remote access/i,
      /enable accessibility/i,
      /screen sharing/i,
      /remote control/i,
    ],
    extractEvidence: (m) => m[0],
  },

  // URL Patterns
  {
    id: 'URL_SHORTENER',
    name: 'URL Shortener Detected',
    severity: 'MEDIUM',
    category: 'url_anomaly',
    patterns: [
      /bit\.ly/i,
      /tinyurl\.com/i,
      /goo\.gl/i,
      /t\.co/i,
      /ow\.ly/i,
      /buff\.ly/i,
    ],
    extractEvidence: (m) => m[0],
  },
  {
    id: 'URL_CLICK_HERE',
    name: 'Generic "Click Here" Call-to-Action',
    severity: 'MEDIUM',
    category: 'url_anomaly',
    patterns: [
      /click here/i,
      /click this link/i,
      /follow this link/i,
      /visit (this|the) link/i,
    ],
    extractEvidence: (m) => m[0],
  },
];

export interface MessageAnalysisResult {
  evidenceLedger: EvidenceItem[];
  observed: string[];
  inferred: string[];
  notVerified: string[];
  attackPath: AttackPathStep[];
  recommendedActions: RecommendedAction[];
  falsePositiveConsiderations: string[];
}

/**
 * Deterministic message analyzer using rule-based detection.
 * No AI, no hallucination, only pattern matching against defined rules.
 */
export function analyzeMessage(text: string): MessageAnalysisResult {
  const evidenceLedger: EvidenceItem[] = [];
  const observed: string[] = [];
  const inferred: string[] = [];
  const recommendedActions: RecommendedAction[] = [];
  const falsePositiveConsiderations: string[] = [];
  let evidenceCounter = 1;

  const lowerText = text.toLowerCase();

  // Apply all detection rules
  for (const rule of DETECTION_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        const evidence = rule.extractEvidence(match, text);
        
        evidenceLedger.push({
          id: `ev-${evidenceCounter++}`,
          finding: rule.name,
          evidence: evidence,
          type: 'OBSERVED',
          confidence: rule.severity === 'CRITICAL' || rule.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          signalCategory: rule.category,
        });

        observed.push(`Detected: ${rule.name} - "${evidence}"`);

        // Add inference based on category
        switch (rule.category) {
          case 'urgency':
            inferred.push('Artificial time pressure is commonly used to bypass critical thinking and force rapid action.');
            break;
          case 'credential':
            inferred.push('Credential requests create vectors for unauthorized account access if delivered to malicious actors.');
            break;
          case 'otp':
            inferred.push('OTP interception enables attackers to bypass multi-factor authentication protections.');
            break;
          case 'payment':
            inferred.push('Financial solicitation indicates potential monetary fraud or unauthorized transaction attempts.');
            break;
          case 'impersonation':
            inferred.push('Brand or institutional impersonation leverages false authority to manipulate targets.');
            break;
          case 'malware':
            inferred.push('File download requests may deliver malicious payloads or surveillance software.');
            break;
          case 'permission':
            inferred.push('Permission requests can grant persistent device access or install monitoring capabilities.');
            break;
          case 'url_anomaly':
            inferred.push('Obfuscated or shortened URLs may direct to unintended destinations.');
            break;
        }
      }
    }
  }

  // Generate not verified aspects - only include if relevant to this analysis
  const notVerified: string[] = [];

  if (evidenceLedger.length > 0) {
    // Only add message verification statements if we actually analyzed a message
    notVerified.push('Sender identity was not independently verified through secondary channels.');
    notVerified.push('Message origin was not cryptographically authenticated.');
  }

  // Only add URL verification statements if URLs were detected
  const hasUrlIndicators = evidenceLedger.some(e => e.signalCategory === 'url_anomaly');
  if (hasUrlIndicators) {
    notVerified.push('External domain reputation and blacklist status were not queried.');
    notVerified.push('No live analysis of URL destinations was performed.');
  }

  // Build attack path dynamically
  const attackPath: AttackPathStep[] = [
    {
      stepNumber: 1,
      label: 'USER RECEIVES COMMUNICATION',
      description: 'Message was delivered via digital channel.',
      isPossibleOnly: false,
      status: 'observed',
    },
  ];

  const hasUrgency = evidenceLedger.some(e => e.signalCategory === 'urgency');
  const hasCredential = evidenceLedger.some(e => e.signalCategory === 'credential');
  const hasOtp = evidenceLedger.some(e => e.signalCategory === 'otp');
  const hasPayment = evidenceLedger.some(e => e.signalCategory === 'payment');
  const hasMalware = evidenceLedger.some(e => e.signalCategory === 'malware');
  const hasImpersonation = evidenceLedger.some(e => e.signalCategory === 'impersonation');

  if (hasUrgency || hasImpersonation) {
    attackPath.push({
      stepNumber: 2,
      label: 'SOCIAL ENGINEERING / URGENCY',
      description: 'Communication employs time pressure or false authority to motivate action.',
      isPossibleOnly: false,
      status: 'observed',
    });
  }

  if (hasCredential || hasOtp || hasPayment || hasMalware) {
    attackPath.push({
      stepNumber: attackPath.length + 1,
      label: 'REQUESTED ACTION',
      description: 'User is prompted to provide sensitive information, credentials, or execute files.',
      isPossibleOnly: false,
      status: 'observed',
    });

    attackPath.push({
      stepNumber: attackPath.length + 1,
      label: 'POSSIBLE DATA CAPTURE',
      description: 'In an adversarial scenario, submitted information would be intercepted by the attacker.',
      isPossibleOnly: true,
      status: 'possible',
    });

    if (hasCredential || hasOtp) {
      attackPath.push({
        stepNumber: attackPath.length + 1,
        label: 'POSSIBLE ACCOUNT COMPROMISE',
        description: 'Captured credentials or authentication codes could enable unauthorized account access.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    if (hasPayment) {
      attackPath.push({
        stepNumber: attackPath.length + 1,
        label: 'POSSIBLE FINANCIAL LOSS',
        description: 'Submitted payment information could be used for unauthorized transactions.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    if (hasMalware) {
      attackPath.push({
        stepNumber: attackPath.length + 1,
        label: 'POSSIBLE DEVICE COMPROMISE',
        description: 'Executed files could install persistent malware or surveillance tools.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }
  }

  // Generate recommended actions
  if (hasCredential) {
    recommendedActions.push({
      action: 'Do not provide passwords, passcodes, or login credentials.',
      priority: 'IMMEDIATE',
      context: 'Credential harvesting is a primary objective of phishing attacks.',
    });
  }

  if (hasOtp) {
    recommendedActions.push({
      action: 'Never share one-time passwords, verification codes, or 2FA tokens.',
      priority: 'IMMEDIATE',
      context: 'Legitimate organizations never request OTPs through inbound communications.',
    });
  }

  if (hasPayment) {
    recommendedActions.push({
      action: 'Do not provide payment information, card numbers, or transfer funds.',
      priority: 'IMMEDIATE',
      context: 'Financial fraud is a common objective of social engineering attacks.',
    });
  }

  if (hasMalware) {
    recommendedActions.push({
      action: 'Do not download, open, or execute files from unverified sources.',
      priority: 'IMMEDIATE',
      context: 'Malicious files can compromise device security and data.',
    });
  }

  if (hasImpersonation) {
    recommendedActions.push({
      action: 'Verify the sender through official channels independently.',
      priority: 'HIGH',
      context: 'Contact the organization directly using verified contact information.',
    });
  }

  if (evidenceLedger.length > 0) {
    recommendedActions.push({
      action: 'Navigate directly to the official service website or mobile app.',
      priority: 'HIGH',
      context: 'Bypasses any potential lookalike or redirected link.',
    });
  }

  if (evidenceLedger.length === 0) {
    observed.push('No coercive urgency, credential demands, or malicious indicators detected in text.');
    inferred.push('Communication structure is consistent with normal, non-coercive exchanges.');
    recommendedActions.push({
      action: 'No security-specific action was triggered by the supplied artifact. Continue normal caution.',
      priority: 'STANDARD',
      context: 'No high-risk indicators detected.',
    });
  } else {
    falsePositiveConsiderations.push('If you recently initiated a password reset or account verification, this could be a related notification.');
    falsePositiveConsiderations.push('Legitimate organizations may use urgent language for time-sensitive notifications.');
  }

  return {
    evidenceLedger,
    observed,
    inferred,
    notVerified,
    attackPath,
    recommendedActions,
    falsePositiveConsiderations,
  };
}
