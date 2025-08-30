import { createClient } from '@supabase/supabase-js';

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  RATE_LIMIT = 'rate_limit',
  INTERNAL = 'internal'
}

// Error severity levels
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  teamId?: string;
  role?: string;
  action?: string;
  metadata?: any;
  stackTrace?: string;
}

// Error log interface
export interface ErrorLog {
  id?: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  context: ErrorContext;
  created_at?: string;
}

// Custom error class
export class OracleError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  context: ErrorContext;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'OracleError';
    this.type = type;
    this.severity = severity;
    this.context = context;
  }
}

// Error handler class
export class ErrorHandler {
  private supabase: ReturnType<typeof createClient>;
  private context: ErrorContext;

  constructor(supabase: ReturnType<typeof createClient>, defaultContext: ErrorContext = {}) {
    this.supabase = supabase;
    this.context = defaultContext;
  }

  // Log error to database
  async logError(error: Error | OracleError): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        type: error instanceof OracleError ? error.type : ErrorType.INTERNAL,
        severity: error instanceof OracleError ? error.severity : ErrorSeverity.ERROR,
        message: error.message,
        context: {
          ...this.context,
          ...(error instanceof OracleError ? error.context : {}),
          stackTrace: error.stack
        }
      };

      const { error: dbError } = await this.supabase
        .from('error_logs')
        .insert(errorLog);

      if (dbError) {
        console.error('Failed to log error:', dbError);
      }

      // For critical errors, create system alert
      if (errorLog.severity === ErrorSeverity.CRITICAL) {
        await this.createSystemAlert(errorLog);
      }
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }
  }

  // Create system alert for critical errors
  private async createSystemAlert(errorLog: ErrorLog): Promise<void> {
    try {
      await this.supabase
        .from('messages')
        .insert({
          sender_id: 'system',
          sender_role: 'guest',
          receiver_role: 'lead',
          content: `🚨 CRITICAL ERROR ALERT 🚨\n\nType: ${errorLog.type}\nMessage: ${errorLog.message}\nContext: ${JSON.stringify(errorLog.context)}`,
          is_broadcast: true,
          broadcast_type: 'role',
          broadcast_target: 'lead'
        });
    } catch (alertError) {
      console.error('Failed to create system alert:', alertError);
    }
  }

  // Handle validation errors
  handleValidationError(message: string, context: ErrorContext = {}): never {
    throw new OracleError(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.WARNING,
      { ...this.context, ...context }
    );
  }

  // Handle authentication errors
  handleAuthError(message: string, context: ErrorContext = {}): never {
    throw new OracleError(
      message,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.ERROR,
      { ...this.context, ...context }
    );
  }

  // Handle authorization errors
  handleAuthzError(message: string, context: ErrorContext = {}): never {
    throw new OracleError(
      message,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.ERROR,
      { ...this.context, ...context }
    );
  }

  // Handle database errors
  handleDatabaseError(error: any, context: ErrorContext = {}): never {
    throw new OracleError(
      error.message,
      ErrorType.DATABASE,
      ErrorSeverity.ERROR,
      { ...this.context, ...context, originalError: error }
    );
  }

  // Handle external service errors
  handleExternalError(error: any, service: string, context: ErrorContext = {}): never {
    throw new OracleError(
      error.message,
      ErrorType.EXTERNAL_SERVICE,
      ErrorSeverity.ERROR,
      { ...this.context, ...context, service, originalError: error }
    );
  }

  // Handle rate limit errors
  handleRateLimitError(message: string, context: ErrorContext = {}): never {
    throw new OracleError(
      message,
      ErrorType.RATE_LIMIT,
      ErrorSeverity.WARNING,
      { ...this.context, ...context }
    );
  }

  // Handle critical errors
  handleCriticalError(error: any, context: ErrorContext = {}): never {
    throw new OracleError(
      error.message,
      ErrorType.INTERNAL,
      ErrorSeverity.CRITICAL,
      { ...this.context, ...context, originalError: error }
    );
  }
}

// Error response formatter
export function formatErrorResponse(error: Error | OracleError): {
  success: false;
  error: string;
  type?: string;
  severity?: string;
  context?: ErrorContext;
} {
  if (error instanceof OracleError) {
    return {
      success: false,
      error: error.message,
      type: error.type,
      severity: error.severity,
      context: error.context
    };
  }

  return {
    success: false,
    error: error.message
  };
}

// Rate limiter
export class RateLimiter {
  private limits: Map<string, { count: number; resetTime: number }>;
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 100, timeWindow: number = 60000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  checkLimit(key: string): void {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit) {
      this.limits.set(key, { count: 1, resetTime: now + this.timeWindow });
      return;
    }

    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + this.timeWindow;
      return;
    }

    if (limit.count >= this.maxRequests) {
      throw new OracleError(
        'Rate limit exceeded',
        ErrorType.RATE_LIMIT,
        ErrorSeverity.WARNING,
        { key, maxRequests: this.maxRequests, timeWindow: this.timeWindow }
      );
    }

    limit.count++;
  }
}

// Request validator
export class RequestValidator {
  static validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new OracleError(
        `Missing required fields: ${missing.join(', ')}`,
        ErrorType.VALIDATION,
        ErrorSeverity.WARNING,
        { fields: missing }
      );
    }
  }

  static validateEnum<T>(value: any, enumType: T, field: string): void {
    if (!Object.values(enumType).includes(value)) {
      throw new OracleError(
        `Invalid value for ${field}: ${value}`,
        ErrorType.VALIDATION,
        ErrorSeverity.WARNING,
        { field, value, validValues: Object.values(enumType) }
      );
    }
  }

  static validateLength(value: string, field: string, min: number, max: number): void {
    if (value.length < min || value.length > max) {
      throw new OracleError(
        `${field} must be between ${min} and ${max} characters`,
        ErrorType.VALIDATION,
        ErrorSeverity.WARNING,
        { field, value, min, max }
      );
    }
  }
}
