export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingType = 'OBSERVED' | 'INFERRED' | 'NOT_VERIFIED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ExposureState = 'NOT_INTERACTED' | 'VIEWED_ONLY' | 'CLICKED' | 'CREDENTIAL_ENTERED' | 'OTP_SHARED' | 'PAYMENT_ENTERED' | 'FILE_DOWNLOADED' | 'PERMISSION_GRANTED' | 'UNKNOWN';

export type SignalCategory = 'social_engineering' | 'identity_impersonation' | 'credential_targeting' | 'authentication_targeting' | 'payment_targeting' | 'urgency_coercion' | 'url_structure' | 'destination_deception' | 'content_language' | 'action_request' | 'delivery_context' | 'correlation' | 'user_exposure' | 'verification_gap' | 'unknown';

export interface Signal {
  id: string;
  name: string;
  value: boolean | string | number;
  evidence: string;
  source: 'message_text' | 'url_structure' | 'ocr_text' | 'qr_content' | 'correlation' | 'context';
  type: FindingType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: ConfidenceLevel;
  riskContribution: number;
  category: SignalCategory;
}

export interface CorrelationPattern {
  id: string;
  name: string;
  description: string;
  signals: string[];
  riskContribution: number;
  confidence: ConfidenceLevel;
  interpretation: string;
}

export interface DecisionTraceStep {
  id: string;
  signal: string;
  contribution: number;
  rationale: string;
  rule: string;
}

export interface EvidenceGraph {
  input: string;
  observations: Signal[];
  correlations: CorrelationPattern[];
  interpretation: string;
  possibleConsequences: string[];
  userAction: string;
}

export interface VerificationBoundary {
  observed: string[];
  inferred: string[];
  notVerified: string[];
}

export interface WhatWouldChange {
  increaseConfidence: string[];
  reduceConcern: string[];
}

export interface EvidenceItem {
  id: string;
  finding: string;
  evidence: string;
  type: FindingType;
  confidence: ConfidenceLevel;
  signalCategory?: SignalCategory;
  riskContribution?: number;
}

export interface AttackPathStep {
  stepNumber: number;
  label: string;
  description: string;
  isPossibleOnly: boolean;
  status: 'observed' | 'possible';
}

export interface StructuralFlag {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}

export interface URLStructuralAnalysis {
  originalInput: string;
  isValidUrl: boolean;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  searchParams: { key: string; value: string }[];
  subdomains: string[];
  subdomainDepth: number;
  isIpAddress: boolean;
  hasPunycode: boolean;
  hasSuspiciousEncoding: boolean;
  detectedSuspiciousKeywords: string[];
  credentialPathIndicators: string[];
  downloadIndicators: string[];
  portAnomaly: boolean;
  userInfoPresent: boolean;
  structuralFlags: StructuralFlag[];
  notVerifiedAspects: string[];
}

export interface DeterministicSignal {
  name: string;
  weight: number;
  category: string;
  matchedEvidence: string;
}

export interface DeterministicScoreBreakdown {
  rawScore: number;
  normalizedScore: number;
  riskLevel: RiskLevel;
  signalsTriggered: DeterministicSignal[];
  scoringRationale: string;
}

export interface RecommendedAction {
  action: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'STANDARD';
  context: string;
}

export interface InvestigationResult {
  id: string;
  timestamp: string;
  inputType: 'message' | 'url' | 'screenshot' | 'qr';
  originalInput: string;
  normalizedInput: string;
  summary: string;

  // Signal matrix
  signals: Signal[];

  // Correlations
  correlations: CorrelationPattern[];

  // Risk assessment
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: ConfidenceLevel;
  exposureState: ExposureState;

  // Evidence
  evidenceLedger: EvidenceItem[];
  evidenceGraph: EvidenceGraph;
  verificationBoundary: VerificationBoundary;

  // Threat intelligence status
  threatIntelligenceStatus: {
    available: boolean;
    source?: string;
    lookupTimestamp?: string;
  };

  // Decision trace
  decisionTrace: DecisionTraceStep[];

  // Attack path
  attackPath: AttackPathStep[];

  // Recommendations
  recommendedActions: RecommendedAction[];
  falsePositiveConsiderations: string[];
  whatWouldChange: WhatWouldChange;

  // URL analysis (if applicable)
  urlAnalysis?: URLStructuralAnalysis;

  // QR details (if applicable)
  qrDetails?: {
    rawText: string;
    isUrl: boolean;
    extractedLocally: boolean;
  };

  // Screenshot analysis (if applicable)
  screenshotAnalysis?: {
    visibleText: string;
    visibleUrls: string[];
    visibleDomains: string[];
    visibleButtons: string[];
    credentialFields: boolean;
    paymentIndicators: boolean;
    urgencyIndicators: boolean;
    analysis: string;
    source: 'OCR' | 'GROQ_VISION' | 'BOTH' | 'FAILED';
  };

  // Deterministic breakdown
  deterministicBreakdown: DeterministicScoreBreakdown;

  // AI interpretation (optional)
  aiInterpretation?: {
    summary: string;
    contextualExplanation: string;
    attackPathWording: string[];
    defensiveActions: string[];
  };

  // Memory status
  memoryStatus: {
    available: boolean;
  };

  // AI reasoning status
  aiReasoningStatus: {
    available: boolean;
  };

  // Input summary
  analyzedInputsSummary: {
    hasMessage: boolean;
    hasUrl: boolean;
    hasScreenshot: boolean;
    hasQr: boolean;
  };
}

export interface EmergencyChecklist {
  enteredCredentials: boolean;
  enteredPayment: boolean;
  downloadedAnything: boolean;
  grantedPermissions: boolean;
  sharedOtp: boolean;
}

export interface EmergencyActionItem {
  id: string;
  stepNumber: number;
  timing: 'IMMEDIATE (0–15 mins)' | 'HOUR 1 (15–60 mins)' | 'WITHIN 24 HOURS';
  title: string;
  instructions: string;
  urgency: 'critical' | 'high' | 'medium';
}

export interface EmergencyPlanResponse {
  exposureAssessment: string;
  assessmentTone: 'Potential exposure' | 'Possible credential compromise' | 'Unable to verify compromise';
  actionItems: EmergencyActionItem[];
  verificationChecklist: string[];
  evidencePreservationGuide: string[];
  officialContactAdvice: string;
}
