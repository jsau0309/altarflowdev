import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Health Check Endpoint
 *
 * Returns 200 OK if all critical services are healthy
 * Used by uptime monitors (Vercel, UptimeRobot, etc.)
 *
 * @endpoint GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {};

  // Check 1: Database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      duration: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Check 2: Environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  checks.environment = {
    status: missingEnvVars.length === 0 ? 'ok' : 'error',
    message: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : undefined,
  };

  // Check 3: External services (optional - can add Stripe, Resend, etc.)
  // Skipping to avoid rate limits on health checks

  // Overall health status
  const allHealthy = Object.values(checks).every((check) => check.status === 'ok');
  const status = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      responseTime: Date.now() - startTime,
    },
    { status }
  );
}
