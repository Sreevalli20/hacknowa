/**
 * OpenRouter API Integration for TRACEZERO
 * Provides contextual reasoning layer for investigation results
 */

export type ProviderStatus = 'NOT_CONFIGURED' | 'AVAILABLE' | 'FAILED' | 'UNAUTHORIZED' | 'RATE_LIMITED';

export interface OpenRouterStatus {
  status: ProviderStatus;
  error?: string;
}

export interface OpenRouterInterpretation {
  summary: string;
  contextualExplanation: string;
  attackPathWording: string[];
  defensiveActions: string[];
}

export interface OpenRouterVisionResult {
  visibleText: string;
  visibleUrls: string[];
  visibleDomains: string[];
  visibleButtons: string[];
  credentialFields: boolean;
  paymentIndicators: boolean;
  urgencyIndicators: boolean;
  analysis: string;
}

let openRouterStatus: ProviderStatus = 'NOT_CONFIGURED';
let openRouterInitialized: boolean = false;

/**
 * Initialize OpenRouter API client if API key is available.
 * Performs a real API test to determine actual status.
 */
export async function initializeOpenRouter(): Promise<OpenRouterStatus> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    openRouterStatus = 'NOT_CONFIGURED';
    openRouterInitialized = true;
    return { status: 'NOT_CONFIGURED', error: 'OPENROUTER_API_KEY not configured' };
  }

  try {
    // Perform a real API test request
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.status === 401) {
      openRouterStatus = 'UNAUTHORIZED';
      openRouterInitialized = true;
      return { status: 'UNAUTHORIZED', error: 'Invalid API key' };
    }

    if (response.status === 429) {
      openRouterStatus = 'RATE_LIMITED';
      openRouterInitialized = true;
      return { status: 'RATE_LIMITED', error: 'Rate limited' };
    }

    if (!response.ok) {
      openRouterStatus = 'FAILED';
      openRouterInitialized = true;
      return { status: 'FAILED', error: `API test failed with status ${response.status}` };
    }

    openRouterStatus = 'AVAILABLE';
    openRouterInitialized = true;
    return { status: 'AVAILABLE' };
  } catch (error) {
    openRouterStatus = 'FAILED';
    openRouterInitialized = true;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'FAILED', error: errorMessage };
  }
}

/**
 * Get OpenRouter status
 */
export function getOpenRouterStatus(): OpenRouterStatus {
  return { status: openRouterStatus };
}

/**
 * Generate contextual reasoning using OpenRouter API
 * Returns null if OpenRouter is unavailable or request fails
 */
export async function generateContextualReasoning(
  investigation: {
    inputType: string;
    riskScore: number;
    riskLevel: string;
    confidence: string;
    exposureState: string;
    signals: Array<{ name: string; evidence: string; category: string; severity: string }>;
    correlations: Array<{ name: string; description: string; interpretation: string }>;
    verificationBoundary: { observed: string[]; inferred: string[]; notVerified: string[] };
    decisionTrace: Array<{ signal: string; contribution: number; rationale: string }>;
  }
): Promise<{ interpretation: OpenRouterInterpretation; error?: string } | null> {
  if (openRouterStatus !== 'AVAILABLE') {
    return null;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Build the investigation object for OpenRouter
    const investigationObject = {
      inputType: investigation.inputType,
      riskScore: investigation.riskScore,
      riskLevel: investigation.riskLevel,
      confidence: investigation.confidence,
      exposureState: investigation.exposureState,
      signals: investigation.signals.map(s => ({
        name: s.name,
        evidence: s.evidence,
        category: s.category,
        severity: s.severity,
      })),
      correlations: investigation.correlations.map(c => ({
        name: c.name,
        description: c.description,
        interpretation: c.interpretation,
      })),
      verificationBoundary: investigation.verificationBoundary,
      decisionTrace: investigation.decisionTrace.map(d => ({
        signal: d.signal,
        contribution: d.contribution,
        rationale: d.rationale,
      })),
    };

    const systemPrompt = `You are the contextual reasoning layer for TRACEZERO.

Use ONLY the evidence supplied in the investigation object.

Never invent external facts.
Never claim to have browsed a URL.
Never claim to have checked WHOIS, DNS, reputation feeds, malware databases, or blacklists.
Never override the deterministic risk score.
Clearly separate observed evidence from inference.
If evidence is insufficient, explicitly say so.

Provide a structured JSON response with these fields:
- summary: A concise 1-2 sentence summary of the investigation findings
- contextualExplanation: A brief explanation of what the evidence suggests, staying strictly within the provided data
- attackPathWording: An array of 2-4 short phrases describing possible attack progression (if applicable)
- defensiveActions: An array of 2-4 specific defensive recommendations based on the evidence

Keep responses concise and actionable. Do not hallucinate threat intelligence or external verification results.`;

    const userPrompt = JSON.stringify(investigationObject, null, 2);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tracezero.ai',
        'X-Title': 'TRACEZERO',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (response.status === 401) {
      openRouterStatus = 'UNAUTHORIZED';
      return null;
    }

    if (response.status === 429) {
      openRouterStatus = 'RATE_LIMITED';
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('OpenRouter API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('OpenRouter API returned empty response');
      return null;
    }

    // Parse the JSON response
    let parsed: OpenRouterInterpretation;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse OpenRouter response as JSON:', error);
      return null;
    }

    // Validate required fields
    if (!parsed.summary || !parsed.contextualExplanation) {
      console.warn('OpenRouter response missing required fields');
      return null;
    }

    // Ensure arrays exist
    if (!Array.isArray(parsed.attackPathWording)) {
      parsed.attackPathWording = [];
    }
    if (!Array.isArray(parsed.defensiveActions)) {
      parsed.defensiveActions = [];
    }

    return { interpretation: parsed };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('OpenRouter API request timed out');
      } else {
        console.warn('OpenRouter API request failed:', error.message);
      }
    } else {
      console.warn('OpenRouter API request failed with unknown error');
    }
    return null;
  }
}

/**
 * Generate vision analysis using OpenRouter's vision-capable model
 * Returns null if OpenRouter is unavailable or request fails
 * Note: OpenRouter vision is disabled - using OCR + Groq vision instead
 */
export async function generateVisionAnalysis(
  imageData: string
): Promise<{ visionResult: OpenRouterVisionResult; error?: string } | null> {
  // OpenRouter vision disabled - rely on OCR and Groq vision
  return null;
}
