import { v4 as uuidv4 } from 'uuid';
import {
  InvestigationResult,
  Signal,
  CorrelationPattern,
  ExposureState,
  EvidenceItem,
  AttackPathStep,
  RecommendedAction,
  URLStructuralAnalysis,
} from '../types/investigation';
import { extractSignalsFromText, extractSignalsFromUrl, buildSignalMatrix } from './signalMatrix';
import { analyzeCorrelations } from './correlationEngine';
import { analyzeBenignContext } from './benignContextEngine';
import { calculateEnhancedRisk } from './enhancedScoring';
import { analyzeUrlStructureEnhanced } from './enhancedUrlAnalyzer';
import { extractTextFromBase64 } from './ocr';
import { decodeQrFromDataUrl } from './qrDecoder';
import { generateContextualReasoning } from './groqReasoning';

export interface InvestigationInput {
  messageText?: string;
  urlText?: string;
  screenshotBase64?: {
    mimeType: string;
    data: string;
  };
  qrScreenshotBase64?: {
    mimeType: string;
    data: string;
  };
  qrDecodedText?: string;
  exposureState?: ExposureState;
}

/**
 * Main investigation orchestrator
 * Coordinates signal extraction, correlation, scoring, and evidence graph generation
 */
export async function runInvestigation(input: InvestigationInput): Promise<InvestigationResult> {
  const investigationId = uuidv4();
  const timestamp = new Date().toISOString();
  const exposureState = input.exposureState || 'NOT_INTERACTED';

  // Determine input type
  const hasMessage = Boolean(input.messageText && input.messageText.trim().length > 0);
  const hasUrl = Boolean(input.urlText && input.urlText.trim().length > 0);
  const hasScreenshot = Boolean(input.screenshotBase64 && input.screenshotBase64.data);
  const hasQr = Boolean(input.qrScreenshotBase64 && input.qrScreenshotBase64.data || input.qrDecodedText);

  let inputType: 'message' | 'url' | 'screenshot' | 'qr' = 'message';
  if (hasScreenshot) inputType = 'screenshot';
  else if (hasQr) inputType = 'qr';
  else if (hasUrl) inputType = 'url';

  // Normalize input text
  let normalizedText = input.messageText || '';
  let originalInput = input.messageText || input.urlText || '';

  // Extract text from screenshot if provided
  if (hasScreenshot && input.screenshotBase64) {
    const ocrResult = await extractTextFromBase64(input.screenshotBase64.data);
    if (ocrResult.success && ocrResult.text) {
      normalizedText += (normalizedText ? '\n\n' : '') + ocrResult.text;
      originalInput = `[Screenshot OCR] ${ocrResult.text.substring(0, 200)}...`;
    }
  }

  // Decode QR if provided
  let qrDetails: InvestigationResult['qrDetails'];
  if (hasQr) {
    let qrDecodedText = input.qrDecodedText;
    
    if (input.qrScreenshotBase64 && !qrDecodedText) {
      // Convert base64 data to data URL
      const dataUrl = `data:${input.qrScreenshotBase64.mimeType};base64,${input.qrScreenshotBase64.data}`;
      const qrResult = await decodeQrFromDataUrl(dataUrl);
      if (qrResult.success && qrResult.data) {
        qrDecodedText = qrResult.data;
      }
    }

    if (qrDecodedText) {
      qrDetails = {
        rawText: qrDecodedText,
        isUrl: /^https?:\/\//i.test(qrDecodedText.trim()),
        extractedLocally: true,
      };
      normalizedText += (normalizedText ? '\n\n' : '') + qrDecodedText;
      originalInput = qrDecodedText;
    }
  }

  // Extract effective URL for analysis
  let effectiveUrl = input.urlText?.trim() || '';
  if (!effectiveUrl && qrDetails && qrDetails.isUrl) {
    effectiveUrl = qrDetails.rawText.trim();
  }
  if (!effectiveUrl && normalizedText) {
    // Extract URL from text
    const urlMatch = normalizedText.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      effectiveUrl = urlMatch[0];
    }
  }

  // Step 1: Extract signals from text
  const textSignals = extractSignalsFromText(normalizedText, 'message_text');

  // Step 2: Analyze URL structure if present
  let urlAnalysis: URLStructuralAnalysis | undefined;
  let urlSignals: Signal[] = [];
  
  if (effectiveUrl) {
    urlAnalysis = analyzeUrlStructureEnhanced(effectiveUrl);
    urlSignals = extractSignalsFromUrl(urlAnalysis, 'url_structure');
  }

  // Step 3: Combine all signals
  const allSignals = [...textSignals, ...urlSignals];

  // Step 4: Build signal matrix
  const signalMatrix = buildSignalMatrix(allSignals);

  // Step 5: Analyze correlations
  const correlationResult = analyzeCorrelations(allSignals);

  // Step 6: Analyze benign context
  const benignContext = analyzeBenignContext(allSignals, normalizedText, urlAnalysis?.hostname);

  // Step 7: Calculate enhanced risk
  const scoringResult = calculateEnhancedRisk({
    signals: allSignals,
    correlations: correlationResult.correlations,
    benignContextScore: benignContext.scoreAdjustment,
    exposureState,
    text: normalizedText,
    urlHostname: urlAnalysis?.hostname,
  });

  // Step 8: Build evidence ledger from signals
  const evidenceLedger: EvidenceItem[] = allSignals.map((s, i) => ({
    id: `ev-${i + 1}`,
    finding: s.name,
    evidence: s.evidence,
    type: s.type,
    confidence: s.confidence,
    signalCategory: s.category,
    riskContribution: s.riskContribution,
  }));

  // Step 9: Build attack path
  const attackPath = buildAttackPath(allSignals, correlationResult.correlations, scoringResult.riskLevel);

  // Step 10: Build recommended actions
  const recommendedActions = buildRecommendedActions(allSignals, correlationResult.correlations, scoringResult.riskLevel);

  // Step 11: Build false positive considerations
  const falsePositiveConsiderations = buildFalsePositiveConsiderations(allSignals, benignContext, scoringResult.riskLevel);

  // Step 12: Build summary
  const summary = buildSummary(scoringResult.riskLevel, allSignals, correlationResult.correlations);

  // Step 13: Generate contextual AI reasoning via Groq (if available)
  let aiInterpretation: InvestigationResult['aiInterpretation'] | undefined;
  let aiReasoningAvailable = false;
  try {
    const groqResult = await generateContextualReasoning({
      inputType,
      riskScore: scoringResult.riskScore,
      riskLevel: scoringResult.riskLevel,
      confidence: scoringResult.confidence,
      exposureState,
      signals: allSignals,
      correlations: correlationResult.correlations,
      verificationBoundary: scoringResult.verificationBoundary,
      decisionTrace: scoringResult.decisionTrace,
    });

    if (groqResult && groqResult.interpretation) {
      aiInterpretation = {
        summary: groqResult.interpretation.summary,
        contextualExplanation: groqResult.interpretation.contextualExplanation,
        attackPathWording: groqResult.interpretation.attackPathWording,
        defensiveActions: groqResult.interpretation.defensiveActions,
      };
      aiReasoningAvailable = true;
    }
  } catch (error) {
    // Groq failure is non-critical - continue with deterministic analysis
    console.warn('Groq contextual reasoning failed:', error);
  }

  // Build final result
  const result: InvestigationResult = {
    id: investigationId,
    timestamp,
    inputType,
    originalInput,
    normalizedInput: normalizedText,
    signals: allSignals,
    correlations: correlationResult.correlations,
    riskLevel: scoringResult.riskLevel,
    riskScore: scoringResult.riskScore,
    confidence: scoringResult.confidence,
    exposureState,
    evidenceLedger,
    evidenceGraph: scoringResult.evidenceGraph,
    verificationBoundary: scoringResult.verificationBoundary,
    decisionTrace: scoringResult.decisionTrace,
    attackPath,
    recommendedActions,
    falsePositiveConsiderations,
    whatWouldChange: scoringResult.whatWouldChange,
    urlAnalysis,
    qrDetails,
    deterministicBreakdown: scoringResult.deterministicBreakdown,
    aiInterpretation,
    aiReasoningStatus: {
      available: aiReasoningAvailable,
    },
    analyzedInputsSummary: {
      hasMessage,
      hasUrl,
      hasScreenshot,
      hasQr,
    },
    memoryStatus: {
      available: false, // Will be set by server
    },
  };

  return result;
}

