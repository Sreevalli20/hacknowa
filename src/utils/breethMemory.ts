import { BreethClient, BreethError } from '@breeth/sdk';

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
  available: boolean;
  error?: string;
}

let breethClient: BreethClient | null = null;
let breethAvailable: boolean = false;

/**
 * Initialize Breeth client if API key is available.
 * Returns false if Breeth is not configured or fails to initialize.
 */
export function initializeBreethMemory(): MemoryStatus {
  const apiKey = process.env.BREETH_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    return {
      available: false,
      error: 'BREETH_API_KEY not configured',
    };
  }

  try {
    breethClient = new BreethClient({ apiKey });
    breethAvailable = true;
    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Breeth initialization failed:', errorMessage);
    return {
      available: false,
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
  if (!breethAvailable || !breethClient) {
    return {
      success: false,
      error: 'Breeth memory service unavailable',
    };
  }

  try {
    const content = JSON.stringify(memory, null, 2);
    
    await breethClient.write({
      content: `TRACEZERO Investigation\n\n${content}`,
      groupId: 'tracezero-investigations',
      sourceDescription: 'tracezero-investigation',
      extractIntent: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof BreethError) {
      console.warn('Breeth write error:', error.slug, error.message);
      return {
        success: false,
        error: `Breeth error: ${error.slug}`,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
  if (!breethAvailable || !breethClient) {
    return {
      memories: [],
      error: 'Breeth memory service unavailable',
    };
  }

  try {
    const result = await breethClient.retrieve({
      query: `TRACEZERO investigation ${query}`,
      groupId: 'tracezero-investigations',
      limit,
    });

    const memories: InvestigationMemory[] = [];
    
    for (const edge of result.edges || []) {
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
    if (error instanceof BreethError) {
      console.warn('Breeth retrieve error:', error.slug, error.message);
      return {
        memories: [],
        error: `Breeth error: ${error.slug}`,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
  return {
    available: breethAvailable,
  };
}
