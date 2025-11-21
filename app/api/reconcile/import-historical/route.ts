import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

/**
 * POST /api/reconcile/import-historical
 * 
 * Import historical payouts from Stripe for testing/backfilling
 * This will fetch past payouts and populate the PayoutSummary table
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { limit = 10, startDate, endDate } = body;
    
    logger.info('[Import] Starting historical payout import...', { operation: 'api.info' });
    
    // Find the church and its Stripe account
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      include: { StripeConnectAccount: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found' },
        { status: 404 }
      );
    }

    if (!church.StripeConnectAccount) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please complete onboarding first.' },
        { status: 400 }
      );
    }

    const stripeAccountId = church.StripeConnectAccount.stripeAccountId;
    logger.info(`[Import] Fetching payouts for account: ${stripeAccountId}`, { operation: 'api.info' });
    
    // Build query parameters
    const queryParams: Stripe.PayoutListParams = {
      limit: Math.min(limit, 100), // Stripe max is 100
    };
    
    if (startDate) {
      queryParams.created = {
        ...(typeof queryParams.created === 'object' ? queryParams.created : {}),
        gte: Math.floor(new Date(startDate).getTime() / 1000)
      } as Stripe.RangeQueryParam;
    }

    if (endDate) {
      queryParams.created = {
        ...(typeof queryParams.created === 'object' ? queryParams.created : {}),
        lte: Math.floor(new Date(endDate).getTime() / 1000)
      } as Stripe.RangeQueryParam;
    }
    
    // Fetch payouts from Stripe
    let payouts: Stripe.Payout[] = [];
    try {
      const stripePayouts = await stripe.payouts.list(
        queryParams,
        {
          stripeAccount: stripeAccountId
        }
      );
      payouts = stripePayouts.data;
      logger.info(`[Import] Found ${payouts.length} payouts from Stripe`, { operation: 'api.info' });
    } catch (stripeError) {
      logger.error('[Import] Error fetching payouts from Stripe:', { operation: 'api.error' }, stripeError instanceof Error ? stripeError : new Error(String(stripeError)));

      // If no payouts exist yet, that's okay
      if (stripeError instanceof Stripe.errors.StripeError &&
          (stripeError.code === 'resource_missing' || stripeError.statusCode === 404)) {
        return NextResponse.json({
          success: true,
          message: 'No payouts found in your Stripe account yet. Payouts will appear here once you start processing donations.',
          imported: 0,
          skipped: 0
        });
      }


      return NextResponse.json(
        { error: `Failed to fetch payouts from Stripe: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    if (payouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No payouts found for the specified period.',
        imported: 0,
        skipped: 0
      });
    }
    
    // Import each payout
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const payout of payouts) {
      try {
        // Check if payout already exists
        const existing = await prisma.payoutSummary.findUnique({
          where: { stripePayoutId: payout.id }
        });
        
        if (existing) {
          logger.info(`[Import] Payout ${payout.id} already exists, updating...`, { operation: 'api.info' });
          
          // Update existing payout with latest status
          await prisma.payoutSummary.update({
            where: { stripePayoutId: payout.id },
            data: {
              status: payout.status,
              failureReason: payout.failure_message || null,
              updatedAt: new Date()
            }
          });
          
          skipped++;
        } else {
          logger.info(`[Import] Creating new payout record for ${payout.id}`, { operation: 'api.info' });
          
          // Create new payout record
          await prisma.payoutSummary.create({
            data: {
              stripePayoutId: payout.id,
              churchId: church.id,
              payoutDate: new Date(payout.created * 1000),
              arrivalDate: new Date(payout.arrival_date * 1000),
              amount: payout.amount,
              currency: payout.currency,
              status: payout.status,
              failureReason: payout.failure_message || null,
              payoutSchedule: payout.automatic ? 'automatic' : 'manual',
              netAmount: payout.amount, // Initially set to payout amount
              metadata: (payout.metadata as Stripe.Metadata) || null,
              // Transaction details will be populated by reconciliation
              transactionCount: 0,
              grossVolume: 0,
              totalFees: 0,
              totalRefunds: 0,
              totalDisputes: 0,
              updatedAt: new Date()
            }
          });
          
          imported++;
        }
        
        // If payout is already paid and not reconciled, trigger reconciliation
        if (payout.status === 'paid') {
          const payoutRecord = await prisma.payoutSummary.findUnique({
            where: { stripePayoutId: payout.id }
          });
          
          if (payoutRecord && !payoutRecord.reconciledAt) {
            logger.info(`[Import] Triggering reconciliation for paid payout ${payout.id}`, { operation: 'api.info' });
            
            // Import reconciliation function
            const { reconcilePayout } = await import('@/lib/stripe-reconciliation');
            
            // Run reconciliation asynchronously
            reconcilePayout(payout.id, stripeAccountId)
              .then(result => {
                if (result.success) {
                  logger.info(`[Import] Successfully reconciled payout ${payout.id}`, { operation: 'api.reconcile.import_success' });
                } else {
                  logger.error(`[Import] Failed to reconcile payout ${payout.id}`, { operation: 'api.reconcile.import_failed', error: result.error });
                }
              })
              .catch(error => {
                logger.error(`[Import] Error reconciling payout ${payout.id}:`, { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
              });
          }
        }
        
      } catch (error) {
        const errorMsg = `Failed to import payout ${payout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(`[Import] ${errorMsg}`, { operation: 'api.error' });
        errors.push(errorMsg);
      }
    }
    
    const message = `Import complete: ${imported} new payouts imported, ${skipped} already existed${errors.length > 0 ? `, ${errors.length} errors` : ''}`;
    logger.info(`[Import] ${message}`, { operation: 'api.info' });
    
    return NextResponse.json({
      success: true,
      message,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: payouts.length
    });
    
  } catch (error) {
    logger.error('[Import] Unexpected error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reconcile/import-historical
 * 
 * Get information about what would be imported
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find the church and its Stripe account
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      include: { StripeConnectAccount: true }
    });

    if (!church?.StripeConnectAccount) {
      return NextResponse.json({
        hasStripeAccount: false,
        message: 'No Stripe Connect account found. Complete onboarding first.'
      });
    }
    
    // Get count of existing payouts in database
    const existingCount = await prisma.payoutSummary.count({
      where: { churchId: church.id }
    });
    
    // Try to get a sample of recent payouts from Stripe
    let availableInStripe = 0;
    let oldestPayout: Date | null = null;
    let newestPayout: Date | null = null;
    
    try {
      const stripePayouts = await stripe.payouts.list(
        { limit: 100 },
        { stripeAccount: church.StripeConnectAccount.stripeAccountId }
      );
      
      availableInStripe = stripePayouts.data.length;

      if (stripePayouts.data.length > 0) {
        // Get date range
        const dates = stripePayouts.data.map(p => new Date(p.created * 1000));
        oldestPayout = new Date(Math.min(...dates.map(d => d.getTime())));
        newestPayout = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    } catch {
      logger.info('[Import] No payouts available in Stripe account yet', { operation: 'api.info' });
    }
    
    return NextResponse.json({
      hasStripeAccount: true,
      existingInDatabase: existingCount,
      availableInStripe,
      dateRange: oldestPayout && newestPayout ? {
        oldest: oldestPayout.toISOString(),
        newest: newestPayout.toISOString()
      } : null,
      message: availableInStripe > 0 
        ? `Found ${availableInStripe} payouts available to import from Stripe`
        : 'No payouts found in your Stripe account yet'
    });
    
  } catch (error) {
    logger.error('[Import] Error checking import status:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to check import status' },
      { status: 500 }
    );
  }
}