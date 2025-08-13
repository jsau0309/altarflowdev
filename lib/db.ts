import { PrismaClient } from '@prisma/client';
import { connectionErrorMiddleware } from './prisma-middleware';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create Prisma client with optimized configuration
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Optimized connection configuration
    transactionOptions: {
      maxWait: 5000, // 5 seconds max wait for transaction
      timeout: 15000, // 15 seconds transaction timeout
    },
  });

  // Add connection error middleware (if needed for older Prisma versions)
  // Note: Prisma 5.x+ has built-in connection pooling improvements
  if (process.env.NODE_ENV === 'development') {
    client.$use(connectionErrorMiddleware);
  }

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Enhanced utility function for retry logic on critical operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      // Enhanced retry conditions for connection and timeout errors
      const isRetryableError = 
        error?.code === 'P2024' || // Timed out fetching a new connection from the connection pool
        error?.code === 'P1017' || // Server has closed the connection
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1002' || // Database server timeout
        error?.code === 'P2034' || // Transaction failed due to a write conflict or a deadlock
        error?.message?.includes('Connection terminated unexpectedly') ||
        error?.message?.includes('Connection reset by peer') ||
        error?.message?.includes('Server closed the connection') ||
        error?.message?.includes('Connection pool timeout') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('ETIMEDOUT');

      if (isRetryableError) {
        retries++;
        console.warn(`Database connection error (attempt ${retries}/${maxRetries}):`, {
          code: error.code,
          message: error.message,
        });
        
        if (retries >= maxRetries) {
          console.error('Max retries exceeded for database operation:', error);
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
export async function withRetryTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  return withRetry(async () => {
    return prisma.$transaction(async (tx) => {
      return operation(tx as PrismaClient);
    }, {
      maxWait: 5000, // 5 seconds max wait
      timeout: 15000, // 15 seconds timeout
    });
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
    console.error('Database health check failed:', error);
    return { healthy: false };
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await prisma.$disconnect();
});

export default prisma;