/**
 * AltarFlow Structured Logger
 *
 * Central logging abstraction with automatic PII redaction, Sentry integration,
 * and Slack notifications for critical errors.
 * Designed to be Turborepo-ready with zero Next.js dependencies in core.
 *
 * ⚠️ SERVER-SIDE ONLY: This module uses Node.js APIs and cannot be imported
 * in client components. Use console.log/console.error in client components instead.
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User action completed', {
 *   operation: 'member.create',
 *   userId,
 *   churchId: hashChurchId(churchId)
 * });
 *
 * logger.error('Operation failed', {
 *   operation: 'payment.process',
 *   paymentId
 * }, error);
 * ```
 */

import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: unknown;
  // Common fields
  requestId?: string;
  correlationId?: string;
  userId?: string;
  churchId?: string;
  orgId?: string;
  operation?: string;
  duration?: number;
  // Financial tracking
  amount?: number;
  currency?: string;
  paymentIntentId?: string;
  customerId?: string;
  // Error tracking
  errorCode?: string;
  statusCode?: number;
  stack?: string;
  // Metadata
  environment?: string;
  service?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Core Logger class with automatic sanitization and multi-transport support
 */
class Logger {
  private minLevel: LogLevel = 'info';
  private isDevelopment: boolean;
  private isProduction: boolean;

