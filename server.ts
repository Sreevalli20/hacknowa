import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { analyzeUrlStructure } from './src/utils/urlAnalyzer.ts';
import { calculateDeterministicRisk } from './src/utils/scoring.ts';
import { dbService } from './src/server/db.ts';
import {
  EvidenceItem,
  AttackPathStep,
  RecommendedAction,
  InvestigationResult,
  URLStructuralAnalysis,
  EmergencyPlanResponse,
  EmergencyActionItem,
} from './src/types/investigation.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Auth middleware
function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const user = dbService.getUserBySession(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  (req as any).user = user;
  (req as any).sessionToken = token;
  next();
}

function optionalAuth(req: Request, _res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    const user = dbService.getUserBySession(token);
    if (user) {
      (req as any).user = user;
      (req as any).sessionToken = token;
    }
  }
  next();
}

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ======================== HEALTH ENDPOINT ========================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ======================== AUTHENTICATION API ========================

// 1. Sign Up
app.post('/api/auth/signup', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const user = dbService.createUser(email, name, password);
    const token = dbService.createSession(user.id);

    const { passwordHash, passwordSalt, ...sanitized } = user;
    res.json({ user: sanitized, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create account.' });
  }
});

// 2. Log In
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = dbService.verifyUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = dbService.createSession(user.id);
    const { passwordHash, passwordSalt, ...sanitized } = user;
    res.json({ user: sanitized, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// 3. Current User
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { passwordHash, passwordSalt, ...sanitized } = user;
  res.json({ user: sanitized });
});

// 4. Log Out
app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  dbService.removeSession(token);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 5. Update Settings
app.put('/api/auth/settings', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { autoSaveReports, defaultInputTab, theme } = req.body;
    const updated = dbService.updateUserSettings(user.id, {
      ...(autoSaveReports !== undefined && { autoSaveReports }),
      ...(defaultInputTab && { defaultInputTab }),
      ...(theme && { theme }),
    });
    const { passwordHash, passwordSalt, ...sanitized } = updated;
    res.json({ user: sanitized });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update settings.' });
  }
});

// ======================== SAVED REPORTS API ========================

// Get all reports for authenticated user
app.get('/api/reports', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const reports = dbService.getUserReports(user.id);
  res.json({ reports });
});

// Save a report
app.post('/api/reports', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { result, title, notes, tags } = req.body;
    if (!result) {
      res.status(400).json({ error: 'Investigation result object is required.' });
      return;
    }

    const saved = dbService.saveReport(user.id, result, title, notes, tags);
    res.json({ report: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save report.' });
  }
});

// Get single report
app.get('/api/reports/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const report = dbService.getReportById(req.params.id, user.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }
  res.json({ report });
});

// Update report metadata
app.put('/api/reports/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, notes, tags, status } = req.body;
    const updated = dbService.updateReport(req.params.id, user.id, { title, notes, tags, status });
    res.json({ report: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update report.' });
  }
});

// Delete report
app.delete('/api/reports/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  dbService.deleteReport(req.params.id, user.id);
  res.json({ success: true, message: 'Report deleted successfully.' });
});

interface InvestigateRequestBody {
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
}

/**
 * Deterministic local extractor when analyzing message strings and URLs.
 * Extracts quotes and identifies grounded indicators directly from user text.
 */
