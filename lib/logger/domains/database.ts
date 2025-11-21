/**
 * Database Domain Logger
 *
 * Specialized logger for database operations with performance tracking.
 * ORM-agnostic design supports both Prisma and Drizzle.
 *
 * @example
 * ```typescript
 * import { databaseLogger } from '@/lib/logger/domains/database';
 *
 * databaseLogger.queryStart({
 *   model: 'donations',
 *   action: 'findMany',
 *   churchId: 'church_123'
 * });
 *
 * databaseLogger.queryComplete({
 *   model: 'donations',
 *   action: 'findMany',
 *   duration: 123,
 *   affectedRows: 50
 * });
 * ```
 */

import { logger, LogContext } from '../index';

export type DatabaseAction =
  | 'findMany'
  | 'findUnique'
  | 'findFirst'
  | 'create'
  | 'update'
  | 'delete'
  | 'upsert'
  | 'count'
  | 'aggregate'
  | 'groupBy'
  | 'select'
  | 'insert'
  | 'raw';

export interface DatabaseLogContext extends LogContext {
  model?: string;
  table?: string; // Drizzle compatibility
  action?: DatabaseAction;
  duration?: number;
  affectedRows?: number;
  query?: string;
  params?: unknown[];
  slow?: boolean;
  cached?: boolean;
  cacheHit?: boolean;
}

export const databaseLogger = {
  /**
   * Log when a database query starts
   */
  queryStart: (context: DatabaseLogContext) => {
    logger.debug('Database query started', {
      operation: 'db.query.start',
      ...context,
    });
  },

  /**
   * Log when a database query completes
   * Automatically detects slow queries (>1000ms)
   */
  queryComplete: (context: DatabaseLogContext) => {
    const isSlow = context.duration && context.duration > 1000;

    if (isSlow) {
      logger.warn('Slow database query detected', {
        operation: 'db.query.slow',
        slow: true,
        ...context,
      });
    } else {
      logger.debug('Database query completed', {
        operation: 'db.query.complete',
        ...context,
      });
    }
  },

  /**
   * Log when a database query fails
   */
  queryError: (context: DatabaseLogContext, error: Error) => {
    logger.error('Database query failed', {
      operation: 'db.query.error',
      ...context,
    }, error);
  },

  /**
   * Log database connection errors (critical)
   */
  connectionError: (error: Error, context?: LogContext) => {
    logger.fatal('Database connection failed', {
      operation: 'db.connection.error',
      ...context,
    }, error);
  },

  /**
   * Log when connection pool is exhausted
   */
  poolExhausted: (context: LogContext & { poolSize?: number; queueSize?: number }) => {
    logger.error('Database connection pool exhausted', {
      operation: 'db.pool.exhausted',
      ...context,
    });
  },

  /**
   * Log when a transaction starts
   */
  transactionStart: (context: LogContext & { transactionId?: string }) => {
    logger.debug('Database transaction started', {
      operation: 'db.transaction.start',
      ...context,
    });
  },

  /**
   * Log when a transaction commits
   */
  transactionCommit: (context: LogContext & { transactionId?: string; duration?: number }) => {
    logger.debug('Database transaction committed', {
      operation: 'db.transaction.commit',
      ...context,
    });
  },

  /**
   * Log when a transaction rolls back
   */
  transactionRollback: (
    context: LogContext & { transactionId?: string; reason?: string },
    error?: Error
  ) => {
    if (error) {
      logger.error('Database transaction rolled back', {
        operation: 'db.transaction.rollback',
        ...context,
      }, error);
    } else {
      logger.warn('Database transaction rolled back', {
        operation: 'db.transaction.rollback',
        ...context,
      });
    }
  },

  /**
   * Log migration events
   */
  migration: (context: LogContext & { migrationName: string; status: 'start' | 'success' | 'failed' }) => {
    const level = context.status === 'failed' ? 'error' : 'info';

    if (level === 'error') {
      logger.error('Database migration failed', {
        operation: 'db.migration',
        ...context,
      });
    } else {
      logger.info(`Database migration ${context.status}`, {
        operation: 'db.migration',
        ...context,
      });
    }
  },
};
