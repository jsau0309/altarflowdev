import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { retryExtension } from './prisma-extension-retry';
import type { TransactionClient, RetryableError } from '@/types/prisma-helpers';

/**
 * Database Client Configuration with Automatic Retry Logic
 * 
 * This module exports a Prisma client that automatically retries database operations
 * on connection failures. All database operations (queries, mutations, transactions)
 * will automatically retry up to 3 times on transient errors like:
 * - Connection pool timeouts
 * - Server connection drops
 * - Network errors (ECONNRESET, ETIMEDOUT)
 * - Transaction conflicts/deadlocks
 * 
 * No manual wrapping is needed - just use prisma.* normally and retries happen automatically.
 * 
 * See: docs/DATABASE_RETRY_IMPLEMENTATION.md for details
 */

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { 
  prisma: ReturnType<typeof createPrismaClient>;
  handlersRegistered?: boolean;
};

// Create Prisma client with optimized configuration and automatic retry logic
function createPrismaClient() {
  // Build connection URL with connection pool settings
  // Pool timeout is configured via connection string query parameters
  const databaseUrl = process.env.DATABASE_URL;
  const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '20'; // 20 seconds (increased from default 10s)
  const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '30'; // Default Supabase Pro limit

  // Append pool configuration if not already present in URL
  // Check each parameter independently to avoid duplication
  let connectionUrl = databaseUrl;
  if (databaseUrl) {
    const params: string[] = [];
    
    if (!databaseUrl.includes('pool_timeout=')) {
      params.push(`pool_timeout=${poolTimeout}`);
    }
    
    if (!databaseUrl.includes('connection_limit=')) {
      params.push(`connection_limit=${connectionLimit}`);
    }
    
    if (params.length > 0) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      connectionUrl = `${databaseUrl}${separator}${params.join('&')}`;
    }
  }

  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    // Optimized connection configuration
    transactionOptions: {
      maxWait: 5000, // 5 seconds max wait for transaction
      timeout: 15000, // 15 seconds transaction timeout
    },
  });

  // Apply automatic retry extension for connection error handling
  // This replaces the deprecated $use middleware API from Prisma 4.x
  // All database operations will automatically retry on connection failures
  const client = baseClient.$extends(retryExtension);

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Enhanced utility function for retry logic on critical operations
// NOTE: This is now redundant as the Prisma client has automatic retry built-in via extension.
// Kept for backwards compatibility with existing code that explicitly uses it.
// New code should use the prisma client directly - retries are automatic.
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
return await operation();
    } catch (error: unknown) {
      // Enhanced retry conditions for connection and timeout errors
      const retryableError = error as RetryableError;
      const isRetryableError =
        retryableError?.code === 'P2024' || // Timed out fetching a new connection from the connection pool
        retryableError?.code === 'P1017' || // Server has closed the connection
        retryableError?.code === 'P1001' || // Can't reach database server
        retryableError?.code === 'P1002' || // Database server timeout
        retryableError?.code === 'P2034' || // Transaction failed due to a write conflict or a deadlock
        retryableError?.message?.includes('Connection terminated unexpectedly') ||
        retryableError?.message?.includes('Connection reset by peer') ||
        retryableError?.message?.includes('Server closed the connection') ||
        retryableError?.message?.includes('Connection pool timeout') ||
        retryableError?.message?.includes('timeout') ||
        retryableError?.message?.includes('ECONNRESET') ||
        retryableError?.message?.includes('ETIMEDOUT');

      if (isRetryableError) {
        retries++;
        logger.warn('Database connection error - retrying', {
          operation: 'database.connection_error',
          attempt: retries,
          maxRetries,
          errorCode: retryableError.code,
          errorMessage: retryableError.message
        });

        if (retries >= maxRetries) {
          logger.error('Max retries exceeded for database operation', {
            operation: 'database.max_retries_exceeded',
            attempts: retries,
            errorCode: retryableError.code
          }, error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
        
        // Exponential backoff with jitter: 100ms, 250ms, 625ms, etc.
        const delay = baseDelay * Math.pow(2.5, retries - 1) + Math.random() * 50;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Utility function for database transactions with retry logic
// NOTE: This is now redundant as the Prisma client has automatic retry built-in via extension.
// Kept for backwards compatibility with existing code that explicitly uses it.
// New code should use prisma.$transaction directly - retries are automatic.
export async function withRetryTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  return withRetry(async () => {
    return prisma.$transaction(async (tx) => {
      return operation(tx as unknown as TransactionClient);
    }, {
      maxWait: 5000, // 5 seconds max wait
      timeout: 15000, // 15 seconds timeout
    }) as Promise<T>;
  }, maxRetries);
}

// Connection health check utility
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    logger.error('Database health check failed', {
      operation: 'database.health_check_failed'
    }, error instanceof Error ? error : new Error(String(error)));
    return { healthy: false };
  }
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  
  // Only add shutdown handlers once in development
  if (!globalForPrisma.handlersRegistered) {
    globalForPrisma.handlersRegistered = true;
    
    // Graceful shutdown handler
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, closing database connections', {
        operation: 'database.shutdown',
        signal: 'SIGTERM'
      });
      await prisma.$disconnect();
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, closing database connections', {
        operation: 'database.shutdown',
        signal: 'SIGINT'
      });
      await prisma.$disconnect();
    });
  }
} else {
  // In production, always register handlers
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing database connections', {
      operation: 'database.shutdown',
      signal: 'SIGTERM',
      env: 'production'
    });
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, closing database connections', {
      operation: 'database.shutdown',
      signal: 'SIGINT',
      env: 'production'
    });
    await prisma.$disconnect();
  });
}

export default prisma;