function extractLocalTextEvidence(
  messageText: string,
  urlAnalysis?: URLStructuralAnalysis
): {
  observed: string[];
  inferred: string[];
  evidenceLedger: EvidenceItem[];
  attackPath: AttackPathStep[];
  recommendedActions: RecommendedAction[];
  falsePositiveConsiderations: string[];
} {
  const observed: string[] = [];
  const inferred: string[] = [];
  const evidenceLedger: EvidenceItem[] = [];
  const recommendedActions: RecommendedAction[] = [];
  const falsePositiveConsiderations: string[] = [];
  let itemCounter = 1;

  const lower = messageText.toLowerCase();

  // Urgency check
  const urgencyRegex = /(urgent|immediately|within \d+ (minutes|hours|mins)|suspended|locked|unauthorized|unusual sign-in|action required|expire)/i;
  const urgencyMatch = messageText.match(urgencyRegex);
  if (urgencyMatch) {
    observed.push(`Message conveys urgency: "${urgencyMatch[0]}"`);
    inferred.push('Artificial time-pressure is commonly utilized to bypass deliberate critical evaluation.');
    evidenceLedger.push({
      id: `ev-${itemCounter++}`,
      finding: 'Artificial Urgency / Time-Pressure Framing',
      evidence: urgencyMatch[0],
      type: 'OBSERVED',
      confidence: 'HIGH',
      signalCategory: 'urgency',
    });
  }

  // Credential check
  const credRegex = /(password|passcode|verify (identity|credentials|account)|sign-in|log in|confirm your identity|credentials)/i;
  const credMatch = messageText.match(credRegex);
  if (credMatch) {
    observed.push(`Message requests user to verify credentials: "${credMatch[0]}"`);
    inferred.push('Creates a high-probability credential harvesting vector if directed to an unverified domain.');
    evidenceLedger.push({
      id: `ev-${itemCounter++}`,
      finding: 'Credential or Identity Verification Solicitation',
      evidence: credMatch[0],
      type: 'OBSERVED',
      confidence: 'HIGH',
      signalCategory: 'credential',
    });
  }

  // OTP / 2FA check
  const otpRegex = /(otp|one-time password|authenticator code|2fa code|verification code|security code)/i;
  const otpMatch = messageText.match(otpRegex);
  if (otpMatch) {
    observed.push(`Message explicitly solicits an authentication code: "${otpMatch[0]}"`);
    inferred.push('Requesting multi-factor codes enables unauthorized session hijacking and bypass of account protections.');
    evidenceLedger.push({
      id: `ev-${itemCounter++}`,
      finding: 'Multi-Factor / OTP Interception Request',
      evidence: otpMatch[0],
      type: 'OBSERVED',
      confidence: 'HIGH',
      signalCategory: 'otp',
    });
  }

  // Financial / Payment check
  const payRegex = /(billing|payment|credit card|cvv|bank transfer|unpaid toll|wire funds|crypto|usdt|airdrop)/i;
  const payMatch = messageText.match(payRegex);
  if (payMatch) {
    observed.push(`Message mentions financial or monetary transfer: "${payMatch[0]}"`);
    inferred.push('Potential unauthorized transaction or monetary transfer solicitation.');
    evidenceLedger.push({
      id: `ev-${itemCounter++}`,
      finding: 'Financial / Payment Information Request',
      evidence: payMatch[0],
      type: 'OBSERVED',
      confidence: 'HIGH',
      signalCategory: 'payment',
    });
  }

  // Brand impersonation heuristic in message
  const brandRegex = /(chase|wellsfargo|bank of america|citibank|apple|microsoft|google|amazon|netflix|paypal)/i;
  const brandMatch = messageText.match(brandRegex);
  if (brandMatch) {
    observed.push(`Message claims affiliation with brand: "${brandMatch[0]}"`);
    inferred.push(`Sender claims to represent ${brandMatch[0]}, requiring authentication via secondary out-of-band channels.`);
    evidenceLedger.push({
      id: `ev-${itemCounter++}`,
      finding: `Organization / Brand Reference (${brandMatch[0]})`,
      evidence: brandMatch[0],
      type: 'OBSERVED',
      confidence: 'MEDIUM',
      signalCategory: 'impersonation',
    });
  }

  // If URL analysis is present, append its direct findings
  if (urlAnalysis && urlAnalysis.isValidUrl) {
    observed.push(`URL destination points to host: ${urlAnalysis.hostname} (Protocol: ${urlAnalysis.protocol})`);
    if (urlAnalysis.isIpAddress) {
      observed.push(`Destination uses a bare numerical IP address (${urlAnalysis.hostname}) without domain registration.`);
      inferred.push('Bare IP hosts avoid domain registrar reputation tracking and are atypical for legitimate enterprise communications.');
    }
    if (urlAnalysis.subdomainDepth >= 3) {
      observed.push(`URL exhibits deep subdomain nesting (${urlAnalysis.subdomainDepth} levels).`);
      inferred.push('Deep subdomain hierarchies can be used to disguise the authoritative root domain.');
    }
  }

  // If no negative signals were found
  if (evidenceLedger.length === 0) {
    observed.push('No coercive urgency, credential demands, or malicious indicators detected in text.');
    inferred.push('Communication structure is consistent with normal, non-coercive exchanges.');
    falsePositiveConsiderations.push('Communication appears to be an expected peer-to-peer or workplace communication.');
    recommendedActions.push({
      action: 'Verify with the sender if this message was unexpected.',
      priority: 'STANDARD',
      context: 'Routine digital hygiene precaution.',
    });
  } else {
    // Generate prioritized actions based on evidence
    if (credMatch || (urlAnalysis && urlAnalysis.credentialPathIndicators.length > 0)) {
      recommendedActions.push({
        action: 'Do not submit usernames, passwords, or PINs on this page.',
        priority: 'IMMEDIATE',
        context: 'Direct credential harvesting risk detected.',
      });
    }
    if (otpMatch) {
      recommendedActions.push({
        action: 'Never disclose one-time passwords or 2FA push notifications to inbound callers or messages.',
        priority: 'IMMEDIATE',
        context: 'Legitimate organizations never solicit OTPs out-of-band.',
      });
    }
    recommendedActions.push({
      action: 'Navigate directly to the official service website or mobile app independently.',
      priority: 'HIGH',
      context: 'Bypasses any potential lookalike or redirected link.',
    });
    falsePositiveConsiderations.push('If you initiated a recent password reset or account verification, this could be a related notification.');
  }

  // Construct attack path
  const attackPath: AttackPathStep[] = [
    {
      stepNumber: 1,
      label: 'USER RECEIVES COMMUNICATION',
      description: 'Artifact was delivered via SMS, messaging platform, or email.',
      isPossibleOnly: false,
      status: 'observed',
    },
  ];

  if (urgencyMatch || brandMatch) {
    attackPath.push({
      stepNumber: 2,
      label: 'URGENCY / SOCIAL ENGINEERING',
      description: 'Communication leverages time pressure or trusted brand authority to motivate rapid action.',
      isPossibleOnly: false,
      status: 'observed',
    });
  }

  if (credMatch || payMatch || (urlAnalysis && urlAnalysis.isValidUrl)) {
    attackPath.push({
      stepNumber: attackPath.length + 1,
      label: 'REQUESTED ACTION',
      description: 'User is prompted to navigate to link, input details, or approve verification.',
      isPossibleOnly: false,
      status: 'observed',
    });

    attackPath.push({
      stepNumber: attackPath.length + 1,
      label: 'POSSIBLE CREDENTIAL / DATA CAPTURE',
      description: 'In an adversarial scenario, entered data would be intercepted by the host operator.',
      isPossibleOnly: true,
      status: 'possible',
    });

    attackPath.push({
      stepNumber: attackPath.length + 1,
      label: 'POSSIBLE ACCOUNT COMPROMISE',
      description: 'Captured credentials could subsequently be used to attempt unauthorized account access.',
      isPossibleOnly: true,
      status: 'possible',
    });
  }

  return {
    observed,
    inferred,
    evidenceLedger,
    attackPath,
    recommendedActions,
    falsePositiveConsiderations,
  };
}

