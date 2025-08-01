import { Prisma } from '@prisma/client'

// Middleware to handle connection errors gracefully
export const connectionErrorMiddleware: Prisma.Middleware = async (params, next) => {
  try {
    return await next(params)
  } catch (error: any) {
    // Check if it's a connection error
    if (
      error.code === 'P1001' || // Can't reach database server
      error.code === 'P1002' || // Database server timeout
      error.message?.includes('Connection pool timeout') ||
      error.message?.includes('Error in PostgreSQL connection')
    ) {
      console.warn('[Prisma] Connection error detected, retrying...', {
        model: params.model,
        action: params.action,
      })
      
      // Wait a moment before retrying
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Retry once
      try {
        return await next(params)
      } catch (retryError) {
        console.error('[Prisma] Retry failed:', retryError)
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