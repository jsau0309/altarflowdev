import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { reconcilePendingPayouts } from '@/lib/stripe-reconciliation';
import { prisma } from '@/lib/db';

/**
 * POST /api/reconcile
 * 
 * Manually trigger payout reconciliation
 * - If churchId is provided, reconcile only that church's payouts
 * - If no churchId, reconcile all pending payouts (admin only)
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
    const { churchId, payoutId } = body;
    
    // If specific payout ID is provided, reconcile just that one
    if (payoutId) {
      console.log(`[API] Manual reconciliation requested for payout ${payoutId}`);
      
      // Verify the payout belongs to the user's church
      const payout = await prisma.payoutSummary.findUnique({
        where: { stripePayoutId: payoutId },
        include: { 
          church: {
            include: { stripeConnectAccount: true }
          }
        }
      });
      
      if (!payout) {
        return NextResponse.json(
          { error: 'Payout not found' },
          { status: 404 }
        );
      }
      
      // Check if user has access to this church
      if (payout.church.clerkOrgId !== orgId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      if (!payout.church.stripeConnectAccount) {
        return NextResponse.json(
          { error: 'Stripe account not connected' },
          { status: 400 }
        );
      }
      
      // Import the specific reconcile function
      const { reconcilePayout } = await import('@/lib/stripe-reconciliation');
      const result = await reconcilePayout(
        payoutId,
        payout.church.stripeConnectAccount.stripeAccountId
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Reconciliation failed' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: `Payout ${payoutId} reconciled successfully`,
        summary: result.summary
      });
    }
    
    // If churchId is provided, reconcile all pending payouts for that church
    if (churchId) {
      console.log(`[API] Manual reconciliation requested for church ${churchId}`);
      
      // Verify the church belongs to the user's organization
      const church = await prisma.church.findUnique({
        where: { id: churchId }
      });
      
      if (!church || church.clerkOrgId !== orgId) {
        return NextResponse.json(
          { error: 'Church not found or access denied' },
          { status: 403 }
        );
      }
      
      await reconcilePendingPayouts(churchId);
      
      return NextResponse.json({
        success: true,
        message: `Reconciliation completed for church ${church.name}`
      });
    }
    
    // Global reconciliation is disabled for security
    // Each church must reconcile their own payouts individually
    return NextResponse.json(
      { error: 'Must specify churchId or payoutId for reconciliation' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[API] Reconciliation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during reconciliation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reconcile
 * 
 * Get reconciliation status for the current church
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
    
    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true, name: true }
    });
    
    if (!church) {
      return NextResponse.json(
        { error: 'Church not found' },
        { status: 404 }
      );
    }
    
    // Get payout summary statistics
    const [totalPayouts, reconciledPayouts, pendingPayouts, failedPayouts] = await Promise.all([
      prisma.payoutSummary.count({
        where: { churchId: church.id }
      }),
      prisma.payoutSummary.count({
        where: { 
          churchId: church.id,
          reconciledAt: { not: null }
        }
      }),
      prisma.payoutSummary.count({
        where: { 
          churchId: church.id,
          status: 'paid',
          reconciledAt: null
        }
      }),
      prisma.payoutSummary.count({
        where: { 
          churchId: church.id,
          status: 'failed'
        }
      })
    ]);
    
    // Get recent payouts
    const recentPayouts = await prisma.payoutSummary.findMany({
      where: { churchId: church.id },
      orderBy: { payoutDate: 'desc' },
      take: 10,
      select: {
        id: true,
        stripePayoutId: true,
        payoutDate: true,
        arrivalDate: true,
        amount: true,
        status: true,
        reconciledAt: true,
        transactionCount: true,
        grossVolume: true,
        totalFees: true,
        netAmount: true
      }
    });
    
    return NextResponse.json({
      success: true,
      churchId: church.id,
      churchName: church.name,
      statistics: {
        total: totalPayouts,
        reconciled: reconciledPayouts,
        pending: pendingPayouts,
        failed: failedPayouts
      },
      recentPayouts
    });
    
  } catch (error) {
    console.error('[API] Error fetching reconciliation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation status' },
      { status: 500 }
    );
  }
}