app.post('/api/investigate', async (req: Request<{}, {}, InvestigateRequestBody>, res: Response) => {
  try {
    const {
      messageText,
      urlText,
      screenshotBase64,
      qrScreenshotBase64,
      qrDecodedText,
    } = req.body;

    const hasMessage = Boolean(messageText && messageText.trim().length > 0);
    const hasUrl = Boolean(urlText && urlText.trim().length > 0);
    const hasScreenshot = Boolean(screenshotBase64 && screenshotBase64.data);
    const hasQr = Boolean(qrScreenshotBase64 && qrScreenshotBase64.data || qrDecodedText);

    if (!hasMessage && !hasUrl && !hasScreenshot && !hasQr) {
      res.status(400).json({ error: 'Please provide at least one input: a message, a URL, a screenshot, or a QR code.' });
      return;
    }

    // Determine target URL to analyze structurally
    let effectiveUrl = urlText?.trim() || '';
    if (!effectiveUrl && qrDecodedText && /^https?:\/\//i.test(qrDecodedText.trim())) {
      effectiveUrl = qrDecodedText.trim();
    }

    let urlAnalysis: URLStructuralAnalysis | undefined;
    if (effectiveUrl) {
      urlAnalysis = analyzeUrlStructure(effectiveUrl);
    }

    let parsedData: any = null;
    let geminiError: string | null = null;

    // Attempt Gemini reasoning with a fast timeout race
    try {
      const parts: any[] = [];
      const systemPrompt = `You are TRACEZERO, an expert digital safety and cybersecurity evidence investigator.
Your core principle is GROUNDED EVIDENCE ANALYSIS with ZERO FABRICATION:
1. You analyze ONLY the concrete information provided in the input (text, URL structure, image contents).
2. NEVER invent domain registration age, WHOIS ownership, external malware scan results, blacklists, or reputation scores.
3. If any aspect cannot be definitively established from the provided input alone, explicitly label it in "notVerified".
4. Distinguish OBSERVED facts (direct visible text, explicit link, exact image element) from INFERRED deductions.
5. In the attack path, only include steps supported by the evidence, and explicitly mark unconfirmed subsequent attack phases with "POSSIBLE".
6. Never state that an account is compromised or malware is executed unless the evidence shows direct confirmation.
7. Return clean JSON adhering to the specified schema.`;

      let userPromptText = `Please conduct an in-depth, evidence-grounded security investigation of the following user-supplied artifact(s):\n\n`;

      if (hasMessage) {
        userPromptText += `[MESSAGE INPUT]:\n"""${messageText}"""\n\n`;
      }
      if (hasUrl) {
        userPromptText += `[URL INPUT]:\n"""${urlText}"""\n\n`;
      }
      if (effectiveUrl && urlAnalysis) {
        userPromptText += `[DETERMINISTIC LOCAL URL ANALYSIS FINDINGS]:
- Valid URL: ${urlAnalysis.isValidUrl}
- Protocol: ${urlAnalysis.protocol}
- Hostname: ${urlAnalysis.hostname}
- Is IP Address Host: ${urlAnalysis.isIpAddress}
- Subdomains: ${urlAnalysis.subdomains.join(', ') || 'None'} (Depth: ${urlAnalysis.subdomainDepth})
- Has Punycode / IDN: ${urlAnalysis.hasPunycode}
- Detected Suspicious Keywords: ${urlAnalysis.detectedSuspiciousKeywords.join(', ') || 'None'}
- Credential Paths: ${urlAnalysis.credentialPathIndicators.join(', ') || 'None'}
- Download Extensions: ${urlAnalysis.downloadIndicators.join(', ') || 'None'}
- Structural Anomaly Flags: ${urlAnalysis.structuralFlags.map((f) => `[${f.severity.toUpperCase()}] ${f.name}: ${f.details}`).join('; ') || 'None'}
\n`;
      }
      if (qrDecodedText) {
        userPromptText += `[QR CODE DECODED VALUE]:\n"""${qrDecodedText}"""\n\n`;
      }
      if (hasScreenshot) {
        userPromptText += `[SCREENSHOT ATTACHMENT INCLUDED]: Please examine the attached image for visible text, branding/logos, fake UI elements, urgency cues, login forms, or permission dialogs.\n\n`;
      }

      parts.push({ text: userPromptText });

      if (hasScreenshot && screenshotBase64) {
        parts.push({
          inlineData: {
            mimeType: screenshotBase64.mimeType || 'image/png',
            data: screenshotBase64.data,
          },
        });
      }

      if (qrScreenshotBase64 && qrScreenshotBase64.data) {
        parts.push({
          inlineData: {
            mimeType: qrScreenshotBase64.mimeType || 'image/png',
            data: qrScreenshotBase64.data,
          },
        });
      }

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              observed: { type: Type.ARRAY, items: { type: Type.STRING } },
              inferred: { type: Type.ARRAY, items: { type: Type.STRING } },
              notVerified: { type: Type.ARRAY, items: { type: Type.STRING } },
              evidenceLedger: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    finding: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['OBSERVED', 'INFERRED', 'UNKNOWN'] },
                    confidence: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                    signalCategory: {
                      type: Type.STRING,
                      enum: ['credential', 'urgency', 'otp', 'payment', 'url_anomaly', 'malware', 'impersonation', 'permission', 'neutral'],
                    },
                  },
                  required: ['finding', 'evidence', 'type', 'confidence'],
                },
              },
              attackPath: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    isPossibleOnly: { type: Type.BOOLEAN },
                    status: { type: Type.STRING, enum: ['observed', 'possible'] },
                  },
                  required: ['stepNumber', 'label', 'description', 'isPossibleOnly', 'status'],
                },
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['IMMEDIATE', 'HIGH', 'STANDARD'] },
                    context: { type: Type.STRING },
                  },
                  required: ['action', 'priority', 'context'],
                },
              },
              falsePositiveConsiderations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'summary',
              'observed',
              'inferred',
              'notVerified',
              'evidenceLedger',
              'attackPath',
              'recommendedActions',
              'falsePositiveConsiderations',
            ],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout (proceeding with local engine)')), 4500)
      );

      const geminiResponse = await Promise.race([geminiPromise, timeoutPromise]);

      if (geminiResponse.text) {
        parsedData = JSON.parse(geminiResponse.text);
      }
    } catch (err: any) {
      console.warn('Gemini generateContent note (fallback to local deterministic evidence extraction):', err?.message);
      geminiError = err?.message;
    }

    // If Gemini was unavailable or errored out, use our deterministic local evidence extractor
    if (!parsedData) {
      const fallback = extractLocalTextEvidence(messageText || effectiveUrl || (qrDecodedText || ''), urlAnalysis);
      parsedData = {
        summary: fallback.evidenceLedger.length > 0
          ? `Analysis identified ${fallback.evidenceLedger.length} evidence indicators requiring scrutiny based strictly on the provided artifact.`
          : 'Grounded examination found no immediate high-risk coercive indicators in the provided artifact.',
        observed: fallback.observed,
        inferred: fallback.inferred,
        notVerified: [
          'External reputation databases and antivirus scan feeds (not queried).',
          'Domain WHOIS registration history, registrant identity, and creation date (not queried).',
          'Live server response code and remote HTTP payload (not fetched over wire).',
          'Sender telephone number carrier authenticity and cellular routing path (not verifiable from text alone).'
        ],
        evidenceLedger: fallback.evidenceLedger,
        attackPath: fallback.attackPath,
        recommendedActions: fallback.recommendedActions,
        falsePositiveConsiderations: fallback.falsePositiveConsiderations,
      };
    }

    // Clean and validate evidence items
    const evidenceLedger: EvidenceItem[] = (parsedData.evidenceLedger || []).map(
      (item: any, idx: number): EvidenceItem => ({
        id: `ev-${idx + 1}`,
        finding: item.finding || 'Unspecified finding',
        evidence: item.evidence || 'Direct input artifact',
        type: item.type === 'INFERRED' ? 'INFERRED' : item.type === 'UNKNOWN' ? 'UNKNOWN' : 'OBSERVED',
        confidence: item.confidence === 'LOW' ? 'LOW' : item.confidence === 'MEDIUM' ? 'MEDIUM' : 'HIGH',
        signalCategory: item.signalCategory || 'neutral',
      })
    );

    // If local URL analysis detected structural flags, inject them into evidence ledger
    if (urlAnalysis && urlAnalysis.structuralFlags.length > 0) {
      for (const flag of urlAnalysis.structuralFlags) {
        evidenceLedger.push({
          id: `ev-url-${evidenceLedger.length + 1}`,
          finding: `Local URL Structural Flag: ${flag.name}`,
          evidence: flag.details,
          type: 'OBSERVED',
          confidence: 'HIGH',
          signalCategory: 'url_anomaly',
        });
      }
    }

    // Ensure standard unverified boundaries
    const notVerifiedSet = new Set<string>(parsedData.notVerified || []);
    notVerifiedSet.add('Domain WHOIS registration records and registrant identity (external registry not queried).');
    notVerifiedSet.add('External threat intelligence reputation feeds and antivirus scanner verdicts.');
    notVerifiedSet.add('Carrier-level SMS sender spoofing verification or cellular routing path.');
    if (effectiveUrl) {
      notVerifiedSet.add('Live web server contents and dynamic payload delivery (URL was not executed over the wire).');
    }

    // Run deterministic risk scoring engine
    const deterministicBreakdown = calculateDeterministicRisk(evidenceLedger, urlAnalysis);

    const attackPath: AttackPathStep[] = (parsedData.attackPath || []).map(
      (step: any, idx: number): AttackPathStep => ({
        stepNumber: step.stepNumber || idx + 1,
        label: step.label || `Phase ${idx + 1}`,
        description: step.description || '',
        isPossibleOnly: step.isPossibleOnly ?? (idx >= 2),
        status: step.isPossibleOnly ? 'possible' : (step.status || 'observed'),
      })
    );

    const recommendedActions: RecommendedAction[] = (parsedData.recommendedActions || []).map(
      (act: any): RecommendedAction => ({
        action: act.action || 'Do not follow links, scan codes, or enter credentials.',
        priority: act.priority || 'HIGH',
        context: act.context || 'Precautionary digital safety recommendation.',
      })
    );

    const result: InvestigationResult = {
      riskLevel: deterministicBreakdown.riskLevel,
      riskScore: deterministicBreakdown.normalizedScore,
      summary: parsedData.summary || 'Investigation complete. Review the grounded evidence breakdown below.',
      observed: parsedData.observed || [],
      inferred: parsedData.inferred || [],
      notVerified: Array.from(notVerifiedSet),
      recommendedActions,
      falsePositiveConsiderations: parsedData.falsePositiveConsiderations || [],
      evidenceLedger,
      attackPath,
      urlAnalysis,
      qrDetails: qrDecodedText
        ? {
            rawText: qrDecodedText,
            isUrl: /^https?:\/\//i.test(qrDecodedText.trim()),
            extractedLocally: true,
          }
        : undefined,
      deterministicBreakdown,
      analyzedInputsSummary: {
        hasMessage,
        hasUrl,
        hasScreenshot,
        hasQr,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/investigate:', error);
    res.status(500).json({
      error: 'Investigation failed: ' + (error?.message || 'Internal server error while processing evidence.'),
    });
  }
});

