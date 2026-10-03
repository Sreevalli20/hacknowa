export type ProviderStatus = 'NOT_CONFIGURED' | 'AVAILABLE' | 'FAILED' | 'UNAUTHORIZED' | 'RATE_LIMITED';

export interface InvestigationMemory {
  investigationId: string;
  timestamp: string;
  inputType: 'message' | 'url' | 'screenshot' | 'qr';
  riskLevel: string;
  riskScore: number;
  signalIds: string[];
  correlationIds: string[];
  summary: string;
}

export interface MemoryStatus {
  status: ProviderStatus;
  error?: string;
}

let breethStatus: ProviderStatus = 'NOT_CONFIGURED';

/**
 * Initialize Breeth client if API key is available.
 * Performs a real API test to determine actual status.
 */
export async function initializeBreethMemory(): Promise<MemoryStatus> {
  const apiKey = process.env.BREETH_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    breethStatus = 'NOT_CONFIGURED';
    return {
      status: 'NOT_CONFIGURED',
      error: 'BREETH_API_KEY not configured',
    };
  }

  try {
    // Perform a real API test write using REST API
    const response = await fetch('https://api.thebreeth.com/v1/episodes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'TRACEZERO initialization test',
        group_id: 'tracezero-test',
        extract_intent: false,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.status === 401) {
      breethStatus = 'UNAUTHORIZED';
      return { status: 'UNAUTHORIZED', error: 'Invalid API key' };
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.slug === 'missing_scope') {
        breethStatus = 'UNAUTHORIZED';
        return { status: 'UNAUTHORIZED', error: 'API key missing write scope' };
      }
      breethStatus = 'UNAUTHORIZED';
      return { status: 'UNAUTHORIZED', error: 'Forbidden' };
    }

    if (response.status === 429) {
      breethStatus = 'RATE_LIMITED';
      return { status: 'RATE_LIMITED', error: 'Rate limited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      breethStatus = 'FAILED';
      return { status: 'FAILED', error: `API test failed with status ${response.status}: ${errorText}` };
    }

    breethStatus = 'AVAILABLE';
    return { status: 'AVAILABLE' };
  } catch (error) {
    breethStatus = 'FAILED';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Breeth initialization failed:', errorMessage);
    return {
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

/**
 * Store an investigation in Breeth memory.
 * Silently fails if Breeth is unavailable.
 */
export async function storeInvestigation(
  memory: InvestigationMemory
): Promise<{ success: boolean; error?: string }> {
  if (breethStatus !== 'AVAILABLE') {
    return {
      success: false,
      error: 'Breeth memory service unavailable',
    };
  }

  const apiKey = process.env.BREETH_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'BREETH_API_KEY not configured',
    };
  }

  try {
    const content = JSON.stringify(memory, null, 2);

    const response = await fetch('https://api.thebreeth.com/v1/episodes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `TRACEZERO Investigation\n\n${content}`,
        group_id: 'tracezero-investigations',
        extract_intent: false,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (response.status === 401) {
      breethStatus = 'UNAUTHORIZED';
      return { success: false, error: 'Unauthorized' };
    }

    if (response.status === 403) {
      breethStatus = 'UNAUTHORIZED';
      return { success: false, error: 'Forbidden' };
    }

    if (response.status === 429) {
      breethStatus = 'RATE_LIMITED';
      return { success: false, error: 'Rate limited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      breethStatus = 'FAILED';
      return { success: false, error: `Write failed with status ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    breethStatus = 'FAILED';
    console.warn('Breeth write failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retrieve similar investigations from Breeth memory.
 * Returns empty array if Breeth is unavailable.
 */
export async function retrieveSimilarInvestigations(
  query: string,
  limit: number = 5
): Promise<{ memories: InvestigationMemory[]; error?: string }> {
  if (breethStatus !== 'AVAILABLE') {
    return {
      memories: [],
      error: 'Breeth memory service unavailable',
    };
  }

  const apiKey = process.env.BREETH_API_KEY;
  if (!apiKey) {
    return {
      memories: [],
      error: 'BREETH_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://api.thebreeth.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `TRACEZERO investigation ${query}`,
        group_id: 'tracezero-investigations',
        limit,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (response.status === 401) {
      breethStatus = 'UNAUTHORIZED';
      return { memories: [], error: 'Unauthorized' };
    }

    if (response.status === 403) {
      breethStatus = 'UNAUTHORIZED';
      return { memories: [], error: 'Forbidden' };
    }

    if (response.status === 429) {
      breethStatus = 'RATE_LIMITED';
      return { memories: [], error: 'Rate limited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      breethStatus = 'FAILED';
      return { memories: [], error: `Search failed with status ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    const memories: InvestigationMemory[] = [];

    for (const edge of data.edges || []) {
      try {
        const parsed = JSON.parse(edge.fact || '{}');
        if (parsed.timestamp && parsed.riskLevel) {
          memories.push(parsed as InvestigationMemory);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return { memories };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    breethStatus = 'FAILED';
    console.warn('Breeth retrieve failed:', errorMessage);
    return {
      memories: [],
      error: errorMessage,
    };
  }
}

/**
 * Get Breeth memory status.
 */
export function getBreethStatus(): MemoryStatus {
  return { status: breethStatus };
}
