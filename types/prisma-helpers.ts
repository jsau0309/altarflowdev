/**
 * Prisma helper types for transactions and retry logic
 */

import type { PrismaClient, Prisma } from '@prisma/client';

/**
 * Type for Prisma transaction client passed to $transaction callbacks
 * This omits methods that aren't available inside a transaction
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Interface for errors that can be retried in database operations
 */
export interface RetryableError {
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Type guard to check if an error is a Prisma client known request error
 */
export function isPrismaClientKnownRequestError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Type for database operation that can be retried
 */
export type RetryableOperation<T> = () => Promise<T>;

/**
 * Type for transaction operation callback
 */
export type TransactionOperation<T> = (tx: TransactionClient) => Promise<T>;
