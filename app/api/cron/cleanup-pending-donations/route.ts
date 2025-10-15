import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";

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

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret && process.env.NODE_ENV === "production") {
      console.error("[Cleanup Pending Donations] CRON_SECRET is not configured in production!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log(
      `[Cleanup Pending Donations] Starting cleanup for transactions created before ${sevenDaysAgo.toISOString()}`
    );

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
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const stripeStatus = paymentIntent.status;

        let targetStatus: string | null = null;
        if (stripeStatus === "succeeded") {
          targetStatus = "succeeded";
        } else if (stripeStatus === "processing" || stripeStatus === "requires_capture") {
          targetStatus = "processing";
        } else if (INCOMPLETE_STATUSES.has(stripeStatus)) {
          targetStatus = "canceled";
        }

        if (!targetStatus) {
          console.log(
            `[Cleanup Pending Donations] Skipping transaction ${transaction.id}. PaymentIntent ${paymentIntentId} is in status ${stripeStatus}.`
          );
          continue;
        }

        if (targetStatus === transaction.status) {
          continue;
        }

        const updateData: Prisma.DonationTransactionUpdateInput = {
          status: targetStatus,
        };

        if (targetStatus === "canceled") {
          updateData.processedAt = paymentIntent.canceled_at
            ? new Date(paymentIntent.canceled_at * 1000)
            : new Date();
        } else if (targetStatus === "succeeded") {
          const latestCharge = paymentIntent.charges?.data?.[0];
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

        console.log(
          `[Cleanup Pending Donations] Updated transaction ${transaction.id} to ${targetStatus} (PaymentIntent ${paymentIntentId}).`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const stripeError = error as { code?: string };

        if (stripeError?.code === "resource_missing") {
          console.warn(
            `[Cleanup Pending Donations] PaymentIntent ${paymentIntentId} not found. Marking transaction ${transaction.id} as canceled.`
          );

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
            console.error(
              `[Cleanup Pending Donations] Failed to mark transaction ${transaction.id} as canceled after missing PaymentIntent ${paymentIntentId}:`,
              dbError
            );
            errors.push({
              id: transaction.id,
              paymentIntentId,
              error: `${message}; follow-up error: ${dbMessage}`,
            });
            continue;
          }
        }

        console.error(
          `[Cleanup Pending Donations] Error updating transaction ${transaction.id} with PaymentIntent ${paymentIntentId}:`,
          error
        );
        errors.push({ id: transaction.id, paymentIntentId, error: message });
      }
    }

    console.log(
      `[Cleanup Pending Donations] Completed cleanup. Checked ${staleTransactions.length} transactions, updated ${updatedCount}, canceled ${canceledCount}. Errors: ${errors.length}`
    );

    return NextResponse.json({
      success: true,
      checked: staleTransactions.length,
      updated: updatedCount,
      canceled: canceledCount,
      errors,
    });
  } catch (error) {
    console.error("[Cleanup Pending Donations] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup pending donations" },
      { status: 500 }
    );
  }
}