/**
 * Build attack path dynamically from evidence
 */
function buildAttackPath(
  signals: Signal[],
  correlations: CorrelationPattern[],
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): AttackPathStep[] {
  const path: AttackPathStep[] = [];
  let stepNum = 1;

  // Step 1: User receives communication
  path.push({
    stepNumber: stepNum++,
    label: 'USER RECEIVES COMMUNICATION',
    description: 'Message or artifact was delivered via digital channel.',
    isPossibleOnly: false,
    status: 'observed',
  });

  // Step 2: Social engineering / urgency
  const hasUrgency = signals.some(s => s.category === 'urgency_coercion');
  const hasImpersonation = signals.some(s => s.category === 'identity_impersonation');
  
  if (hasUrgency || hasImpersonation) {
    path.push({
      stepNumber: stepNum++,
      label: 'SOCIAL ENGINEERING / URGENCY',
      description: hasUrgency 
        ? 'Communication employs time pressure to motivate rapid action.'
        : 'Communication claims false authority to manipulate target.',
      isPossibleOnly: false,
      status: 'observed',
    });
  }

  // Step 3: Requested action
  const hasCredential = signals.some(s => s.category === 'credential_targeting');
  const hasOtp = signals.some(s => s.category === 'authentication_targeting');
  const hasPayment = signals.some(s => s.category === 'payment_targeting');
  const hasDownload = signals.some(s => s.name === 'download_request');
  const hasPermission = signals.some(s => s.name === 'permission_grant_request');

  if (hasCredential || hasOtp || hasPayment || hasDownload || hasPermission) {
    path.push({
      stepNumber: stepNum++,
      label: 'REQUESTED ACTION',
      description: 'User is prompted to provide sensitive information, credentials, or perform an action.',
      isPossibleOnly: false,
      status: 'observed',
    });

    // Step 4: Possible data capture
    if (hasCredential || hasOtp || hasPayment) {
      path.push({
        stepNumber: stepNum++,
        label: 'POSSIBLE DATA CAPTURE',
        description: 'In an adversarial scenario, submitted information would be intercepted by the attacker.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    // Step 5: Possible consequences
    if (hasCredential || hasOtp) {
      path.push({
        stepNumber: stepNum++,
        label: 'POSSIBLE ACCOUNT COMPROMISE',
        description: 'Captured credentials or authentication codes could enable unauthorized account access.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    if (hasPayment) {
      path.push({
        stepNumber: stepNum++,
        label: 'POSSIBLE FINANCIAL LOSS',
        description: 'Submitted payment information could be used for unauthorized transactions.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    if (hasDownload) {
      path.push({
        stepNumber: stepNum++,
        label: 'POSSIBLE DEVICE COMPROMISE',
        description: 'Executed files could install persistent malware or surveillance tools.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }

    if (hasPermission) {
      path.push({
        stepNumber: stepNum++,
        label: 'POSSIBLE PERSISTENT ACCESS',
        description: 'Granted permissions could enable ongoing device access or data exfiltration.',
        isPossibleOnly: true,
        status: 'possible',
      });
    }
  }

  return path;
}

/**
 * Build recommended actions based on evidence
 */
function buildRecommendedActions(
  signals: Signal[],
  correlations: CorrelationPattern[],
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  const hasCredential = signals.some(s => s.category === 'credential_targeting');
  const hasOtp = signals.some(s => s.category === 'authentication_targeting');
  const hasPayment = signals.some(s => s.category === 'payment_targeting');
  const hasDownload = signals.some(s => s.name === 'download_request');
  const hasImpersonation = signals.some(s => s.category === 'identity_impersonation');
  const hasPermission = signals.some(s => s.name === 'permission_grant_request');

  if (hasCredential) {
    actions.push({
      action: 'Do not provide passwords, passcodes, or login credentials.',
      priority: 'IMMEDIATE',
      context: 'Credential harvesting is a primary objective of phishing attacks.',
    });
  }

  if (hasOtp) {
    actions.push({
      action: 'Never share one-time passwords, verification codes, or 2FA tokens.',
      priority: 'IMMEDIATE',
      context: 'Legitimate organizations never request OTPs through inbound communications.',
    });
  }

  if (hasPayment) {
    actions.push({
      action: 'Do not provide payment information, card numbers, or transfer funds.',
      priority: 'IMMEDIATE',
      context: 'Financial fraud is a common objective of social engineering attacks.',
    });
  }

  if (hasDownload) {
    actions.push({
      action: 'Do not download, open, or execute files from unverified sources.',
      priority: 'IMMEDIATE',
      context: 'Malicious files can compromise device security and data.',
    });
  }

  if (hasPermission) {
    actions.push({
      action: 'Do not grant system permissions or install configuration profiles.',
      priority: 'IMMEDIATE',
      context: 'Permission requests can grant persistent device access.',
    });
  }

  if (hasImpersonation) {
    actions.push({
      action: 'Verify the sender through official channels independently.',
      priority: 'HIGH',
      context: 'Contact the organization directly using verified contact information.',
    });
  }

  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    actions.push({
      action: 'Navigate directly to the official service website or mobile app.',
      priority: 'HIGH',
      context: 'Bypasses any potential lookalike or redirected link.',
    });
  }

  if (riskLevel === 'LOW') {
    actions.push({
      action: 'Verify with the sender if this message was unexpected.',
      priority: 'STANDARD',
      context: 'Routine digital hygiene precaution.',
    });
  }

  return actions;
}

/**
 * Build false positive considerations
 */
function buildFalsePositiveConsiderations(
  signals: Signal[],
  benignContext: { isBenign: boolean; rationale: string },
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): string[] {
  const considerations: string[] = [];

  if (benignContext.isBenign) {
    considerations.push(benignContext.rationale);
  }

  if (signals.some(s => s.category === 'credential_targeting')) {
    considerations.push('If you recently initiated a password reset or account verification, this could be a related notification.');
  }

  if (signals.some(s => s.category === 'urgency_coercion')) {
    considerations.push('Legitimate organizations may use urgent language for time-sensitive notifications.');
  }

  if (riskLevel === 'LOW') {
    considerations.push('Communication appears to be an expected peer-to-peer or workplace message.');
  }

  return considerations;
}

/**
 * Build investigation summary
 */
function buildSummary(
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  signals: Signal[],
  correlations: CorrelationPattern[]
): string {
  const signalCount = signals.length;
  const correlationCount = correlations.length;

  if (riskLevel === 'LOW') {
    return `Grounded examination found no immediate high-risk coercive indicators in the provided artifact. ${signalCount} signal(s) detected with no significant correlation patterns.`;
  }

  if (riskLevel === 'MEDIUM') {
    if (correlationCount > 0) {
      return `Structural indicators requiring caution were detected. These indicators alone do not establish that the destination is malicious. ${signalCount} evidence indicators and ${correlationCount} correlation pattern(s) identified based strictly on the provided artifact.`;
    }
    return `Structural indicators requiring caution were detected. These indicators alone do not establish that the destination is malicious. ${signalCount} evidence indicators identified based strictly on the provided artifact.`;
  }

  if (correlationCount > 0) {
    return `Analysis identified ${signalCount} evidence indicators and ${correlationCount} correlation pattern(s) requiring scrutiny based strictly on the provided artifact.`;
  }

  return `Analysis identified ${signalCount} evidence indicators requiring scrutiny based strictly on the provided artifact.`;
}
