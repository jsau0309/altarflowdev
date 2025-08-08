/**
 * Stripe Payout Reconciliation Functions
 * 
 * These functions handle the reconciliation of Stripe payouts by:
 * 1. Fetching all balance transactions for a payout
 * 2. Calculating totals (gross, fees, refunds, disputes)
 * 3. Updating the PayoutSummary with detailed breakdowns
 */

import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

interface ReconciliationResult {
  success: boolean;
  error?: string;
  summary?: {
    transactionCount: number;
    grossVolume: number;
    totalFees: number;
    totalRefunds: number;
    totalDisputes: number;
    netAmount: number;
  };
}

/**
 * Reconcile a single payout by fetching all its balance transactions
 * @param payoutId - The Stripe payout ID
 * @param stripeAccountId - The connected account ID
 */
export async function reconcilePayout(
  payoutId: string,
  stripeAccountId: string
): Promise<ReconciliationResult> {
  try {
    console.log(`[Reconciliation] Starting reconciliation for payout ${payoutId}`);
    
    // Fetch all balance transactions for this payout
    const balanceTransactions = await fetchAllBalanceTransactions(payoutId, stripeAccountId);
    
    if (!balanceTransactions || balanceTransactions.length === 0) {
      console.warn(`[Reconciliation] No balance transactions found for payout ${payoutId}`);
      return {
        success: false,
        error: 'No balance transactions found for this payout'
      };
    }
    
    console.log(`[Reconciliation] Found ${balanceTransactions.length} transactions for payout ${payoutId}`);
    
    // Calculate totals from balance transactions
    const summary = calculatePayoutSummary(balanceTransactions);
    
    // Update the PayoutSummary record with detailed information
    await prisma.payoutSummary.update({
      where: { stripePayoutId: payoutId },
      data: {
        transactionCount: summary.transactionCount,
        grossVolume: summary.grossVolume,
        totalFees: summary.totalFees,
        totalRefunds: summary.totalRefunds,
        totalDisputes: summary.totalDisputes,
        netAmount: summary.netAmount,
        reconciledAt: new Date()
      }
    });
    
    console.log(`[Reconciliation] Successfully reconciled payout ${payoutId}`);
    console.log(`[Reconciliation] Summary:`, summary);
    
    return {
      success: true,
      summary
    };
    
  } catch (error) {
    console.error(`[Reconciliation] Error reconciling payout ${payoutId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during reconciliation'
    };
  }
}

/**
 * Fetch all balance transactions for a payout with pagination
 */
async function fetchAllBalanceTransactions(
  payoutId: string,
  stripeAccountId: string
): Promise<Stripe.BalanceTransaction[]> {
  const transactions: Stripe.BalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  
  while (hasMore) {
    const batch = await stripe.balanceTransactions.list(
      {
        payout: payoutId,
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter })
      },
      {
        stripeAccount: stripeAccountId
      }
    );
    
    transactions.push(...batch.data);
    hasMore = batch.has_more;
    
    if (batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    }
  }
  
  return transactions;
}

/**
 * Calculate summary totals from balance transactions
 */
function calculatePayoutSummary(transactions: Stripe.BalanceTransaction[]) {
  let transactionCount = 0;
  let grossVolume = 0;
  let totalFees = 0;
  let totalRefunds = 0;
  let totalDisputes = 0;
  
  for (const transaction of transactions) {
    transactionCount++;
    
    switch (transaction.type) {
      case 'charge':
        // Regular charge - add to gross volume
        grossVolume += transaction.amount;
        totalFees += transaction.fee;
        break;
        
      case 'refund':
        // Refund - this reduces the payout
        totalRefunds += Math.abs(transaction.amount);
        // Refunds also reverse the fees
        totalFees += transaction.fee; // This will be negative, reducing total fees
        break;
        
      case 'adjustment':
        // Dispute or other adjustment
        if (transaction.reporting_category === 'dispute') {
          totalDisputes += Math.abs(transaction.amount);
        }
        break;
        
      case 'payment':
        // ACH or other payment type
        grossVolume += transaction.amount;
        totalFees += transaction.fee;
        break;
        
      default:
        // Log unexpected transaction types for debugging
        console.log(`[Reconciliation] Unexpected transaction type: ${transaction.type}`, {
          id: transaction.id,
          amount: transaction.amount,
          fee: transaction.fee
        });
    }
  }
  
  // Calculate net amount (what actually gets deposited)
  const netAmount = grossVolume - totalFees - totalRefunds - totalDisputes;
  
  return {
    transactionCount,
    grossVolume,
    totalFees,
    totalRefunds,
    totalDisputes,
    netAmount
  };
}

/**
 * Reconcile all pending payouts for a church
 */
export async function reconcilePendingPayouts(churchId: string): Promise<void> {
  try {
    // Find the church's Stripe account
    const church = await prisma.church.findUnique({
      where: { id: churchId },
      include: { stripeConnectAccount: true }
    });
    
    if (!church?.stripeConnectAccount) {
      console.error(`[Reconciliation] No Stripe account found for church ${churchId}`);
      return;
    }
    
    // Find all payouts that haven't been reconciled yet
    const pendingPayouts = await prisma.payoutSummary.findMany({
      where: {
        churchId,
        status: 'paid',
        reconciledAt: null
      }
    });
    
    console.log(`[Reconciliation] Found ${pendingPayouts.length} pending payouts for church ${church.name}`);
    
    // Reconcile each payout
    for (const payout of pendingPayouts) {
      await reconcilePayout(
        payout.stripePayoutId,
        church.stripeConnectAccount.stripeAccountId
      );
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[Reconciliation] Completed reconciliation for church ${church.name}`);
    
  } catch (error) {
    console.error(`[Reconciliation] Error reconciling payouts for church ${churchId}:`, error);
    throw error;
  }
}

/**
 * Reconcile all payouts across all churches (for cron job)
 */
export async function reconcileAllPendingPayouts(): Promise<void> {
  try {
    console.log('[Reconciliation] Starting global payout reconciliation...');
    
    // Find all churches with pending reconciliations
    const churchesWithPendingPayouts = await prisma.church.findMany({
      where: {
        payoutSummaries: {
          some: {
            status: 'paid',
            reconciledAt: null
          }
        }
      },
      select: { id: true, name: true }
    });
    
    console.log(`[Reconciliation] Found ${churchesWithPendingPayouts.length} churches with pending payouts`);
    
    // Process each church
    for (const church of churchesWithPendingPayouts) {
      console.log(`[Reconciliation] Processing church: ${church.name}`);
      await reconcilePendingPayouts(church.id);
    }
    
    console.log('[Reconciliation] Global reconciliation completed');
    
  } catch (error) {
    console.error('[Reconciliation] Error in global reconciliation:', error);
    throw error;
  }
}