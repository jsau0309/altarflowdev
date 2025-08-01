import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Configure connection pool via connection string parameters
// Add these to your DATABASE_URL in production:
// ?connection_limit=10&pool_timeout=30&connect_timeout=30
// Example: postgresql://user:pass@host:5432/db?connection_limit=10

export const prisma = 
  global.prisma ||
  new PrismaClient({
    // log: ['query'], // Uncomment to see Prisma queries in console
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma 