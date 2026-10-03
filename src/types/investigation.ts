export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingType = 'OBSERVED' | 'INFERRED' | 'UNKNOWN';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EvidenceItem {
  id: string;
  finding: string;
  evidence: string;
  type: FindingType;
  confidence: ConfidenceLevel;
  signalCategory?: 'credential' | 'urgency' | 'otp' | 'payment' | 'url_anomaly' | 'malware' | 'impersonation' | 'permission' | 'neutral';
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
  riskLevel: RiskLevel;
  riskScore: number;
  summary: string;
  observed: string[];
  inferred: string[];
  notVerified: string[];
  recommendedActions: RecommendedAction[];
  falsePositiveConsiderations: string[];
  evidenceLedger: EvidenceItem[];
  attackPath: AttackPathStep[];
  urlAnalysis?: URLStructuralAnalysis;
  qrDetails?: {
    rawText: string;
    isUrl: boolean;
    extractedLocally: boolean;
  };
  deterministicBreakdown: DeterministicScoreBreakdown;
  analyzedInputsSummary: {
    hasMessage: boolean;
    hasUrl: boolean;
    hasScreenshot: boolean;
    hasQr: boolean;
  };
  timestamp: string;
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
