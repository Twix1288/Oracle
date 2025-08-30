// OpenAI configuration
export const OPENAI_CONFIG = {
  // Chat models
  CHAT_MODEL: 'gpt-4', // or 'gpt-3.5-turbo' for faster, cheaper responses
  CHAT_MODEL_FALLBACK: 'gpt-3.5-turbo', // Fallback model if GPT-4 is unavailable
  CHAT_TEMPERATURE: 0.7, // Higher = more creative, lower = more focused
  CHAT_MAX_TOKENS: 600, // Maximum response length

  // Embedding models
  EMBEDDING_MODEL: 'text-embedding-ada-002',
  EMBEDDING_DIMENSIONS: 1536, // Dimensions for text-embedding-ada-002

  // API configuration
  API_URL: 'https://api.openai.com/v1',
  API_VERSION: '2024-02-15', // Latest stable version
  TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // 1 second

  // Rate limiting
  REQUESTS_PER_MINUTE: 50,
  TOKENS_PER_MINUTE: 90000,

  // Error messages
  ERRORS: {
    INVALID_API_KEY: 'Invalid OpenAI API key',
    MODEL_OVERLOADED: 'Model is currently overloaded',
    CONTEXT_LENGTH_EXCEEDED: 'Input too long',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    TIMEOUT: 'Request timed out',
    GENERIC: 'OpenAI API error'
  }
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  // Table names
  TABLES: {
    TEAMS: 'teams',
    MEMBERS: 'members',
    UPDATES: 'updates',
    MESSAGES: 'messages',
    DOCUMENTS: 'documents',
    ORACLE_LOGS: 'oracle_logs',
    TEAM_STATUS: 'team_status'
  },

  // Query limits
  MAX_RESULTS: 100,
  DEFAULT_PAGE_SIZE: 20,

  // Error messages
  ERRORS: {
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_INPUT: 'Invalid input data',
    DATABASE_ERROR: 'Database operation failed',
    GENERIC: 'Supabase error'
  }
};

// Oracle configuration
export const ORACLE_CONFIG = {
  // Response settings
  MAX_CONTEXT_LENGTH: 4000,
  MAX_RESPONSE_LENGTH: 2000,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_USER: 100,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Caching
  CACHE_TTL_MS: 300000, // 5 minutes
  MAX_CACHE_SIZE: 1000,

  // Error messages
  ERRORS: {
    RATE_LIMITED: 'Too many requests',
    INVALID_REQUEST: 'Invalid request format',
    CONTEXT_TOO_LONG: 'Context too long',
    MISSING_PARAMETERS: 'Missing required parameters',
    GENERIC: 'Oracle error'
  }
};

// Environment validation
export function validateEnvironment(): void {
  const required = [
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Error handling
export class OracleError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'OracleError';
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: this.message,
        code: this.code,
        details: this.details
      }),
      {
        status: this.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