  // Sensitive field patterns to automatically redact
  private readonly SENSITIVE_PATTERNS = [
    'password',
    'passwd',
    'pwd',
    'token',
    'apikey',
    'api_key',
    'secret',
    'ssn',
    'creditcard',
    'credit_card',
    'cardnumber',
    'card_number',
    'cvv',
    'cvc',
    'pin',
    'bankaccount',
    'bank_account',
    'routingnumber',
    'routing_number',
    'authorization',
    'auth_token',
    'bearer',
    'private_key',
    'privatekey',
  ];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) ||
      (this.isProduction ? 'info' : 'debug');
  }

  /**
   * Sanitize context to prevent log injection and PII leakage
   * @private
   */
  private sanitize(context?: LogContext): LogContext {
    if (!context) return {};

    const sanitized = { ...context };

    // Remove sensitive fields based on patterns
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Check if key matches any sensitive pattern
      if (this.SENSITIVE_PATTERNS.some(pattern => lowerKey.includes(pattern))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Sanitize nested objects
      const value = sanitized[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        try {
          sanitized[key] = this.sanitize(value as LogContext);
        } catch {
          sanitized[key] = '[Object]';
        }
      }
    }

    // Ensure all values are JSON-serializable
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof value === 'symbol') {
        sanitized[key] = '[Symbol]';
      } else if (typeof value === 'bigint') {
        sanitized[key] = value.toString();
      } else if (value instanceof Error) {
        sanitized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check for circular references
        try {
          JSON.stringify(value);
        } catch {
          sanitized[key] = '[Circular Reference]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Check if log level should be emitted
   * @private
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const targetLevelIndex = levels.indexOf(level);

    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * Core logging method - handles all log levels
   * @private
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const sanitizedContext = this.sanitize(context);

    // Build log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizedContext,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      })
    };

    // Console output (development or when explicitly enabled)
    if (this.isDevelopment || process.env.ENABLE_CONSOLE_LOGS === 'true') {
      this.logToConsole(logEntry);
    }

    // Sentry integration (production or when explicitly enabled)
    if (this.isProduction || process.env.SENTRY_ENABLED === 'true') {
      this.logToSentry(level, message, sanitizedContext, error);
    }

    // Slack notifications for critical errors (fire-and-forget)
    if ((level === 'error' || level === 'fatal') && this.isProduction) {
      // Don't await to avoid blocking - notifications are best-effort
      // Wrap in try-catch to ensure logger never crashes
      try {
        void this.notifySlack(level, message, sanitizedContext, error)
          .catch(() => { /* Silently ignore Slack notification errors */ });
      } catch {
        // Ignore synchronous errors from Slack notifications
      }
    }
  }

  /**
   * Log to console with formatting
   * @private
   */
  private logToConsole(logEntry: LogEntry): void {
    const { level, message, context, error: errorInfo } = logEntry;

    // Choose console method based on level
    const consoleMethod = level === 'fatal' || level === 'error' ? 'error' :
                         level === 'warn' ? 'warn' :
                         level === 'debug' ? 'debug' : 'log';

    // Format output for readability in development
    const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context && Object.keys(context).length > 0
      ? JSON.stringify(context, null, 2)
      : '';

    if (errorInfo) {
      console[consoleMethod](prefix, message, contextStr, '\n', errorInfo);
    } else if (contextStr) {
      console[consoleMethod](prefix, message, '\n', contextStr);
    } else {
      console[consoleMethod](prefix, message);
    }
  }

  /**
   * Log to Sentry with appropriate severity
   * @private
   */
  private logToSentry(
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: Error
  ): void {
    // Map log levels to Sentry severity
    const sentryLevel = level === 'fatal' ? 'fatal' : level as Sentry.SeverityLevel;

    if (level === 'error' || level === 'fatal') {
      // Capture errors and fatal events as exceptions
      if (error) {
        Sentry.captureException(error, {
          level: sentryLevel,
          contexts: {
            log: context,
          },
          tags: {
            logLevel: level,
            operation: context.operation || 'unknown',
            churchId: context.churchId || 'unknown',
          },
          fingerprint: [
            message,
            context.operation || 'unknown',
          ],
        });
      } else {
        Sentry.captureMessage(message, {
          level: sentryLevel,
          contexts: {
            log: context,
          },
          tags: {
            logLevel: level,
            operation: context.operation || 'unknown',
          },
        });
      }
    } else {
      // Add breadcrumbs for warn, info, debug
      Sentry.addBreadcrumb({
        message,
        level: sentryLevel === 'fatal' ? 'error' : sentryLevel,
        data: context,
        category: context.operation || 'general',
      });
    }
  }

  /**
   * Send Slack notification for critical errors
   * @private
   */
  private async notifySlack(
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: Error
  ): Promise<void> {
    // Only notify for critical operations
    const operation = context.operation || '';

    // Payment failures
    if (operation.includes('payment') || operation.includes('stripe')) {
      await sendSlackNotification(SlackNotifications.paymentFailed({
        amount: typeof context.amount === 'number' ? context.amount : 0,
        churchName: typeof context.churchName === 'string' ? context.churchName : 'Unknown Church',
        error: error?.message || message,
      }));
      return;
    }

    // Database errors
    if (operation.includes('database') || operation.includes('db.')) {
      await sendSlackNotification(SlackNotifications.databaseError({
        error: error?.message || message,
        operation,
      }));
      return;
    }

    // Cron job failures
    if (operation.startsWith('cron.') && operation.includes('error')) {
      await sendSlackNotification(SlackNotifications.cronJobFailed({
        jobName: operation.replace('cron.', '').replace('.error', ''),
        error: error?.message || message,
      }));
      return;
    }

    // Generic critical error for anything else that's fatal or a recurring error
    if (level === 'fatal') {
      await sendSlackNotification({
        title: 'Critical Error',
        message,
        severity: 'critical',
        fields: [
          { title: 'Operation', value: operation, short: true },
          { title: 'Error', value: error?.message || 'No error details', short: false },
        ],
      });
    }
  }

  /**
   * Log debug message (verbose information for development)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message (general operational information)
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message (potentially harmful situations)
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message (error events that might still allow application to continue)
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log fatal message (severe errors that will lead to application abort)
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log('fatal', message, context, error);
  }

  /**
   * Create a child logger with inherited context
   *
   * @example
   * ```typescript
   * const requestLogger = logger.child({ requestId, churchId });
   * requestLogger.info('Processing request'); // Automatically includes requestId and churchId
   * ```
   */
  child(childContext: LogContext): Logger {
    const childLogger = Object.create(this);
    const originalLog = this.log.bind(this);

    childLogger.log = (
      level: LogLevel,
      message: string,
      context?: LogContext,
      error?: Error
    ) => {
      // Merge parent context with new context
      const mergedContext = { ...childContext, ...context };
      originalLog(level, message, mergedContext, error);
    };

    return childLogger;
  }

  /**
   * Execute a function with automatic span tracking and logging
   *
   * @example
   * ```typescript
   * const result = await logger.withSpan('payment.process', { paymentId }, async () => {
   *   return await processPayment(paymentId);
   * });
   * ```
   */
  async withSpan<T>(
    operation: string,
    attributes: LogContext,
    callback: () => Promise<T> | T
  ): Promise<T> {
    const startTime = Date.now();

    this.debug(`Starting operation: ${operation}`, {
      operation,
      ...attributes,
    });

    try {
      const result = await callback();
      const duration = Date.now() - startTime;

      this.debug(`Completed operation: ${operation}`, {
        operation,
        duration,
        ...attributes,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(`Failed operation: ${operation}`, {
        operation,
        duration,
        ...attributes,
      }, error as Error);

      throw error;
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Export class for extensibility
export { Logger };
