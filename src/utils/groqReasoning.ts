/**
 * Groq API Integration for TRACEZERO
 * Provides contextual reasoning layer for investigation results
 */

export type ProviderStatus = 'NOT_CONFIGURED' | 'AVAILABLE' | 'FAILED' | 'UNAUTHORIZED' | 'RATE_LIMITED';

export interface GroqStatus {
  status: ProviderStatus;
  error?: string;
}

export interface GroqInterpretation {
  summary: string;
  contextualExplanation: string;
  attackPathWording: string[];
  defensiveActions: string[];
}

export interface GroqVisionResult {
  visibleText: string;
  visibleUrls: string[];
  visibleDomains: string[];
  visibleButtons: string[];
  credentialFields: boolean;
  paymentIndicators: boolean;
  urgencyIndicators: boolean;
  analysis: string;
}

let groqStatus: ProviderStatus = 'NOT_CONFIGURED';
let groqInitialized: boolean = false;

/**
 * Initialize Groq API client if API key is available.
 * Performs a real API test to determine actual status.
 */
export async function initializeGroq(): Promise<GroqStatus> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    groqStatus = 'NOT_CONFIGURED';
    groqInitialized = true;
    return { status: 'NOT_CONFIGURED', error: 'GROQ_API_KEY not configured' };
  }

  try {
    // Perform a real API test request with a simple model list
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.status === 401) {
      groqStatus = 'UNAUTHORIZED';
      groqInitialized = true;
      return { status: 'UNAUTHORIZED', error: 'Invalid API key' };
    }

    if (response.status === 429) {
      groqStatus = 'RATE_LIMITED';
      groqInitialized = true;
      return { status: 'RATE_LIMITED', error: 'Rate limited' };
    }

    if (!response.ok) {
      groqStatus = 'FAILED';
      groqInitialized = true;
      return { status: 'FAILED', error: `API test failed with status ${response.status}` };
    }

    groqStatus = 'AVAILABLE';
    groqInitialized = true;
    return { status: 'AVAILABLE' };
  } catch (error) {
    groqStatus = 'FAILED';
    groqInitialized = true;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'FAILED', error: errorMessage };
  }
}

/**
 * Get Groq status
 */
export function getGroqStatus(): GroqStatus {
  return { status: groqStatus };
}

/**
 * Generate contextual reasoning using Groq API
 * Returns null if Groq is unavailable or request fails
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
): Promise<{ interpretation: GroqInterpretation; error?: string } | null> {
  if (groqStatus !== 'AVAILABLE') {
    return null;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Build the investigation object for Groq
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Groq API error:', response.status, errorText);
      if (response.status === 401) {
        groqStatus = 'UNAUTHORIZED';
      } else if (response.status === 429) {
        groqStatus = 'RATE_LIMITED';
      } else {
        groqStatus = 'FAILED';
      }
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('Groq API returned empty response');
      return null;
    }

    // Parse the JSON response
    let parsed: GroqInterpretation;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse Groq response as JSON:', error);
      return null;
    }

    // Validate required fields
    if (!parsed.summary || !parsed.contextualExplanation) {
      console.warn('Groq response missing required fields');
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
        console.warn('Groq API request timed out');
      } else {
        console.warn('Groq API request failed:', error.message);
      }
    } else {
      console.warn('Groq API request failed with unknown error');
    }
    return null;
  }
}

/**
 * Generate vision analysis using Groq's vision-capable model
 * Returns null if Groq is unavailable or request fails
 */
export async function generateVisionAnalysis(
  imageData: string
): Promise<{ visionResult: GroqVisionResult; error?: string } | null> {
  if (groqStatus !== 'AVAILABLE') {
    return null;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const systemPrompt = `You are the vision analysis layer for TRACEZERO.

Analyze the provided image and extract only directly observable information.

Never invent text that is not visible.
Never claim to see content that is not clearly present.
Never make assumptions about sender identity or domain reputation.

Provide a structured JSON response with these fields:
- visibleText: All text clearly visible in the image (exactly as written)
- visibleUrls: Array of complete URLs visible in the image
- visibleDomains: Array of domain names visible in the image
- visibleButtons: Array of button labels or action text visible
- credentialFields: Boolean - true if password/credential input fields are visible
- paymentIndicators: Boolean - true if payment/card/banking indicators are visible
- urgencyIndicators: Boolean - true if urgent/deadline language is visible
- analysis: Brief description of what the image shows (2-3 sentences)

If the image is unreadable, unclear, or contains no relevant text, indicate that clearly.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Groq Vision API error:', response.status, errorText);
      if (response.status === 401) {
        groqStatus = 'UNAUTHORIZED';
      } else if (response.status === 429) {
        groqStatus = 'RATE_LIMITED';
      } else {
        groqStatus = 'FAILED';
      }
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('Groq Vision API returned empty response');
      return null;
    }

    // Parse the JSON response
    let parsed: GroqVisionResult;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse Groq Vision response as JSON:', error);
      return null;
    }

    // Validate required fields
    if (!parsed.visibleText && !parsed.analysis) {
      console.warn('Groq Vision response missing required fields');
      return null;
    }

    // Ensure arrays exist
    if (!Array.isArray(parsed.visibleUrls)) {
      parsed.visibleUrls = [];
    }
    if (!Array.isArray(parsed.visibleDomains)) {
      parsed.visibleDomains = [];
    }
    if (!Array.isArray(parsed.visibleButtons)) {
      parsed.visibleButtons = [];
    }

    return { visionResult: parsed };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Groq Vision API request timed out');
      } else {
        console.warn('Groq Vision API request failed:', error.message);
      }
    } else {
      console.warn('Groq Vision API request failed with unknown error');
    }
    return null;
  }
}