// Emergency Plan Incident Containment Endpoint
app.post('/api/emergency-plan', async (req: Request, res: Response) => {
  try {
    const {
      enteredCredentials,
      enteredPayment,
      downloadedAnything,
      grantedPermissions,
      sharedOtp,
      threatSummary,
      riskLevel,
    } = req.body;

    let plan: EmergencyPlanResponse | null = null;

    try {
      const systemPrompt = `You are a Senior Digital Incident Response Specialist for TRACEZERO.
A user has indicated they may have interacted with a suspicious artifact.
CRITICAL COMMUNICATION GUIDELINES:
1. NEVER claim an account is definitely compromised or breached.
2. Use careful, precise language: "Potential exposure", "Possible credential compromise", "Unable to verify compromise from external perspective".
3. Provide immediately actionable, step-by-step mitigation instructions tailored specifically to what they did.
4. Output JSON matching the specified schema.`;

      const userPrompt = `The user completed an emergency triage assessment:
- Did they enter credentials? ${enteredCredentials ? 'YES' : 'NO'}
- Did they enter payment information? ${enteredPayment ? 'YES' : 'NO'}
- Did they download anything? ${downloadedAnything ? 'YES' : 'NO'}
- Did they grant permissions? ${grantedPermissions ? 'YES' : 'NO'}
- Did they share an OTP/2FA code? ${sharedOtp ? 'YES' : 'NO'}
- Prior Investigation Threat Summary: "${threatSummary || 'Suspicious digital artifact'}"
- Assessed Artifact Risk Level: ${riskLevel || 'UNKNOWN'}`;

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exposureAssessment: { type: Type.STRING },
              assessmentTone: {
                type: Type.STRING,
                enum: ['Potential exposure', 'Possible credential compromise', 'Unable to verify compromise'],
              },
              actionItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    stepNumber: { type: Type.INTEGER },
                    timing: {
                      type: Type.STRING,
                      enum: ['IMMEDIATE (0–15 mins)', 'HOUR 1 (15–60 mins)', 'WITHIN 24 HOURS'],
                    },
                    title: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    urgency: { type: Type.STRING, enum: ['critical', 'high', 'medium'] },
                  },
                  required: ['id', 'stepNumber', 'timing', 'title', 'instructions', 'urgency'],
                },
              },
              verificationChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
              evidencePreservationGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
              officialContactAdvice: { type: Type.STRING },
            },
            required: [
              'exposureAssessment',
              'assessmentTone',
              'actionItems',
              'verificationChecklist',
              'evidencePreservationGuide',
              'officialContactAdvice',
            ],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 4500)
      );

      const geminiResponse = await Promise.race([geminiPromise, timeoutPromise]);

      if (geminiResponse.text) {
        plan = JSON.parse(geminiResponse.text);
      }
    } catch (err: any) {
      console.warn('Gemini emergency plan note (using deterministic containment matrix):', err?.message);
    }

    if (!plan) {
      // Deterministic emergency containment plan based strictly on user's triage selections
      const actionItems: EmergencyActionItem[] = [];
      let stepNum = 1;

      if (enteredCredentials) {
        actionItems.push({
          id: `act-${stepNum}`,
          stepNumber: stepNum++,
          timing: 'IMMEDIATE (0–15 mins)',
          title: 'Change Password from Authorized Device',
          instructions: 'Navigate directly to the official platform using a bookmarked URL or trusted mobile app. Change your password immediately and choose "Sign out of all other devices / active sessions".',
          urgency: 'critical',
        });
      }

      if (sharedOtp) {
        actionItems.push({
          id: `act-${stepNum}`,
          stepNumber: stepNum++,
          timing: 'IMMEDIATE (0–15 mins)',
          title: 'Revoke Active Sessions & Contact Support',
          instructions: 'Because an OTP / MFA code was submitted, an adversary may have already initialized a session. Call the service provider directly using their published phone number to revoke active tokens.',
          urgency: 'critical',
        });
      }

      if (enteredPayment) {
        actionItems.push({
          id: `act-${stepNum}`,
          stepNumber: stepNum++,
          timing: 'IMMEDIATE (0–15 mins)',
          title: 'Temporarily Lock Payment Card',
          instructions: 'Open your banking or card issuer mobile app and toggle "Lock Card" or "Freeze Card". Notify the fraud department of potential card number and CVV exposure.',
          urgency: 'critical',
        });
      }

      if (downloadedAnything) {
        actionItems.push({
          id: `act-${stepNum}`,
          stepNumber: stepNum++,
          timing: 'IMMEDIATE (0–15 mins)',
          title: 'Disconnect Network & Do Not Run File',
          instructions: 'Disconnect Wi-Fi / Ethernet immediately. Do not execute or open the downloaded file. Delete it from your Downloads folder and run a full scan with your operating system antimalware tool.',
          urgency: 'high',
        });
      }

      if (grantedPermissions) {
        actionItems.push({
          id: `act-${stepNum}`,
          stepNumber: stepNum++,
          timing: 'HOUR 1 (15–60 mins)',
          title: 'Audit Device Profiles & Installed Extensions',
          instructions: 'Open Device Settings > VPN & Device Management (or browser extensions manager). Remove any newly installed configuration profile, extension, or certificate.',
          urgency: 'high',
        });
      }

      actionItems.push({
        id: `act-${stepNum}`,
        stepNumber: stepNum++,
        timing: 'WITHIN 24 HOURS',
        title: 'Review Account Audit Logs & Recovery Details',
        instructions: 'Check that your account recovery email and phone number were not modified. Review recent login history for unrecognized IP addresses or geographical locations.',
        urgency: 'medium',
      });

      plan = {
        exposureAssessment: enteredCredentials || enteredPayment || sharedOtp
          ? 'Potential exposure: Interaction data suggests sensitive authentication or payment details may have been exposed to an unverified recipient.'
          : 'Unable to verify compromise: Without credential or file execution events, threat surface is primarily limited to metadata observation.',
        assessmentTone: enteredCredentials || sharedOtp
          ? 'Possible credential compromise'
          : 'Potential exposure',
        actionItems,
        verificationChecklist: [
          'Verify that recovery email address and phone number remain unaltered.',
          'Review bank or credit statements for unauthorized pending authorizations.',
          'Confirm multi-factor authentication (MFA) remains configured with your authenticator device.',
          'Audit authorized third-party OAuth apps and integrations.'
        ],
        evidencePreservationGuide: [
          'Take a screenshot of the original SMS, email, or browser history entry.',
          'Note the exact timestamp and recipient address or URL.',
          'Do not forward phishing messages to colleagues without clear warning annotations.'
        ],
        officialContactAdvice: 'Always reach out to the affected organization via official support numbers published on their verified website or on the back of your physical payment card. Never call numbers provided within the suspicious message itself.'
      };
    }

    res.json(plan);
  } catch (error: any) {
    console.error('Error in /api/emergency-plan:', error);
    res.status(500).json({
      error: 'Failed to generate emergency response plan: ' + (error?.message || 'Unknown error'),
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TRACEZERO server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TRACEZERO server:', err);
  process.exit(1);
});
