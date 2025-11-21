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
import { logger } from '@/lib/logger';

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
    logger.info('Starting payout reconciliation', { operation: 'stripe.reconciliation.start', payoutId, stripeAccountId });
    
    // Fetch all balance transactions for this payout
    const balanceTransactions = await fetchAllBalanceTransactions(payoutId, stripeAccountId);
    
    if (!balanceTransactions || balanceTransactions.length === 0) {
      logger.warn('No balance transactions found for payout', { operation: 'stripe.reconciliation.no_transactions', payoutId });
      return {
        success: false,
        error: 'No balance transactions found for this payout'
      };
    }
    
    logger.info('Found balance transactions for payout', { operation: 'stripe.reconciliation.transactions_found', payoutId, transactionCount: balanceTransactions.length });
    
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
    
    logger.info('Successfully reconciled payout', { operation: 'stripe.reconciliation.success', payoutId });
    logger.info('Reconciliation summary', { operation: 'stripe.reconciliation.summary', payoutId, ...summary });
    
    return {
      success: true,
      summary
    };
    
  } catch (error) {
    logger.error('Error reconciling payout', { operation: 'stripe.reconciliation.error', payoutId }, error instanceof Error ? error : new Error(String(error)));
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
        logger.warn('Unexpected transaction type', { operation: 'stripe.reconciliation.unexpected_type', transactionType: transaction.type, 
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
      include: { StripeConnectAccount: true }
    });

    if (!church?.StripeConnectAccount) {
      logger.error('No Stripe account found for church', { operation: 'stripe.reconciliation.no_account', churchId });
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
    
    logger.info('Found pending payouts for church', { operation: 'stripe.reconciliation.pending_payouts', churchId: church.id, churchName: church.name, payoutCount: pendingPayouts.length });
    
    // Reconcile each payout
    for (const payout of pendingPayouts) {
      await reconcilePayout(
        payout.stripePayoutId,
        church.StripeConnectAccount.stripeAccountId
      );
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info('Completed reconciliation for church', { operation: 'stripe.reconciliation.church_complete', churchId: church.id, churchName: church.name });
    
  } catch (error) {
    logger.error('Error reconciling payouts for church', { operation: 'stripe.reconciliation.church_error', churchId }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Reconcile all payouts across all churches (for cron job)
 */
export async function reconcileAllPendingPayouts(): Promise<void> {
  try {
    logger.info('Starting global payout reconciliation', { operation: 'stripe.reconciliation.global_start' });
    
    // Find all churches with pending reconciliations
    const churchesWithPendingPayouts = await prisma.church.findMany({
      where: {
        PayoutSummary: {
          some: {
            status: 'paid',
            reconciledAt: null
          }
        }
      },
      select: { id: true, name: true }
    });
    
    logger.info('Found churches with pending payouts', { operation: 'stripe.reconciliation.global_churches', churchCount: churchesWithPendingPayouts.length });
    
    // Process each church
    for (const church of churchesWithPendingPayouts) {
      logger.info('Processing church reconciliation', { operation: 'stripe.reconciliation.processing_church', churchId: church.id, churchName: church.name });
      await reconcilePendingPayouts(church.id);
    }
    
    logger.info('Global reconciliation completed', { operation: 'stripe.reconciliation.global_complete' });
    
  } catch (error) {
    logger.error('Error in global reconciliation', { operation: 'stripe.reconciliation.global_error' }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}