import { Prisma } from '@prisma/client';

// Conditional logger import for Node.js environments only
// This allows the extension to work in test scripts without server-only dependencies
let logger: any;
try {
  logger = require('@/lib/logger').logger;
} catch (e) {
  // Fallback logger for test environments
  logger = {
    warn: console.warn,
    error: console.error,
  };
}

/**
 * Prisma Client Extension for automatic retry logic on connection errors.
 * This replaces the deprecated $use middleware API from Prisma 4.x
 * 
 * Automatically retries database operations that fail due to:
 * - Connection pool timeouts
 * - Server connection drops
 * - Network timeouts
 * - Database server unavailability
 * - Transaction conflicts and deadlocks
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  excludedOperations?: Set<string>;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 100, // milliseconds
  excludedOperations: new Set([
    // Operations that should not be retried to avoid side effects
    '$executeRaw',
    '$executeRawUnsafe',
  ]),
};

/**
 * Check if an error is retryable based on error code or message
 */
function isRetryableError(error: any): boolean {
  // Prisma error codes that are safe to retry
  const retryableCodes = new Set([
    'P2024', // Timed out fetching a new connection from the connection pool
    'P1017', // Server has closed the connection
    'P1001', // Can't reach database server
    'P1002', // Database server timeout
    'P2034', // Transaction failed due to a write conflict or a deadlock
  ]);

  // Check Prisma error codes
  if (error?.code && retryableCodes.has(error.code)) {
    return true;
  }

  // Check error messages for connection issues
  const errorMessage = error?.message?.toLowerCase() || '';
  const retryablePatterns = [
    'connection terminated unexpectedly',
    'connection reset by peer',
    'server closed the connection',
    'connection pool timeout',
    'timeout',
    'econnreset',
    'etimedout',
    'enotfound',
    'connection refused',
    'network error',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Execute a database operation with retry logic
 * 
 * @param operation - The database operation to execute
 * @param operationName - Name of the operation for logging
 * @param options - Retry configuration
 * 
 * Note: With maxRetries=3, this performs 3 TOTAL attempts (1 initial + 2 retries)
 * not 4 attempts. This matches the behavior of the legacy withRetry() function.
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Required<RetryOptions>
): Promise<T> {
  let lastError: any;
  
  // Loop from 0 to maxRetries-1 for correct total attempt count
  // With maxRetries=3: attempts 0, 1, 2 = 3 total attempts
  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry if we've exhausted our attempts
      if (attempt >= options.maxRetries - 1) {
        logger.error('Max retries exceeded for database operation', {
          operation: 'database.max_retries_exceeded',
          operationName,
          attempts: attempt + 1,
          maxRetries: options.maxRetries,
          errorCode: error.code,
          errorMessage: error.message,
        }, error);
        throw error;
      }
      
      // Log the retry attempt
      logger.warn('Database operation failed, retrying', {
        operation: 'database.retry_attempt',
        operationName,
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
        errorCode: error.code,
        errorMessage: error.message,
      });
      
      // Exponential backoff with jitter
      const delay = options.baseDelay * Math.pow(2.5, attempt) + Math.random() * 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Create a Prisma Client Extension with automatic retry logic
 *
 * This extension provides comprehensive retry coverage for:
 * 1. All model-level operations (User.findMany, Church.create, etc.)
 *
 * Note: Client-level operations ($queryRaw, $transaction, etc.) are NOT wrapped
 * because Prisma extensions don't provide a way to call the original method
 * without recursion. For these operations, use the withRetry() wrapper from lib/db.ts
 * or handle retries manually where needed.
 */
export function createRetryExtension(options: RetryOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return Prisma.defineExtension({
    name: 'retry-extension',
    query: {
      $allModels: {
        // Apply retry logic to all operations on all models
        async $allOperations({ operation, model, args, query }) {
          const operationId = `${model}.${operation}`;

          // Skip retry for excluded operations
          if (config.excludedOperations.has(operation)) {
            return query(args);
          }

          return executeWithRetry(
            () => query(args),
            operationId,
            config
          );
        },
      },
    },
    // NOTE: Client-level operations ($queryRaw, $transaction, etc.) are NOT wrapped here
    // Previous implementation caused infinite recursion because Prisma.getExtensionContext(this)
    // returns the extended client, so calling $queryRaw on it would trigger the same wrapper.
    // For $queryRaw and $transaction retry logic, use the withRetry() wrapper from lib/db.ts:
    //   await withRetry(() => prisma.$queryRaw`SELECT 1`);
  });
}

/**
 * Default retry extension instance with standard configuration
 */
export const retryExtension = createRetryExtension({
  maxRetries: 3,
  baseDelay: 100,
});

