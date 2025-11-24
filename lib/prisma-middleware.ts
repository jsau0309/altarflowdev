import { logger } from '@/lib/logger';

// NOTE: This file is deprecated and kept for backwards compatibility only.
// Prisma 5.x+ removed the $use middleware API in favor of Prisma Client Extensions.
// The connection error handling is now built into Prisma and handled by the withRetry
// utility function in lib/db.ts

// Legacy middleware type (no longer available in Prisma 5+)
type LegacyMiddlewareParams = {
  model?: string;
  action: string;
  args?: any;
  dataPath?: string[];
  runInTransaction?: boolean;
};

type LegacyNext = (params: LegacyMiddlewareParams) => Promise<any>;

// Enhanced middleware to handle connection errors gracefully (DEPRECATED)
export const connectionErrorMiddleware = async (params: LegacyMiddlewareParams, next: LegacyNext) => {
  try {
    return await next(params)
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    // Enhanced connection error detection
    const isConnectionError = 
      err.code === 'P1001' || // Can't reach database server
      err.code === 'P1002' || // Database server timeout  
      err.code === 'P2024' || // Timed out fetching a new connection from the connection pool
      err.code === 'P1017' || // Server has closed the connection
      err.message?.includes('Connection pool timeout') ||
      err.message?.includes('Error in PostgreSQL connection') ||
      err.message?.includes('Connection terminated unexpectedly') ||
      err.message?.includes('Connection reset by peer') ||
      err.message?.includes('Server closed the connection');
      
    if (isConnectionError) {
      logger.warn('Prisma connection error - retrying', { operation: 'database.prisma_retry', 
        model: params.model,
        action: params.action,
        error: err.code || err.message,
      })
      
      // Exponential backoff with jitter
      const delay = 100 + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry once with enhanced error handling
      try {
        return await next(params)
      } catch (retryError) {
        logger.error('Prisma retry failed', { operation: 'database.prisma_retry_failed', 
          model: params.model,
          action: params.action,
          originalError: err.code || err.message,
          retryError: (retryError as Error).message,
        });
        throw retryError
      }
    }
    
    throw error
  }
}

// Prisma connection pool configuration recommendations
export const connectionPoolConfig = {
  // Add these to your DATABASE_URL:
  connection_limit: 10,      // Maximum number of connections
  pool_timeout: 30,          // Seconds to wait for a connection
  connect_timeout: 30,       // Seconds to wait for initial connection
  idle_in_transaction_session_timeout: 10, // Kill idle transactions
  statement_timeout: 30000,  // Kill queries running longer than 30s
}