import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Simple in-memory rate limiting for health endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Health Check Endpoint
 *
 * Returns 200 OK if all critical services are healthy
 * Used by uptime monitors (Vercel, UptimeRobot, etc.)
 *
 * Rate limited to 60 requests per minute per IP
 *
 * @endpoint GET /api/health
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
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
