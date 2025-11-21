import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';
import { executeCronJob, verifyCronAuth } from '@/lib/sentry-cron';

// Stripe statuses that indicate the payment was abandoned or cannot be completed
const INCOMPLETE_STATUSES = new Set([
  "canceled",           // Explicitly canceled by user or system
  "incomplete",         // Payment started but not completed (user closed page)
  "requires_payment_method", // Payment failed, needs new payment method
  "requires_confirmation",   // Requires 3DS confirmation (abandoned)
  "requires_action",    // Requires user action (abandoned)
  "requires_source_action", // Legacy: requires source action
  "requires_source",    // Legacy: requires source
]);

// This cron job runs weekly to cleanup stale pending donations
// Schedule: Every Sunday at 3:00 AM UTC (0 3 * * 0)
export async function GET() {
  // Verify cron authentication
  const authError = await verifyCronAuth();
  if (authError) return authError;

  // Execute cron job with Sentry monitoring
  return executeCronJob({
    monitorSlug: 'cleanup-pending-donations',
    schedule: '0 3 * * 0',
    maxRuntimeMinutes: 10,
  }, async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    logger.info('Starting cleanup for pending donations', {
      operation: 'cron.cleanup_pending_donations.start',
      cutoffDate: sevenDaysAgo.toISOString()
    });

    const staleTransactions = await prisma.donationTransaction.findMany({
      where: {
        status: "pending",
        transactionDate: { lt: sevenDaysAgo },
        stripePaymentIntentId: { not: null },
      },
      select: {
        id: true,
        stripePaymentIntentId: true,
        status: true,
      },
    });

    let updatedCount = 0;
    let canceledCount = 0;
    const errors: Array<{ id: string; paymentIntentId: string; error: string }> = [];

    for (const transaction of staleTransactions) {
      const paymentIntentId = transaction.stripePaymentIntentId;

      if (!paymentIntentId) {
        continue;
      }

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["charges"],
        });
        const paymentIntentData = paymentIntent as Stripe.PaymentIntent & {
          charges?: Stripe.ApiList<Stripe.Charge>;
        };
        const stripeStatus = paymentIntentData.status;

        let targetStatus: string | null = null;
        if (stripeStatus === "succeeded") {
          targetStatus = "succeeded";
        } else if (stripeStatus === "processing" || stripeStatus === "requires_capture") {
          targetStatus = "processing";
        } else if (INCOMPLETE_STATUSES.has(stripeStatus)) {
          targetStatus = "canceled";
        }

        if (!targetStatus) {
          logger.debug('Skipping transaction - no target status mapping', {
            operation: 'cron.cleanup_pending_donations.skip',
            transactionId: transaction.id,
            paymentIntentId,
            stripeStatus
          });
          continue;
        }

        if (targetStatus === transaction.status) {
          continue;
        }

        const updateData: Prisma.DonationTransactionUpdateInput = {
          status: targetStatus,
        };

        if (targetStatus === "canceled") {
          updateData.processedAt = paymentIntentData.canceled_at
            ? new Date(paymentIntentData.canceled_at * 1000)
            : new Date();
        } else if (targetStatus === "succeeded") {
          const latestCharge = paymentIntentData.charges?.data?.[0];
          updateData.processedAt = latestCharge?.created
            ? new Date(latestCharge.created * 1000)
            : new Date();
        } else if (targetStatus === "failed") {
          updateData.processedAt = new Date();
        }

        await prisma.donationTransaction.update({
          where: { id: transaction.id },
          data: updateData,
        });

        updatedCount += 1;
        if (targetStatus === "canceled") {
          canceledCount += 1;
        }

        logger.info('Updated transaction status', {
          operation: 'cron.cleanup_pending_donations.update',
          transactionId: transaction.id,
          targetStatus,
          paymentIntentId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const stripeError = error as { code?: string };

        if (stripeError?.code === "resource_missing") {
          logger.warn('PaymentIntent not found - marking transaction as canceled', {
            operation: 'cron.cleanup_pending_donations.missing_intent',
            paymentIntentId,
            transactionId: transaction.id
          });

          try {
            await prisma.donationTransaction.update({
              where: { id: transaction.id },
              data: {
                status: "canceled",
                processedAt: new Date(),
              },
            });

            updatedCount += 1;
            canceledCount += 1;
            continue;
          } catch (dbError) {
            const dbMessage = dbError instanceof Error ? dbError.message : "Unknown error";
            logger.error('Failed to mark transaction as canceled after missing PaymentIntent', {
              operation: 'cron.cleanup_pending_donations.cancel_error',
              transactionId: transaction.id,
              paymentIntentId
            }, dbError instanceof Error ? dbError : new Error(String(dbError)));
            errors.push({
              id: transaction.id,
              paymentIntentId,
              error: `${message}; follow-up error: ${dbMessage}`,
            });
            continue;
          }
        }

        logger.error('Error updating transaction', {
          operation: 'cron.cleanup_pending_donations.update_error',
          transactionId: transaction.id,
          paymentIntentId
        }, error instanceof Error ? error : new Error(String(error)));
        errors.push({ id: transaction.id, paymentIntentId, error: message });
      }
    }

    logger.info('Completed cleanup for pending donations', {
      operation: 'cron.cleanup_pending_donations.complete',
      checked: staleTransactions.length,
      updated: updatedCount,
      canceled: canceledCount,
      errors: errors.length
    });

    return NextResponse.json({
      success: true,
      checked: staleTransactions.length,
      updated: updatedCount,
      canceled: canceledCount,
      errors,
    });
  });
}
