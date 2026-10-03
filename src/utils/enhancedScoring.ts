import {
  RiskLevel,
  ConfidenceLevel,
  ExposureState,
  Signal,
  CorrelationPattern,
  DecisionTraceStep,
  DeterministicScoreBreakdown,
  EvidenceItem,
  VerificationBoundary,
  WhatWouldChange,
  EvidenceGraph,
} from '../types/investigation';
import { analyzeBenignContext } from './benignContextEngine';

export interface EnhancedScoringInput {
  signals: Signal[];
  correlations: CorrelationPattern[];
  benignContextScore: number;
  exposureState: ExposureState;
  text: string;
  urlHostname?: string;
}

export interface EnhancedScoringResult {
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: ConfidenceLevel;
  decisionTrace: DecisionTraceStep[];
  verificationBoundary: VerificationBoundary;
  whatWouldChange: WhatWouldChange;
  evidenceGraph: EvidenceGraph;
  deterministicBreakdown: DeterministicScoreBreakdown;
}

/**
 * Enhanced scoring engine incorporating signals, correlations, benign context, and exposure
 */
export function calculateEnhancedRisk(input: EnhancedScoringInput): EnhancedScoringResult {
  const { signals, correlations, benignContextScore, exposureState, text, urlHostname } = input;

  // Step 1: Calculate base signal score
  const signalScore = signals.reduce((sum, s) => sum + s.riskContribution, 0);

  // Step 2: Add correlation score
  const correlationScore = correlations.reduce((sum, c) => sum + c.riskContribution, 0);

  // Step 3: Apply benign context adjustment
  const contextScore = benignContextScore;

  // Step 4: Apply exposure multiplier
  const exposureMultiplier = getExposureMultiplier(exposureState);

  // Step 5: Calculate raw score
  let rawScore = signalScore + correlationScore + contextScore;
  rawScore = Math.max(0, rawScore); // Ensure non-negative

  // Step 6: Apply exposure multiplier
  rawScore = Math.round(rawScore * exposureMultiplier);

  // Step 7: Normalize to 0-100
  const normalizedScore = Math.min(100, Math.round(rawScore));

  // Step 8: Determine risk level
  const riskLevel = determineRiskLevel(normalizedScore);

  // Step 9: Determine confidence
  const confidence = determineConfidence(signals, correlations, riskLevel);

  // Step 10: Build decision trace
  const decisionTrace = buildDecisionTrace(signals, correlations, benignContextScore, exposureState, normalizedScore);

  // Step 11: Build verification boundary
  const verificationBoundary = buildVerificationBoundary(signals, correlations, urlHostname);

  // Step 12: Build "what would change"
  const whatWouldChange = buildWhatWouldChange(signals, correlations, urlHostname);

  // Step 13: Build evidence graph
  const evidenceGraph = buildEvidenceGraph(signals, correlations, text, riskLevel);

  // Step 14: Build deterministic breakdown
  const deterministicBreakdown = buildDeterministicBreakdown(signals, correlations, normalizedScore, riskLevel);

  return {
    riskLevel,
    riskScore: normalizedScore,
    confidence,
    decisionTrace,
    verificationBoundary,
    whatWouldChange,
    evidenceGraph,
    deterministicBreakdown,
  };
}

/**
 * Get exposure multiplier based on user exposure state
 */
function getExposureMultiplier(exposure: ExposureState): number {
  const multipliers: Record<ExposureState, number> = {
    NOT_INTERACTED: 0.7,
    VIEWED_ONLY: 0.85,
    CLICKED: 1.0,
    CREDENTIAL_ENTERED: 1.5,
    OTP_SHARED: 1.6,
    PAYMENT_ENTERED: 1.7,
    FILE_DOWNLOADED: 1.4,
    PERMISSION_GRANTED: 1.3,
    UNKNOWN: 1.0,
  };
  return multipliers[exposure] || 1.0;
}

