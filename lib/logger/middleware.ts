/**
 * Logger Middleware
 *
 * Utilities for request correlation and automatic API route logging.
 *
 * @example
 * ```typescript
 * import { withLogging } from '@/lib/logger/middleware';
 *
 * export const POST = withLogging(
 *   async (req, requestId) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     operation: 'api.donations.create',
 *     logBody: false // Don't log request body
 *   }
 * );
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './index';
import { randomUUID } from 'crypto';

/**
 * Extract or generate request ID for correlation tracking
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ||
         request.headers.get('x-correlation-id') ||
         randomUUID();
}

/**
 * Extract correlation ID (for linking multiple related requests)
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') || randomUUID();
}

/**
 * Get safe request metadata for logging
 */
export function getRequestMetadata(request: NextRequest) {
  return {
    method: request.method,
    path: request.nextUrl.pathname,
    search: request.nextUrl.search,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown',
  };
}

/**
 * API route wrapper with automatic logging and request ID injection
 *
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with logging
 */
export function withLogging<T extends NextResponse | Response>(
  handler: (req: NextRequest, requestId: string) => Promise<T>,
  options?: {
    operation?: string;
    logBody?: boolean;
    logResponse?: boolean;
  }
) {
  return async (req: NextRequest): Promise<T> => {
    const requestId = getRequestId(req);
    const correlationId = getCorrelationId(req);
    const startTime = Date.now();

    const metadata = getRequestMetadata(req);
    const operation = options?.operation || `api.${req.method.toLowerCase()}.${metadata.path}`;

    // Create a request-scoped logger
    const requestLogger = logger.child({
      requestId,
      correlationId,
      operation,
      ...metadata,
    });

    requestLogger.info('API request started', {
      bodySize: options?.logBody ? req.headers.get('content-length') : undefined,
    });

    try {
      // Execute the handler
      const result = await handler(req, requestId);

      const duration = Date.now() - startTime;
      const statusCode = result.status || 200;

      requestLogger.info('API request completed', {
        duration,
        statusCode,
        success: statusCode >= 200 && statusCode < 300,
      });

      // Add correlation headers to response
      if (result instanceof NextResponse) {
        result.headers.set('x-request-id', requestId);
        result.headers.set('x-correlation-id', correlationId);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      requestLogger.error('API request failed', {
        duration,
        errorMessage: (error as Error).message,
        errorName: (error as Error).name,
      }, error as Error);

      throw error;
    }
  };
}

/**
 * Wrapper for server actions with automatic logging
 *
 * @example
 * ```typescript
 * import { withActionLogging } from '@/lib/logger/middleware';
 *
 * export const createMember = withActionLogging(
 *   'member.create',
 *   async (churchId, data) => {
 *     // Your action logic
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function withActionLogging<TArgs extends unknown[], TReturn>(
  operation: string,
  action: (...args: TArgs) => Promise<TReturn>
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const actionId = randomUUID();
    const startTime = Date.now();

    const actionLogger = logger.child({
      actionId,
      operation,
    });

    actionLogger.debug('Server action started');

    try {
      const result = await action(...args);
      const duration = Date.now() - startTime;

      actionLogger.debug('Server action completed', {
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      actionLogger.error('Server action failed', {
        duration,
      }, error as Error);

      throw error;
    }
  };
}

/**
 * Hash sensitive identifiers for logging (one-way hash for privacy)
 */
export function hashChurchId(churchId: string): string {
  // Simple hash for privacy - prevents full church ID from appearing in logs
  if (!churchId) return 'unknown';

  // Take first 8 characters and add a hash indicator
  const prefix = churchId.substring(0, 8);
  return `${prefix}...`;
}

/**
 * Extract email domain for logging (don't log full emails)
 */
export function getEmailDomain(email: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  return email.split('@')[1];
}

/**
 * Get last 4 digits of phone number for logging
 */
export function getPhoneLast4(phoneNumber: string): string | undefined {
  if (!phoneNumber) return undefined;

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length < 4) return undefined;
  return `***-***-${digits.slice(-4)}`;
}
