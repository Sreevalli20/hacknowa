import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeUrlStructure } from './src/utils/urlAnalyzer.ts';
import { calculateDeterministicRisk } from './src/utils/scoring.ts';
import { analyzeMessage } from './src/utils/messageAnalyzer.ts';
import { extractTextFromBase64 } from './src/utils/ocr.ts';
import { initializeBreethMemory, storeInvestigation, getBreethStatus } from './src/utils/breethMemory.ts';
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

// Initialize Breeth memory (optional, graceful degradation)
const breethStatus = initializeBreethMemory();
if (breethStatus.available) {
  console.log('Breeth memory service initialized');
} else {
  console.log('Breeth memory service unavailable (operating without external memory)');
}

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

    // Analyze message text (or text extracted from screenshot/QR)
    let textToAnalyze = messageText || '';
    
    // Attempt OCR on screenshot if provided
    if (hasScreenshot && screenshotBase64) {
      const ocrResult = await extractTextFromBase64(screenshotBase64.data);
      if (ocrResult.success && ocrResult.text) {
        textToAnalyze += (textToAnalyze ? '\n\n' : '') + ocrResult.text;
      }
    }

    // Add QR decoded text if available
    if (qrDecodedText) {
      textToAnalyze += (textToAnalyze ? '\n\n' : '') + qrDecodedText;
    }

    // Run deterministic message analysis
    const messageAnalysis = analyzeMessage(textToAnalyze);

    // Merge URL structural flags into evidence ledger
    if (urlAnalysis && urlAnalysis.structuralFlags.length > 0) {
      for (const flag of urlAnalysis.structuralFlags) {
        messageAnalysis.evidenceLedger.push({
          id: `ev-url-${messageAnalysis.evidenceLedger.length + 1}`,
          finding: `Local URL Structural Flag: ${flag.name}`,
          evidence: flag.details,
          type: 'OBSERVED',
          confidence: flag.severity === 'critical' || flag.severity === 'high' ? 'HIGH' : 'MEDIUM',
          signalCategory: 'url_anomaly',
        });
        messageAnalysis.observed.push(`URL structural analysis detected: ${flag.name}`);
      }
    }

    // Run deterministic risk scoring
    const deterministicBreakdown = calculateDeterministicRisk(messageAnalysis.evidenceLedger, urlAnalysis);

    // Build result
    const result: InvestigationResult = {
      riskLevel: deterministicBreakdown.riskLevel,
      riskScore: deterministicBreakdown.normalizedScore,
      summary: messageAnalysis.evidenceLedger.length > 0
        ? `Analysis identified ${messageAnalysis.evidenceLedger.length} evidence indicators requiring scrutiny based strictly on the provided artifact.`
        : 'Grounded examination found no immediate high-risk coercive indicators in the provided artifact.',
      observed: messageAnalysis.observed,
      inferred: messageAnalysis.inferred,
      notVerified: messageAnalysis.notVerified,
      recommendedActions: messageAnalysis.recommendedActions,
      falsePositiveConsiderations: messageAnalysis.falsePositiveConsiderations,
      evidenceLedger: messageAnalysis.evidenceLedger,
      attackPath: messageAnalysis.attackPath,
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
      memoryStatus: getBreethStatus(),
    };

    // Store in Breeth memory if available (non-blocking)
    if (breethStatus.available) {
      const ruleIds = messageAnalysis.evidenceLedger.map(e => e.id);
      const urlFindings = urlAnalysis?.structuralFlags.map(f => f.name) || [];
      
      storeInvestigation({
        timestamp: result.timestamp,
        inputType: hasScreenshot ? 'screenshot' : hasQr ? 'qr' : hasUrl ? 'url' : 'message',
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        ruleIds,
        urlFindings,
        summary: result.summary,
      }).catch((err) => {
        console.warn('Failed to store investigation in Breeth memory:', err);
      });
    }

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

    const plan: EmergencyPlanResponse = {
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