/**
 * Determine risk level from score
 */
function determineRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine confidence based on evidence quality
 */
function determineConfidence(
  signals: Signal[],
  correlations: CorrelationPattern[],
  riskLevel: RiskLevel
): ConfidenceLevel {
  const highConfidenceSignals = signals.filter(s => s.confidence === 'HIGH').length;
  const highConfidenceCorrelations = correlations.filter(c => c.confidence === 'HIGH').length;

  if (highConfidenceSignals >= 2 || highConfidenceCorrelations >= 1) {
    return 'HIGH';
  }
  if (signals.length >= 3 || correlations.length >= 1) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Build decision trace showing how score was calculated
 */
function buildDecisionTrace(
  signals: Signal[],
  correlations: CorrelationPattern[],
  benignScore: number,
  exposure: ExposureState,
  finalScore: number
): DecisionTraceStep[] {
  const trace: DecisionTraceStep[] = [];
  let stepId = 1;

  // Signal contributions
  for (const signal of signals) {
    trace.push({
      id: `dt-${stepId++}`,
      signal: signal.name,
      contribution: signal.riskContribution,
      rationale: signal.evidence,
      rule: `Signal category: ${signal.category}, severity: ${signal.severity}`,
    });
  }

  // Correlation contributions
  for (const correlation of correlations) {
    trace.push({
      id: `dt-${stepId++}`,
      signal: correlation.name,
      contribution: correlation.riskContribution,
      rationale: correlation.interpretation,
      rule: `Correlation pattern with ${correlation.confidence} confidence`,
    });
  }

  // Benign context adjustment
  if (benignScore < 0) {
    trace.push({
      id: `dt-${stepId++}`,
      signal: 'Benign Context Adjustment',
      contribution: benignScore,
      rationale: 'Context contains benign indicators reducing risk assessment',
      rule: 'Benign context engine adjustment',
    });
  }

  // Exposure multiplier
  if (exposure !== 'NOT_INTERACTED' && exposure !== 'UNKNOWN') {
    const multiplier = getExposureMultiplier(exposure);
    trace.push({
      id: `dt-${stepId++}`,
      signal: `Exposure State: ${exposure}`,
      contribution: 0,
      rationale: `User exposure state applied ${multiplier}x multiplier to risk assessment`,
      rule: 'Exposure model adjustment',
    });
  }

  return trace;
}

/**
 * Build verification boundary
 */
function buildVerificationBoundary(
  signals: Signal[],
  correlations: CorrelationPattern[],
  urlHostname?: string
): VerificationBoundary {
  const observed: string[] = [];
  const inferred: string[] = [];
  const notVerified: string[] = [];

  // Observed - directly extracted
  signals.forEach(s => {
    observed.push(`${s.name}: ${s.evidence}`);
  });

  // Inferred - security interpretation
  correlations.forEach(c => {
    inferred.push(c.interpretation);
  });

  // Additional inferences based on signal categories
  const hasUrgency = signals.some(s => s.category === 'urgency_coercion');
  if (hasUrgency) {
    inferred.push('Artificial time pressure is commonly used to bypass critical thinking and force rapid action.');
  }

  const hasCredential = signals.some(s => s.category === 'credential_targeting');
  if (hasCredential) {
    inferred.push('Credential requests create vectors for unauthorized account access if delivered to malicious actors.');
  }

  const hasPayment = signals.some(s => s.category === 'payment_targeting');
  if (hasPayment) {
    inferred.push('Financial solicitation indicates potential monetary fraud or unauthorized transaction attempts.');
  }

  // Not verified - requires external evidence
  notVerified.push('Sender identity was not independently verified through secondary channels.');
  notVerified.push('Message origin was not cryptographically authenticated.');
  notVerified.push('External domain reputation and blacklist status were not queried.');
  notVerified.push('No live analysis of URL destinations was performed.');
  notVerified.push('TLS certificate authority chain and validity status were not verified.');

  if (urlHostname) {
    notVerified.push(`Domain ownership for ${urlHostname} was not verified through WHOIS or registrar records.`);
  }

  return { observed, inferred, notVerified };
}

/**
 * Build "what would change" section
 */
function buildWhatWouldChange(
  signals: Signal[],
  correlations: CorrelationPattern[],
  urlHostname?: string
): WhatWouldChange {
  const increaseConfidence: string[] = [];
  const reduceConcern: string[] = [];

  // What would increase confidence
  if (correlations.length > 0) {
    increaseConfidence.push('Sender identity is independently verified as suspicious');
    increaseConfidence.push('Domain ownership differs from claimed organization');
    increaseConfidence.push('Destination requests credentials on submission');
  }

  if (signals.some(s => s.category === 'identity_impersonation')) {
    increaseConfidence.push('Impersonated brand confirms no such communication was sent');
  }

  // What would reduce concern
  if (urlHostname) {
    reduceConcern.push(`URL is confirmed as an official organization domain for ${urlHostname}`);
  }

  reduceConcern.push('Message is confirmed through an independent channel (official app, phone call to verified number)');
  reduceConcern.push('Communication matches expected pattern from known contact');

  if (signals.some(s => s.category === 'credential_targeting')) {
    reduceConcern.push('User recently initiated a legitimate password reset or account verification');
  }

  return { increaseConfidence, reduceConcern };
}

/**
 * Build evidence graph
 */
function buildEvidenceGraph(
  signals: Signal[],
  correlations: CorrelationPattern[],
  text: string,
  riskLevel: RiskLevel
): EvidenceGraph {
  const input = text.substring(0, 200) + (text.length > 200 ? '...' : '');
  
  const interpretation = correlations.length > 0
    ? correlations[0].interpretation
    : 'Analysis identified individual signals but no strong correlation patterns were detected.';

  const possibleConsequences: string[] = [];
  
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    if (signals.some(s => s.category === 'credential_targeting')) {
      possibleConsequences.push('POSSIBLE ACCOUNT COMPROMISE');
    }
    if (signals.some(s => s.category === 'payment_targeting')) {
      possibleConsequences.push('POSSIBLE FINANCIAL LOSS');
    }
    if (signals.some(s => s.category === 'action_request' && s.name === 'download_request')) {
      possibleConsequences.push('POSSIBLE DEVICE COMPROMISE');
    }
  }

  const userAction = riskLevel === 'LOW'
    ? 'Verify with sender if message was unexpected'
    : 'Do not interact with the request. Verify through official channels independently.';

  return {
    input,
    observations: signals,
    correlations,
    interpretation,
    possibleConsequences,
    userAction,
  };
}

/**
 * Build deterministic breakdown
 */
function buildDeterministicBreakdown(
  signals: Signal[],
  correlations: CorrelationPattern[],
  normalizedScore: number,
  riskLevel: RiskLevel
): DeterministicScoreBreakdown {
  const signalsTriggered = signals.map(s => ({
    name: s.name,
    weight: s.riskContribution,
    category: s.category,
    matchedEvidence: s.evidence,
  }));

  correlations.forEach(c => {
    signalsTriggered.push({
      name: `CORRELATION: ${c.name}`,
      weight: c.riskContribution,
      category: 'correlation',
      matchedEvidence: c.interpretation,
    });
  });

  const scoringRationale = signalsTriggered.length === 0
    ? 'No high-risk threat indicators, credential solicitation, or deceptive structural markers were found in the supplied input.'
    : `Score calculated from ${signalsTriggered.length} triggered indicators (${signalsTriggered.map(t => `${t.name} [+${t.weight}]`).join(', ')}).`;

  return {
    rawScore: normalizedScore,
    normalizedScore,
    riskLevel,
    signalsTriggered,
    scoringRationale,
  };
}
