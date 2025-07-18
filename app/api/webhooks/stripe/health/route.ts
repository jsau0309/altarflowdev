import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function GET() {
  const health = {
    status: 'checking' as 'checking' | 'healthy' | 'unhealthy' | 'degraded',
    checks: {
      database: { status: 'pending' as 'pending' | 'healthy' | 'unhealthy', message: '' },
      stripe: { status: 'pending' as 'pending' | 'healthy' | 'unhealthy', message: '' },
      webhookSecret: { status: 'pending' as 'pending' | 'healthy' | 'unhealthy' | 'warning', message: '' },
      recentWebhooks: { 
        status: 'pending' as 'pending' | 'healthy' | 'unhealthy' | 'warning', 
        message: '', 
        data: null as null | {
          total: number;
          succeeded: number;
          pending: number;
          failed: number;
          processing: number;
        }
      },
    },
    timestamp: new Date().toISOString(),
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database.status = 'healthy';
    health.checks.database.message = 'Database connection successful';
  } catch (error) {
    health.checks.database.status = 'unhealthy';
    health.checks.database.message = `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Check Stripe connection
  try {
    const balance = await stripe.balance.retrieve();
    health.checks.stripe.status = 'healthy';
    health.checks.stripe.message = `Stripe connection successful. Available balance: ${balance.available?.[0]?.amount || 0} ${balance.available?.[0]?.currency || 'USD'}`;
  } catch (error) {
    health.checks.stripe.status = 'unhealthy';
    health.checks.stripe.message = `Stripe connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Check webhook secret configuration
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    health.checks.webhookSecret.status = 'unhealthy';
    health.checks.webhookSecret.message = 'STRIPE_WEBHOOK_SECRET not configured';
  } else if (webhookSecret.startsWith('whsec_')) {
    health.checks.webhookSecret.status = 'healthy';
    health.checks.webhookSecret.message = `Webhook secret configured (${webhookSecret.substring(0, 10)}...)`;
  } else {
    health.checks.webhookSecret.status = 'warning';
    health.checks.webhookSecret.message = 'Webhook secret configured but does not match expected format';
  }

  // Check recent webhook processing
  try {
    const recentTransactions = await prisma.donationTransaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        stripePaymentIntentId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const summary = {
      total: recentTransactions.length,
      succeeded: recentTransactions.filter(t => t.status === 'succeeded').length,
      pending: recentTransactions.filter(t => t.status === 'pending').length,
      failed: recentTransactions.filter(t => t.status === 'failed').length,
      processing: recentTransactions.filter(t => t.status === 'processing').length,
    };

    health.checks.recentWebhooks.status = summary.pending > summary.succeeded ? 'warning' : 'healthy';
    health.checks.recentWebhooks.message = `Last 24h: ${summary.total} transactions (${summary.succeeded} succeeded, ${summary.pending} pending)`;
    health.checks.recentWebhooks.data = summary;
  } catch (error) {
    health.checks.recentWebhooks.status = 'unhealthy';
    health.checks.recentWebhooks.message = `Failed to check recent transactions: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Overall status
  const allChecks = Object.values(health.checks);
  if (allChecks.some(check => check.status === 'unhealthy')) {
    health.status = 'unhealthy';
  } else if (allChecks.some(check => check.status === 'warning')) {
    health.status = 'degraded';
  } else {
    health.status = 'healthy';
  }

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}