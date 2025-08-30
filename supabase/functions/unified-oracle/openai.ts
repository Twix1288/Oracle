import { OPENAI_CONFIG } from './config.ts';

interface StageAnalysis {
  stage: string;
  confidence: number;
  reasoning: string;
}

// Retry with fallback model when primary model is overloaded
export async function retryWithFallbackModel(
  systemPrompt: string,
  query: string,
  context: string,
  stageAnalysis: StageAnalysis,
  suggestedFrameworks: string[]
): Promise<{ answer: string }> {
  const response = await fetch(`${OPENAI_CONFIG.API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
      'OpenAI-Organization': Deno.env.get('OPENAI_ORG_ID'),
      'OpenAI-Beta': 'assistants=v1'
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.CHAT_MODEL_FALLBACK,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Context: ${context}\n\nStage Analysis: ${stageAnalysis.reasoning}\nConfidence: ${stageAnalysis.confidence}\nSuggested Frameworks: ${suggestedFrameworks.join(', ')}\n\nUser Query: ${query}` 
        }
      ],
      max_tokens: OPENAI_CONFIG.CHAT_MAX_TOKENS,
      temperature: OPENAI_CONFIG.CHAT_TEMPERATURE,
      timeout: OPENAI_CONFIG.TIMEOUT_MS,
      stream: false,
      n: 1
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Fallback model failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return { answer: data.choices[0].message.content };
}

// Rate limiter for OpenAI API calls
class OpenAIRateLimiter {
  private requestCount: number = 0;
  private tokenCount: number = 0;
  private lastReset: number = Date.now();

  private resetIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastReset >= 60000) { // 1 minute
      this.requestCount = 0;
      this.tokenCount = 0;
      this.lastReset = now;
    }
  }

  async checkLimit(estimatedTokens: number = 1000): Promise<void> {
    this.resetIfNeeded();

    if (
      this.requestCount >= OPENAI_CONFIG.REQUESTS_PER_MINUTE ||
      this.tokenCount + estimatedTokens >= OPENAI_CONFIG.TOKENS_PER_MINUTE
    ) {
      const waitTime = 60000 - (Date.now() - this.lastReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.resetIfNeeded();
    }

    this.requestCount++;
    this.tokenCount += estimatedTokens;
  }
}

export const rateLimiter = new OpenAIRateLimiter();

// Estimate token count for a string
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// Truncate text to fit within token limit
export function truncateToTokenLimit(text: string, maxTokens: number = 4000): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) return text;

  // Truncate to approximate character length
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '...';
}

// Format OpenAI API error messages
export function formatOpenAIError(error: any): string {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        return 'Invalid API key or unauthorized access';
      case 429:
        return 'Rate limit exceeded. Please try again later.';
      case 500:
        return 'OpenAI service error. Please try again later.';
      default:
        return data?.error?.message || 'Unknown OpenAI API error';
    }
  }
  return error.message || 'Failed to communicate with OpenAI';
}

// Validate OpenAI API key
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${OPENAI_CONFIG.API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}
