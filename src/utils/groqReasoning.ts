/**
 * Groq API Integration for TRACEZERO
 * Provides contextual reasoning layer for investigation results
 */

export interface GroqStatus {
  available: boolean;
  error?: string;
}

export interface GroqInterpretation {
  summary: string;
  contextualExplanation: string;
  attackPathWording: string[];
  defensiveActions: string[];
}

let groqAvailable: boolean = false;
let groqInitialized: boolean = false;

/**
 * Initialize Groq API client if API key is available.
 * Returns false if Groq is not configured or fails to initialize.
 */
export function initializeGroq(): GroqStatus {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    return {
      available: false,
      error: 'GROQ_API_KEY not configured',
    };
  }

  groqAvailable = true;
  groqInitialized = true;
  return { available: true };
}

/**
 * Get Groq status
 */
export function getGroqStatus(): GroqStatus {
  return {
    available: groqAvailable,
  };
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
  if (!groqAvailable) {
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
        model: 'openai/gpt-oss-20b',
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
