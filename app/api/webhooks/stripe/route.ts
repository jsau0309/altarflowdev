import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { getStripeWebhookSecret } from '@/lib/stripe-server';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { captureWebhookEvent, capturePaymentError, withApiSpan, logger } from '@/lib/sentry';
import { format } from 'date-fns';
import { getQuotaLimit } from '@/lib/subscription-helpers';
import { generateDonationReceiptHtml, DonationReceiptData } from '@/lib/email/templates/donation-receipt';
import { isWebhookProcessed } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

// Disable body parsing, we need the raw body for webhook signature verification
export const runtime = 'nodejs';

// Initialize Resend client with environment validation
import { serverEnv } from '@/lib/env';
const resend = new Resend(serverEnv.RESEND_API_KEY);

export async function POST(req: Request) {
  return withApiSpan('POST /api/webhooks/stripe', {
    'http.method': 'POST',
    'http.route': '/api/webhooks/stripe',
    'webhook.type': 'stripe'
  }, async () => {
    let body: string;
    let signature: string | null;

  try {
    // Important: Get the raw body as text for signature verification
    body = await req.text();
    const headersList = await headers();
    signature = headersList.get('stripe-signature');
    
    if (!body) {
      logger.error('Stripe webhook received empty body');
      return NextResponse.json(
        { error: 'Webhook Error: Empty request body' },
        { status: 400 }
      );
    }
    
    if (!signature) {
      logger.error('Stripe webhook missing signature header');
      return NextResponse.json(
        { error: 'Webhook Error: No stripe-signature header' },
        { status: 400 }
      );
    }
  } catch (bodyError) {
    logger.error('Failed to read Stripe webhook body', {
      error: (bodyError as Error).message
    });
    Sentry.captureException(bodyError);
    return NextResponse.json(
      { error: 'Webhook Error: Failed to read request body' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Stripe Webhook] Received request.');
    console.log(`[Stripe Webhook] Body length: ${body?.length || 0}`);
  }

  // Try platform webhook secret first
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Stripe Webhook] Trying platform webhook secret`);
    }
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Stripe Webhook] Event verified with platform secret: ${event.type}, ID: ${event.id}`);
    }
  } catch (err) {
    // If platform secret fails, try Connect webhook secret
    const connectSecret = serverEnv.STRIPE_CONNECT_WEBHOOK_SECRET;
    
    if (connectSecret) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Stripe Webhook] Platform secret failed, trying Connect webhook secret`);
        }
        
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          connectSecret
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Stripe Webhook] Event verified with Connect secret: ${event.type}, ID: ${event.id}`);
        }
      } catch (connectErr) {
        // Both secrets failed
        const errorMessage = connectErr instanceof Error ? connectErr.message : 'Unknown error';
        console.error(`[Stripe Webhook] Both signature verifications failed`);
        console.error(`[Stripe Webhook] Debug info:`, {
          signaturePresent: !!signature,
          platformSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
          connectSecretSet: !!connectSecret,
          error: errorMessage
        });
        
        return NextResponse.json({ error: `Webhook Error: Signature verification failed for both secrets` }, { status: 400 });
      }
    } else {
      // No Connect secret configured, fail with original error
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Stripe Webhook] Platform signature verification failed, no Connect secret configured`);
      return NextResponse.json({ error: `Webhook Error: Signature verification failed - ${errorMessage}` }, { status: 400 });
    }
  }

  // Check for duplicate webhook processing
  if (isWebhookProcessed(event.id)) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Define handled events
  const handledEvents = new Set([
    'payment_intent.succeeded',
    'payment_intent.processing',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'account.updated',
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    // Refund events
    'charge.refunded',
    // Dispute events
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    // Payout events for reconciliation
    'payout.created',
    'payout.updated',
    'payout.paid',
    'payout.failed',
    'payout.canceled'
  ]);

  // Log unhandled events and return early
  if (!handledEvents.has(event.type)) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Stripe Webhook] Event type ${event.type} not handled`);
    }
    return NextResponse.json({ received: true });
  }

  try {
    // Capture important events in Sentry
    captureWebhookEvent(event.type, {
      eventId: event.id,
      livemode: event.livemode,
      created: event.created
    });
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Stripe Webhook] Processing payment_intent.succeeded for PI: ${paymentIntentSucceeded.id}`);
        }

        let transaction;
        let stripeAccount: string | undefined; // Declare at higher scope for reuse
        
        // Use database transaction for atomic operations
        try {
          transaction = await prisma.$transaction(async (tx) => {
            // First, check if the transaction exists
            const existingTransaction = await tx.donationTransaction.findUnique({
              where: { stripePaymentIntentId: paymentIntentSucceeded.id }
            });
            
            if (!existingTransaction) {
              captureWebhookEvent('transaction_not_found', {
                paymentIntentId: paymentIntentSucceeded.id,
                amount: paymentIntentSucceeded.amount,
                currency: paymentIntentSucceeded.currency
              }, 'warning');
              // Don't fail the webhook - Stripe might retry
              throw new Error('Transaction not found');
            }
            
            // Debug logging removed: transaction details found
            
            // First, determine the actual payment method type used
            let actualPaymentMethodType: string | null = null;
            
            // Get the church's Connect account to retrieve payment details
            const transactionChurch = await tx.church.findUnique({
              where: { id: existingTransaction.churchId },
              select: { clerkOrgId: true }
            });

            if (transactionChurch?.clerkOrgId) {
              const connectAccount = await tx.stripeConnectAccount.findUnique({
                where: { churchId: transactionChurch.clerkOrgId },
                select: { stripeAccountId: true }
              });
              stripeAccount = connectAccount?.stripeAccountId;
            }
            
            // Retrieve the actual payment method to get its type
            if (paymentIntentSucceeded.payment_method && typeof paymentIntentSucceeded.payment_method === 'string') {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(
                  paymentIntentSucceeded.payment_method,
                  stripeAccount ? { stripeAccount } : undefined
                );
                // Map the payment method type correctly
                actualPaymentMethodType = paymentMethod.type || 'card';
              } catch (pmError) {
                console.warn(`[Stripe Webhook] Could not retrieve payment method: ${pmError}`);
                // Fallback to the first available type
                actualPaymentMethodType = paymentIntentSucceeded.payment_method_types[0] || 'card';
              }
            } else {
              // Fallback if no payment method ID
              actualPaymentMethodType = paymentIntentSucceeded.payment_method_types[0] || 'card';
            }
            
            // The total amount charged to the donor (includes covered fee if applicable)
            const totalCharged = paymentIntentSucceeded.amount;
            
            console.log(`[Stripe Webhook] Processing payment - Total charged: ${totalCharged}, Original donation: ${existingTransaction.amount}, Fee covered by donor: ${existingTransaction.processingFeeCoveredByDonor || 0}, Platform fee: ${existingTransaction.platformFeeAmount || 0}`);
            
            // Simplified: No longer tracking fees in database
            // We'll use Stripe Reports API for fee information
            
            const updatedTransaction = await tx.donationTransaction.update({
              where: { stripePaymentIntentId: paymentIntentSucceeded.id },
              data: {
                status: 'succeeded',
                paymentMethodType: actualPaymentMethodType,
                processedAt: new Date(), // Set the processed timestamp
              },
            });
            // Debug logging removed: transaction status updated
            
            return updatedTransaction;
          });
        } catch (error) {
          if (error instanceof Error && error.message === 'Transaction not found') {
            return NextResponse.json({ received: true, warning: 'Transaction not found' });
          }
          
          capturePaymentError(error as Error, {
            paymentIntentId: paymentIntentSucceeded.id,
            amount: paymentIntentSucceeded.amount / 100,
            customerId: paymentIntentSucceeded.customer as string
          });
          return NextResponse.json({ error: 'Failed to update transaction record.' }, { status: 500 });
        }

        if (transaction && transaction.donorId) {
          // Debug logging removed: attempting donor update
          const donor = await prisma.donor.findUnique({
            where: { id: transaction.donorId },
          });

          if (donor) {
            // Debug logging removed: donor found, preparing update
            const donorUpdateData: Prisma.DonorUpdateInput = {};
            
            let stripeName: string | null = null;
            let stripeEmail: string | null = null;
            let stripeAddress: Stripe.Address | null = null;
            
            // The stripeAccount variable is already defined in the parent scope (lines 159-171)
            // We can use it directly here

            const charge = typeof paymentIntentSucceeded.latest_charge === 'string' 
                ? await stripe.charges.retrieve(
                    paymentIntentSucceeded.latest_charge,
                    stripeAccount ? { stripeAccount } : undefined
                  ) // Retrieve from Connect account if available
                : typeof paymentIntentSucceeded.latest_charge === 'object' 
                ? paymentIntentSucceeded.latest_charge as Stripe.Charge 
                : null;
            if (charge) console.log(`[Stripe Webhook] Extracted charge object from PI.`);

            const paymentMethod = typeof paymentIntentSucceeded.payment_method === 'string'
                ? await stripe.paymentMethods.retrieve(
                    paymentIntentSucceeded.payment_method,
                    stripeAccount ? { stripeAccount } : undefined
                  ) // Retrieve from Connect account if available
                : typeof paymentIntentSucceeded.payment_method === 'object' 
                ? paymentIntentSucceeded.payment_method as Stripe.PaymentMethod 
                : null;
            if (paymentMethod) console.log(`[Stripe Webhook] Extracted payment_method object from PI.`);


            if (paymentIntentSucceeded.shipping) {
              stripeName = paymentIntentSucceeded.shipping.name ?? null;
              stripeAddress = paymentIntentSucceeded.shipping.address ?? null;
              // Debug logging removed: shipping information extracted
            }

            if (charge?.billing_details) {
              if (!stripeName) stripeName = charge.billing_details.name ?? null;
              if (!stripeAddress) stripeAddress = charge.billing_details.address ?? null;
              if (!stripeEmail) stripeEmail = charge.billing_details.email ?? null;
              // Debug logging removed: charge billing details extracted
            }

            if (paymentMethod?.billing_details) {
              if (!stripeName) stripeName = paymentMethod.billing_details.name ?? null;
              if (!stripeAddress) stripeAddress = paymentMethod.billing_details.address ?? null;
              if (!stripeEmail) stripeEmail = paymentMethod.billing_details.email ?? null;
              console.log(`[Stripe Webhook] From paymentMethod.billing_details: name='${stripeName}', email='${stripeEmail}', address='${JSON.stringify(stripeAddress)}'`);
            }
            
            if (!stripeEmail && paymentIntentSucceeded.receipt_email) {
              stripeEmail = paymentIntentSucceeded.receipt_email;
              console.log(`[Stripe Webhook] From PI.receipt_email: email='${stripeEmail}'`);
            }
            
            if ((!donor.firstName || !donor.lastName) && stripeName) {
              const nameParts = stripeName.split(' ');
              if (!donor.firstName && nameParts.length > 0) donorUpdateData.firstName = nameParts.shift() || stripeName; 
              if (!donor.lastName && nameParts.length > 0) donorUpdateData.lastName = nameParts.join(' ');
              else if (!donor.lastName && donor.firstName && stripeName === donor.firstName && nameParts.length === 0) {} 
              else if (!donor.lastName && donor.firstName && stripeName !== donor.firstName) {
                const potentialLastName = stripeName.replace(donor.firstName, '').trim();
                if (potentialLastName) donorUpdateData.lastName = potentialLastName;
              }
            }

            if (!donor.email && stripeEmail) donorUpdateData.email = stripeEmail;

            if (stripeAddress) {
              if (!donor.addressLine1 && stripeAddress.line1) donorUpdateData.addressLine1 = stripeAddress.line1;
              if (!donor.city && stripeAddress.city) donorUpdateData.city = stripeAddress.city;
              if (!donor.state && stripeAddress.state) donorUpdateData.state = stripeAddress.state;
              if (!donor.postalCode && stripeAddress.postal_code) donorUpdateData.postalCode = stripeAddress.postal_code;
              if (!donor.country && stripeAddress.country) donorUpdateData.country = stripeAddress.country;
            }

            if (Object.keys(donorUpdateData).length > 0) {
              console.log(`[Stripe Webhook] Donor update data prepared:`, donorUpdateData);
              try {
                await prisma.donor.update({
                  where: { id: donor.id },
                  data: donorUpdateData,
                });
                console.log(`[Stripe Webhook] Successfully updated Donor record ${donor.id}.`);
              } catch (donorUpdateError) {
                console.error(`[Stripe Webhook] Error updating Donor record ${donor.id}:`, donorUpdateError);
              }
            } else {
              console.log(`[Stripe Webhook] No new information from Stripe to update Donor ${donor.id}.`);
            }
          } else {
            console.log(`[Stripe Webhook] Donor record not found for donorId ${transaction.donorId}. Cannot update donor.`);
          }
        } else {
            console.log(`[Stripe Webhook] No donorId found on transaction ${transaction?.id}, or transaction object is null. Skipping donor update.`);
        }

        try {
          console.log(`[Stripe Webhook] Attempting to send receipt for PI: ${paymentIntentSucceeded.id}`);
          
          // Wait for email sending to complete before responding to webhook
          // This ensures Stripe will retry if email fails
          await handleSuccessfulPaymentIntent(paymentIntentSucceeded);
          console.log(`[Stripe Webhook] Successfully completed receipt handling for PI: ${paymentIntentSucceeded.id}`);
        } catch (emailError: unknown) {
          console.error(`[Stripe Webhook] Error in receipt handling for PI: ${paymentIntentSucceeded.id}:`, emailError);
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown receipt handling error';
          
          // Capture the error for monitoring
          captureWebhookEvent('stripe_webhook_receipt_handling_error', {
            context: 'stripe_webhook_receipt_handling',
            paymentIntentId: paymentIntentSucceeded.id,
            errorMessage,
          });
          
          // Don't fail the webhook for receipt errors - payment was successful
          // But still log it for monitoring
        }
        break;

      case 'payment_intent.processing':
        const paymentIntentProcessing = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.processing for PI: ${paymentIntentProcessing.id}`);
        try {
          await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentProcessing.id },
            data: { status: 'processing' },
          });
          console.log(`[Stripe Webhook] Updated transaction status to processing for PI: ${paymentIntentProcessing.id}`);
        } catch (error) {
          console.error(`[Stripe Webhook] Error updating DonationTransaction to processing for PI: ${paymentIntentProcessing.id}`, error);
          return NextResponse.json({ error: 'Failed to update transaction to processing status.' }, { status: 500 });
        }
        break;

      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.payment_failed for PI: ${paymentIntentFailed.id}`);
        try {
            await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentFailed.id },
            data: { status: 'failed' },
            });
            console.log(`[Stripe Webhook] Updated transaction status to failed for PI: ${paymentIntentFailed.id}`);
        } catch (error) {
            console.error(`[Stripe Webhook] Error updating DonationTransaction to failed for PI: ${paymentIntentFailed.id}`, error);
            return NextResponse.json({ error: 'Failed to update transaction to failed status.' }, { status: 500 });
        }
        break;

      case 'payment_intent.canceled':
        const paymentIntentCanceled = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.canceled for PI: ${paymentIntentCanceled.id}`);
        try {
          await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentCanceled.id },
            data: {
              status: 'canceled',
              processedAt: paymentIntentCanceled.canceled_at
                ? new Date(paymentIntentCanceled.canceled_at * 1000)
                : new Date(),
            },
          });
          console.log(
            `[Stripe Webhook] Updated transaction status to canceled for PI: ${paymentIntentCanceled.id}. Reason: ${paymentIntentCanceled.cancellation_reason ?? 'not provided'}`
          );
        } catch (error) {
          console.error(
            `[Stripe Webhook] Error updating DonationTransaction to canceled for PI: ${paymentIntentCanceled.id}`,
            error
          );
          return NextResponse.json({ error: 'Failed to update transaction to canceled status.' }, { status: 500 });
        }
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        console.log(`[Stripe Webhook] Processing account.updated for account: ${account.id}`);
        
        try {
          // Find the StripeConnectAccount record
          const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
            where: { stripeAccountId: account.id }
          });
          
          if (!stripeConnectAccount) {
            console.log(`[Stripe Webhook] StripeConnectAccount not found for account ${account.id}`);
            // Don't fail the webhook - this might be for an account we don't track
            return NextResponse.json({ received: true });
          }
          
          // Store the previous state to detect transitions
          const wasChargesEnabled = stripeConnectAccount.chargesEnabled;
          
          // Determine verification status
          let verificationStatus = 'unverified';
          if (account.charges_enabled && account.payouts_enabled) {
            verificationStatus = 'verified';
          } else if (account.details_submitted && account.requirements?.disabled_reason) {
            verificationStatus = account.requirements.disabled_reason === 'requirements.pending_verification' 
              ? 'pending' 
              : 'restricted';
          } else if (account.details_submitted) {
            verificationStatus = 'pending';
          }
          
          // Update the account record
          await prisma.stripeConnectAccount.update({
            where: { id: stripeConnectAccount.id },
            data: {
              chargesEnabled: account.charges_enabled || false,
              payoutsEnabled: account.payouts_enabled || false,
              detailsSubmitted: account.details_submitted || false,
              verificationStatus,
              requirementsCurrentlyDue: account.requirements?.currently_due || [],
              requirementsEventuallyDue: account.requirements?.eventually_due || [],
              requirementsDisabledReason: account.requirements?.disabled_reason || null,
              tosAcceptanceDate: account.tos_acceptance?.date 
                ? new Date(account.tos_acceptance.date * 1000)
                : null,
              metadata: account.metadata || {},
              updatedAt: new Date()
            }
          });
          
          console.log(`[Stripe Webhook] Successfully updated StripeConnectAccount for ${account.id}. Status: ${verificationStatus}, Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`);
          
          // Register payment method domains if charges just became enabled
          if (account.charges_enabled && !wasChargesEnabled && !stripeConnectAccount.paymentDomainsRegistered) {
            console.log(`[Stripe Webhook] Account ${account.id} just became active, registering payment method domains`);
            
            const domainsToRegister = [
              'altarflow.com',
              'www.altarflow.com'
            ];
            
            const successfullyRegistered: string[] = [];
            
            for (const domainName of domainsToRegister) {
              try {
                // Check if domain already exists for this account
                const existingDomains = await stripe.paymentMethodDomains.list(
                  { domain_name: domainName },
                  { stripeAccount: account.id }
                );
                
                if (existingDomains.data.length === 0) {
                  // Register the domain for this Connect account
                  await stripe.paymentMethodDomains.create(
                    {
                      domain_name: domainName,
                      enabled: true
                    },
                    { stripeAccount: account.id }
                  );
                  console.log(`[Stripe Webhook] Successfully registered domain ${domainName} for account ${account.id}`);
                  successfullyRegistered.push(domainName);
                } else {
                  console.log(`[Stripe Webhook] Domain ${domainName} already registered for account ${account.id}`);
                  successfullyRegistered.push(domainName); // Consider it successful if already exists
                }
              } catch (domainError) {
                // Log error but don't fail the webhook
                console.error(`[Stripe Webhook] Error registering domain ${domainName} for account ${account.id}:`, domainError);
                captureWebhookEvent('domain_registration_error', {
                  accountId: account.id,
                  domain: domainName,
                  error: domainError instanceof Error ? domainError.message : 'Unknown error'
                }, 'error');
              }
            }
            
            // Update database with domain registration status
            if (successfullyRegistered.length > 0) {
              try {
                await prisma.stripeConnectAccount.update({
                  where: { stripeAccountId: account.id },
                  data: {
                    paymentDomainsRegistered: true,
                    paymentDomainsRegisteredAt: new Date(),
                    registeredDomains: successfullyRegistered
                  }
                });
                console.log(`[Stripe Webhook] Updated database with registered domains for account ${account.id}`);
              } catch (dbError) {
                console.error(`[Stripe Webhook] Error updating domain registration status in database:`, dbError);
              }
            }
          }
        } catch (error) {
          console.error(`[Stripe Webhook] Error updating StripeConnectAccount for account ${account.id}:`, error);
          // Don't fail the webhook - log the error but allow Stripe to consider it successful
          captureWebhookEvent('account_update_error', {
            accountId: account.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'error');
        }
        break;

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Processing checkout.session.completed for session: ${session.id}`);
        
        // Get the organization ID from metadata or client_reference_id
        const orgId = session.metadata?.organizationId || session.client_reference_id;
        
        console.log('[Stripe Webhook] Extracted orgId:', orgId);
        
        if (!orgId) {
          console.error('[Stripe Webhook] No organizationId found in metadata or client_reference_id');
          return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
        }
        
        // Move these to outer scope for error handling
        let subscriptionEnd: Date | null = null; // Active subscriptions don't have an end date
        let plan = 'monthly'; // default
        
        try {
          // Get subscription details
          const subscriptionId = session.subscription as string;
          
          // Only fetch subscription details if we have a subscription ID
          // The customer.subscription.created webhook will handle the full details
          if (subscriptionId) {
            try {
              // Add a timeout to prevent hanging
              const subscriptionPromise = stripe.subscriptions.retrieve(subscriptionId);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Stripe API timeout')), 5000)
              );
              
              const subscription = await Promise.race([subscriptionPromise, timeoutPromise]) as Stripe.Subscription;
              
              // Only set subscriptionEnd if the subscription is canceled or will end
              if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
                subscriptionEnd = new Date(subscription.current_period_end * 1000);
                console.log('[Stripe Webhook] Subscription is canceled/ending, setting end date:', subscriptionEnd);
              } else {
                // Active subscriptions don't have an end date
                subscriptionEnd = null;
                console.log('[Stripe Webhook] Subscription is active, no end date set');
              }
              
              // Determine plan based on interval
              if (subscription.items.data[0]?.price?.recurring?.interval === 'year') {
                plan = 'annual';
              }
            } catch (error) {
              console.warn('[Stripe Webhook] Could not retrieve subscription details, using defaults:', error);
              // For active subscriptions, don't set an end date
              subscriptionEnd = null;
            }
          } else {
            // No subscription ID means one-time payment or error, don't set end date
            subscriptionEnd = null;
            console.log('[Stripe Webhook] No subscription ID in session, treating as one-time payment');
          }
          
          // First check if church exists
          const existingChurch = await prisma.church.findUnique({
            where: { clerkOrgId: orgId }
          });
          
          if (!existingChurch) {
            console.error(`[Stripe Webhook] Church not found with clerkOrgId: ${orgId}`);
            // Don't fetch all churches in production - this is expensive!
            throw new Error(`Church not found with clerkOrgId: ${orgId}`);
          }
          
          // Batch database operations in a transaction for better performance
          const currentMonthYear = format(new Date(), 'yyyy-MM');
          const quotaLimit = 10000; // Paid subscription gets 10,000 campaigns
          
          await prisma.$transaction(async (tx) => {
            // Update church subscription status AND mark onboarding as complete
            const updateData: Prisma.ChurchUpdateInput = {
              subscriptionStatus: 'active',
              subscriptionId: subscriptionId ?? session.id,
              subscriptionPlan: plan,
              stripeCustomerId: session.customer as string,
              // Mark onboarding as complete if this happens during onboarding
              onboardingCompleted: true,
              onboardingStep: 6, // Set to final step
              subscriptionEndsAt: subscriptionEnd,
            };

            await tx.church.update({
              where: { clerkOrgId: orgId },
              data: updateData
            });
            
            // Update email quota for the current month
            await tx.emailQuota.upsert({
              where: {
                churchId_monthYear: {
                  churchId: existingChurch.id,
                  monthYear: currentMonthYear,
                }
              },
              update: { quotaLimit },
              create: {
                churchId: existingChurch.id,
                monthYear: currentMonthYear,
                quotaLimit,
                emailsSent: 0,
                updatedAt: new Date(),
              }
            });
          });
          
          console.log(`[Stripe Webhook] Updated church ${orgId} to active subscription`);
          
          console.log(`[Stripe Webhook] Updated email quota to ${quotaLimit} campaigns for church ${orgId}`);
        } catch (error) {
          console.error('[Stripe Webhook] Error updating church subscription:', error);
          // Log detailed error information for debugging
          if (error instanceof Error) {
            console.error('[Stripe Webhook] Error details:', {
              name: error.name,
              message: error.message,
              eventType: event.type,
              eventId: event.id,
              orgId: orgId,
              subscriptionEnd: subscriptionEnd ? (subscriptionEnd instanceof Date ? subscriptionEnd.toISOString() : 'Invalid Date') : 'null',
              sessionData: {
                customer: session.customer,
                subscription: session.subscription
              }
            });
          }
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Processing ${event.type} for subscription: ${subscription.id}`);
        console.log(`[Stripe Webhook] Subscription status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);
        const periodEndDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : 'N/A';
        console.log(`[Stripe Webhook] Current period end: ${periodEndDate}`);
        
        try {
          // For new subscriptions, try to find church by customer ID first
          let church = await prisma.church.findFirst({
            where: { subscriptionId: subscription.id }
          });
          
          // If not found by subscription ID, try by customer ID (for new subscriptions)
          if (!church && event.type === 'customer.subscription.created') {
            console.log(`[Stripe Webhook] Subscription created, trying to find church by customer ID: ${subscription.customer}`);
            church = await prisma.church.findFirst({
              where: { stripeCustomerId: subscription.customer as string }
            });
            
            if (church) {
              // Update the church with the new subscription ID
              console.log(`[Stripe Webhook] Found church by customer ID, updating subscription ID`);
              await prisma.church.update({
                where: { id: church.id },
                data: {
                  subscriptionId: subscription.id,
                  subscriptionStatus: 'active',
                  // Mark onboarding as complete if this is during onboarding
                  onboardingCompleted: true,
                  onboardingStep: 6,
                }
              });
            }
          }
          
          if (!church) {
            console.log(`[Stripe Webhook] No church found for subscription ${subscription.id} or customer ${subscription.customer}`);
            console.log(`[Stripe Webhook] Attempting to find church by any means...`);
            
            // Don't fetch all churches in production - log the search criteria instead
            console.log('[Stripe Webhook] Could not find church with:', {
              subscriptionId: subscription.id,
              customerId: subscription.customer
            });
            break;
          }
          
          console.log(`[Stripe Webhook] Found church: ${church.name} (${church.id}), current status: ${church.subscriptionStatus}`);
          
          // Update subscription status
          // Note: When a subscription is canceled but still in the current period, 
          // Stripe keeps it as 'active' with cancel_at_period_end = true
          const status = subscription.status === 'active' && subscription.cancel_at_period_end ? 'canceled' :
                        subscription.status === 'active' ? 'active' : 
                        subscription.status === 'past_due' ? 'past_due' :
                        subscription.status === 'canceled' ? 'canceled' : 'inactive';
          
          // Determine the plan based on price ID or interval
          let plan = church.subscriptionPlan; // Keep existing plan by default
          if (subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            const interval = subscription.items.data[0].price.recurring?.interval;
            
            // Map based on interval (month or year)
            if (interval === 'month') {
              plan = 'monthly';
            } else if (interval === 'year') {
              plan = 'annual';
            }
            
            console.log(`[Stripe Webhook] Detected plan: ${plan} (interval: ${interval}, priceId: ${priceId})`);
          }
          
          // Check for promotional coupon (50% off for 3 months)
          let promotionalCouponId: string | null = null;
          let promotionalEndsAt: Date | null = null;

          if (subscription.discount?.coupon) {
            const coupon = subscription.discount.coupon;
            promotionalCouponId = coupon.id;

            console.log(`[Stripe Webhook] Subscription has coupon applied: ${coupon.id}`);

            // If this is our promotional coupon (check by ID or name)
            // The coupon should be created in Stripe with duration='repeating' and duration_in_months=3
            if (coupon.duration === 'repeating' && coupon.duration_in_months === 3) {
              // Calculate when the promotion ends (3 months from now)
              const now = new Date();
              const promoEnd = new Date(now);
              promoEnd.setMonth(promoEnd.getMonth() + 3);
              promotionalEndsAt = promoEnd;

              console.log(`[Stripe Webhook] Promotional pricing detected, ends at: ${promotionalEndsAt.toISOString()}`);
            }
          }

          // For canceled subscriptions, we need to update the subscriptionEndsAt to show when it will actually end
          const updateData: {
            subscriptionStatus: string;
            subscriptionPlan: string | null;
            subscriptionEndsAt?: Date | null;
            promotionalCouponId?: string | null;
            promotionalEndsAt?: Date | null;
          } = {
            subscriptionStatus: status,
            subscriptionPlan: plan,
          };

          // Add promotional fields if detected
          if (promotionalCouponId) {
            updateData.promotionalCouponId = promotionalCouponId;
            updateData.promotionalEndsAt = promotionalEndsAt;
          }
          
          // Only update subscriptionEndsAt if the subscription is canceled or will end
          if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
            // Validate that current_period_end is a valid timestamp
            if (subscription.current_period_end && !isNaN(subscription.current_period_end)) {
              updateData.subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
              console.log(`[Stripe Webhook] Subscription is canceled/ending. Setting subscriptionEndsAt to: ${updateData.subscriptionEndsAt.toISOString()}`);
            } else {
              console.warn(`[Stripe Webhook] Invalid current_period_end timestamp: ${subscription.current_period_end}`);
              updateData.subscriptionEndsAt = null;
            }
          } else if (subscription.status === 'active') {
            // Clear subscriptionEndsAt if the subscription is active (e.g., reactivated)
            updateData.subscriptionEndsAt = null;
          }
          
          const updatedChurch = await prisma.church.update({
            where: { id: church.id },
            data: updateData
          });
          
          console.log(`[Stripe Webhook] Update complete for church ${church.id}:`);
          console.log(`[Stripe Webhook] - Status: ${church.subscriptionStatus} -> ${updatedChurch.subscriptionStatus}`);
          console.log(`[Stripe Webhook] - Plan: ${church.subscriptionPlan} -> ${updatedChurch.subscriptionPlan}`);
          console.log(`[Stripe Webhook] - SubscriptionEndsAt: ${updatedChurch.subscriptionEndsAt ? updatedChurch.subscriptionEndsAt.toISOString() : 'null'}`);
          
          // Update email quota if subscription status changed
          if (church.subscriptionStatus !== updatedChurch.subscriptionStatus) {
            const currentMonthYear = format(new Date(), 'yyyy-MM');
            const newQuotaLimit = getQuotaLimit(updatedChurch);
            
            // Find existing quota for current month
            const existingQuota = await prisma.emailQuota.findFirst({
              where: {
                churchId: church.id,
                monthYear: currentMonthYear,
              },
            });
            
            if (existingQuota) {
              // Update existing quota
              await prisma.emailQuota.update({
                where: { id: existingQuota.id },
                data: { quotaLimit: newQuotaLimit },
              });
              console.log(`[Stripe Webhook] Updated email quota for church ${church.id}: ${existingQuota.quotaLimit} -> ${newQuotaLimit} campaigns/month`);
            } else {
              // Create new quota
              await prisma.emailQuota.create({
                data: {
                  id: randomUUID(),
                  churchId: church.id,
                  monthYear: currentMonthYear,
                  quotaLimit: newQuotaLimit,
                  emailsSent: 0,
                  updatedAt: new Date(),
                },
              });
              console.log(`[Stripe Webhook] Created email quota for church ${church.id}: ${newQuotaLimit} campaigns/month`);
            }
          }
          
          // Check if subscription has truly ended (for immediate handling of deleted subscriptions)
          if (event.type === 'customer.subscription.deleted' && subscription.status === 'canceled') {
            // This is an immediate cancellation (not waiting for period end)
            const now = new Date();
            const subscriptionEnd = new Date(subscription.current_period_end * 1000);
            
            if (now >= subscriptionEnd) {
              // Subscription has ended immediately, update to free
              console.log(`[Stripe Webhook] Subscription ended immediately, updating church to free status`);
              
              await prisma.church.update({
                where: { id: church.id },
                data: {
                  subscriptionStatus: 'free',
                  subscriptionPlan: null,
                  subscriptionId: null,
                },
              });
              
              // Update quota to free tier
              const currentMonthYear = format(now, 'yyyy-MM');
              const existingQuota = await prisma.emailQuota.findFirst({
                where: {
                  churchId: church.id,
                  monthYear: currentMonthYear,
                },
              });
              
              if (existingQuota) {
                await prisma.emailQuota.update({
                  where: { id: existingQuota.id },
                  data: { quotaLimit: 4 },
                });
                console.log(`[Stripe Webhook] Updated quota to free tier (4 campaigns)`);
              }
            }
          }
        } catch (error) {
          console.error('[Stripe Webhook] Error updating subscription:', error);
          console.error('[Stripe Webhook] Full error details:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            subscriptionId: subscription.id
          });
          // Re-throw to ensure webhook fails and Stripe retries
          throw error;
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Stripe Webhook] Processing charge.refunded for charge: ${charge.id}`);
        
        // Null check for payment_intent
        if (!charge.payment_intent) {
          console.warn(`[Stripe Webhook] No payment_intent found for charge ${charge.id}`);
          break;
        }
        
        try {
          // Use database transaction for atomic operations
          await prisma.$transaction(async (tx) => {
            // Find the transaction by payment intent ID
            const transaction = await tx.donationTransaction.findFirst({
              where: { 
                stripePaymentIntentId: charge.payment_intent as string 
              },
              include: {
                Church: true,
                DonationType: true,
              }
            });
            
            if (!transaction) {
              console.log(`[Stripe Webhook] No transaction found for payment intent ${charge.payment_intent}`);
              return; // Exit transaction without error
            }
            
            // Calculate refunded amount (could be partial refund)
            const refundedAmount = charge.amount_refunded;
            const isFullRefund = refundedAmount === charge.amount;
            
            console.log(`[Stripe Webhook] Refund details: Amount refunded: ${refundedAmount}, Full refund: ${isFullRefund}`);
            
            // Update transaction with refund information
            await tx.donationTransaction.update({
              where: { id: transaction.id },
              data: {
                status: isFullRefund ? 'refunded' : 'partially_refunded',
                refundedAmount: refundedAmount,
                refundedAt: new Date(),
              }
            });
            
            console.log(`[Stripe Webhook] Updated transaction ${transaction.id} with refund status`);
            
            // TODO: Send notification email to church admin
            // This will be implemented when we have the email notification system ready
            console.log(`[Stripe Webhook] TODO: Send refund notification to church ${transaction.Church.name}`);
          });
          
        } catch (error) {
          console.error('[Stripe Webhook] Error processing refund:', error);
          throw error; // Re-throw to ensure webhook fails and Stripe retries
        }
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated': 
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`[Stripe Webhook] Processing ${event.type} for dispute: ${dispute.id}`);
        
        // Null check for payment_intent
        if (!dispute.payment_intent) {
          console.warn(`[Stripe Webhook] No payment_intent found for dispute ${dispute.id}`);
          break;
        }
        
        try {
          // Use database transaction for atomic operations
          await prisma.$transaction(async (tx) => {
            // Find the transaction by payment intent ID
            const transaction = await tx.donationTransaction.findFirst({
              where: { 
                stripePaymentIntentId: dispute.payment_intent as string 
              },
              include: {
                Church: true,
                DonationType: true,
              }
            });
            
            if (!transaction) {
              console.log(`[Stripe Webhook] No transaction found for payment intent ${dispute.payment_intent}`);
              return; // Exit transaction without error
            }
            
            // Map Stripe dispute status to our disputeStatus field
            let mappedDisputeStatus = dispute.status;
            if (dispute.status === 'warning_needs_response' || dispute.status === 'needs_response') {
              mappedDisputeStatus = 'needs_response';
            }
            
            console.log(`[Stripe Webhook] Dispute status: ${dispute.status}, Reason: ${dispute.reason}`);
            
            // Update transaction with dispute information
            const updateData: {
              disputeStatus: string;
              disputeReason: string;
              disputedAt?: Date;
              status?: string;
              refundedAmount?: number;
              refundedAt?: Date;
            } = {
              disputeStatus: mappedDisputeStatus,
              disputeReason: dispute.reason || 'unknown',
            };
            
            // Set disputedAt only when dispute is created
            if (event.type === 'charge.dispute.created') {
              updateData.disputedAt = new Date();
              updateData.status = 'disputed';
            }
            
            // If dispute is lost, the funds are refunded
            if (dispute.status === 'lost') {
              updateData.status = 'refunded';  // Use standard 'refunded' status
              updateData.refundedAmount = dispute.amount;
              updateData.refundedAt = new Date();
            } else if (dispute.status === 'won') {
              // If dispute is won, restore the status
              updateData.status = 'succeeded';
              updateData.disputeStatus = 'won';  // Keep dispute status for reference
            }
            
            await tx.donationTransaction.update({
              where: { id: transaction.id },
              data: updateData
            });
            
            console.log(`[Stripe Webhook] Updated transaction ${transaction.id} with dispute status`);
            
            // Send urgent alert for new disputes that need response
            if (event.type === 'charge.dispute.created' || 
                dispute.status === 'warning_needs_response' || 
                dispute.status === 'needs_response') {
              // TODO: Send urgent notification email to church admin
              console.log(`[Stripe Webhook] URGENT: Dispute needs response for church ${transaction.Church.name}`);
              console.log(`[Stripe Webhook] Dispute amount: $${(dispute.amount / 100).toFixed(2)}`);
              console.log(`[Stripe Webhook] Response deadline: ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : 'N/A'}`);
            }
          });
          
        } catch (error) {
          console.error('[Stripe Webhook] Error processing dispute:', error);
          throw error; // Re-throw to ensure webhook fails and Stripe retries
        }
        break;
      }
      
      // Payout webhook handlers for reconciliation
      case 'payout.created':
      case 'payout.updated':
      case 'payout.paid':
      case 'payout.failed':
      case 'payout.canceled': {
        const payout = event.data.object as Stripe.Payout;
        console.log(`[Stripe Webhook] Processing ${event.type} for payout: ${payout.id}`);
        
        try {
          // Use database transaction for atomic operations
          const { stripeAccountId } = await prisma.$transaction(async (tx) => {
            // Determine which church this payout belongs to
            // Payouts are tied to connected accounts, so we need to extract the account ID
            const accountId = event.account; // This is the connected account ID for Connect webhooks
            
            if (!accountId) {
              console.error('[Stripe Webhook] No account ID found for payout event');
              throw new Error('No account ID found');
            }
            
            // Find the church by Stripe account ID
            const stripeAccount = await tx.stripeConnectAccount.findUnique({
              where: { stripeAccountId: accountId },
              include: { Church: true }
            });
            
            if (!stripeAccount) {
              console.error(`[Stripe Webhook] No church found for Stripe account: ${accountId}`);
              throw new Error(`No church found for account: ${accountId}`);
            }
            
            // Check if this payout already exists
            const existingPayout = await tx.payoutSummary.findUnique({
              where: { stripePayoutId: payout.id }
            });
            
            if (existingPayout) {
              // Update existing payout
              await tx.payoutSummary.update({
                where: { stripePayoutId: payout.id },
                data: {
                  status: payout.status,
                  failureReason: payout.failure_message || null,
                  arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : existingPayout.arrivalDate,
                  updatedAt: new Date()
                }
              });
              console.log(`[Stripe Webhook] Updated payout ${payout.id} status to ${payout.status}`);
            } else if (event.type === 'payout.created') {
              // Create new payout record
              await tx.payoutSummary.create({
                data: {
                  stripePayoutId: payout.id,
                  churchId: stripeAccount.Church.id,
                  payoutDate: new Date(payout.created * 1000),
                  arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : new Date(payout.created * 1000),
                  amount: payout.amount,
                  currency: payout.currency,
                  status: payout.status,
                  failureReason: payout.failure_message || null,
                  payoutSchedule: payout.automatic ? 'automatic' : 'manual',
                  netAmount: payout.amount, // Initially set to payout amount
                  metadata: payout.metadata || undefined,
                  updatedAt: new Date()
                }
              });
              console.log(`[Stripe Webhook] Created payout record for ${payout.id}`);
              
              // TODO: Fetch balance transactions to populate transaction details
              // This will be done in a separate reconciliation job to avoid webhook timeout
            }
            
            return { stripeAccountId: accountId };
          });
          
          // If payout is paid, trigger reconciliation
          if (payout.status === 'paid') {
            console.log(`[Stripe Webhook] Payout ${payout.id} has been paid to bank`);
            
            // Import and await reconciliation to ensure data consistency
            // Use try-catch to handle errors gracefully
            try {
              const { reconcilePayout } = await import('@/lib/stripe-reconciliation');
              const result = await reconcilePayout(payout.id, stripeAccountId);
              
              if (result.success) {
                console.log(`[Stripe Webhook] Payout ${payout.id} reconciled successfully`);
              } else {
                console.error(`[Stripe Webhook] Failed to reconcile payout ${payout.id}:`, result.error);
                // Don't fail the webhook, but log for monitoring
              }
            } catch (error) {
              // Log error but don't fail the webhook - Stripe will retry if we return 500
              console.error(`[Stripe Webhook] Error reconciling payout ${payout.id}:`, error);
              // Consider adding to a retry queue here in the future
            }
          }
          
          // If payout failed, alert the church
          if (payout.status === 'failed') {
            console.error(`[Stripe Webhook] Payout ${payout.id} failed: ${payout.failure_message}`);
            // TODO: Send urgent notification to church admin
          }
          
        } catch (error) {
          console.error('[Stripe Webhook] Error processing payout:', error);
          throw error; // Re-throw to ensure webhook fails and Stripe retries
        }
        break;
      }

    }
  } catch (error) {
    console.error('[Stripe Webhook] General error processing webhook event:', error);
    console.error('[Stripe Webhook] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventType: event?.type,
      eventId: event?.id
    });
    return NextResponse.json({ error: 'Webhook handler failed. View logs.' }, { status: 500 });
  }

  logger.info('Stripe webhook processed successfully');
  return NextResponse.json({ received: true });
  });
}

async function handleSuccessfulPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const donationTransaction = await prisma.donationTransaction.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: {
      DonationType: true,
      Donor: true,
    },
  });

  if (!donationTransaction) {
    console.error(`[Receipt] DonationTransaction not found for PaymentIntent ${paymentIntent.id}`);
    return;
  }

  // Ensure the transaction status is 'succeeded' before sending a receipt.
  if (donationTransaction.status !== 'succeeded') {
    console.warn(`[Receipt] DonationTransaction ${donationTransaction.id} status is '${donationTransaction.status}', not 'succeeded'. Receipt not sent.`);
    return;
  }

  const church = await prisma.church.findUnique({
    where: { id: donationTransaction.churchId },
  });

  if (!church || !church.clerkOrgId) {
    console.error(`[Receipt] Church or ClerkOrgId not found for Church ID ${donationTransaction.churchId}`);
    return;
  }

  // Fetch church logo from LandingPageConfig
  let churchLogoUrl: string | undefined;
  try {
    const landingPageConfig = await prisma.landingPageConfig.findUnique({
      where: { churchId: church.id },
      select: { logoUrl: true }
    });
    churchLogoUrl = landingPageConfig?.logoUrl || undefined;
  } catch (error) {
    console.warn('[Receipt] Failed to fetch church logo, proceeding without logo:', error);
    churchLogoUrl = undefined;
  }

  const stripeConnectAccountDb = await prisma.stripeConnectAccount.findUnique({
    where: { churchId: church.clerkOrgId },
  });

  if (!stripeConnectAccountDb || !stripeConnectAccountDb.stripeAccountId) {
    console.error(`[Receipt] StripeConnectAccount (DB) not found for ClerkOrgId ${church.clerkOrgId}`);
    return;
  }
  const connectedStripeAccountId = stripeConnectAccountDb.stripeAccountId;

  let ein = 'N/A'; // Default EIN
  let churchRegisteredName = church.name;
  let churchRegisteredAddressObj: Stripe.Address = { // Initialize with DB values or defaults
    line1: church.address || '',
    city: '', 
    state: '',
    postal_code: '',
    country: '', 
    line2: null
  };
  let churchRegisteredEmail = church.email || 'N/A';
  let churchRegisteredPhone = church.phone || 'N/A';

  let stripeAccount: Stripe.Account | null = null;
  try {
    // Express accounts don't support tax_ids expansion, retrieve without expansion
    console.log(`[Receipt] Retrieving Stripe Express Account ${connectedStripeAccountId}`);
    stripeAccount = await stripe.accounts.retrieve(connectedStripeAccountId);
    console.log(`[Receipt] Successfully retrieved Stripe Account ${connectedStripeAccountId}.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Receipt] Error retrieving Stripe Account ${connectedStripeAccountId}: ${errorMessage}`);
  }

  if (stripeAccount) {
    console.log(`[Receipt] Stripe Account ${connectedStripeAccountId} retrieved. Processing for EIN and details.`);
    churchRegisteredName = stripeAccount.company?.name || stripeAccount.settings?.dashboard?.display_name || church.name;
    if (stripeAccount.company?.address) {
      churchRegisteredAddressObj = {
        line1: stripeAccount.company.address.line1 || '',
        line2: stripeAccount.company.address.line2 || null,
        city: stripeAccount.company.address.city || '',
        state: stripeAccount.company.address.state || '',
        postal_code: stripeAccount.company.address.postal_code || '',
        country: stripeAccount.company.address.country || '',
      };
    }
    churchRegisteredEmail = stripeAccount.email || churchRegisteredEmail;
    churchRegisteredPhone = stripeAccount.company?.phone || stripeAccount.business_profile?.support_phone || churchRegisteredPhone;
    console.log(`[Receipt] Updated church details from Stripe Account: Name='${churchRegisteredName}', Email='${churchRegisteredEmail}', Phone='${churchRegisteredPhone}'`);

    let foundEin: string | undefined = undefined;

    const companyTaxIds = (stripeAccount.company as Stripe.Account.Company & { tax_ids?: { data: Array<{ type: string; value: string }> } })?.tax_ids;
    if (companyTaxIds && companyTaxIds.data && Array.isArray(companyTaxIds.data)) {
      console.log(`[Receipt] Checking company.tax_ids (expanded). Found ${companyTaxIds.data.length} IDs.`);
      for (const taxId of companyTaxIds.data) {
        if (taxId.type === 'us_ein' && taxId.value) {
          foundEin = taxId.value;
          console.log(`[Receipt] EIN found in company.tax_ids: ${foundEin}`);
          break;
        }
      }
    } else {
      console.log(`[Receipt] company.tax_ids (expanded) not available, not in expected format, or expansion failed.`);
    }

    const settingsTaxIds = (stripeAccount.settings as Stripe.Account.Settings & { tax_ids?: { data: Array<{ type: string; value: string }> } })?.tax_ids;
    if (!foundEin && settingsTaxIds && settingsTaxIds.data && Array.isArray(settingsTaxIds.data)) {
      console.log(`[Receipt] Checking settings.tax_ids (expanded). Found ${settingsTaxIds.data.length} IDs.`);
      for (const taxId of settingsTaxIds.data) {
        if (taxId.type === 'us_ein' && taxId.value) {
          foundEin = taxId.value;
          console.log(`[Receipt] EIN found in settings.tax_ids: ${foundEin}`);
          break;
        }
      }
    } else if (!foundEin) {
      console.log(`[Receipt] settings.tax_ids (expanded) not available, not in expected format, or expansion failed.`);
    }

    if (!foundEin && stripeAccount.settings?.invoices?.default_account_tax_ids && Array.isArray(stripeAccount.settings.invoices.default_account_tax_ids)) {
      const defaultTaxIds = stripeAccount.settings.invoices.default_account_tax_ids;
      console.log(`[Receipt] Checking default_account_tax_ids. Found ${defaultTaxIds.length} ID(s) to retrieve.`);
      for (const taxIdString of defaultTaxIds) {
        if (typeof taxIdString === 'string') {
          console.log(`[Receipt] Attempting to retrieve Tax ID object for ID: ${taxIdString}`);
          try {
            const taxIdObj = await stripe.taxIds.retrieve(taxIdString);
            console.log(`[Receipt] Retrieved Tax ID object: type=${taxIdObj.type}, value=${taxIdObj.value}`);
            if (taxIdObj.type === 'us_ein' && taxIdObj.value) {
              foundEin = taxIdObj.value;
              console.log(`[Receipt] EIN found via default_account_tax_ids: ${foundEin}`);
              break;
            }
          } catch (taxIdError: unknown) {
            const errorMsg = taxIdError instanceof Error ? taxIdError.message : 'Unknown error';
            console.warn(`[Receipt] Error fetching Tax ID ${taxIdString}: ${errorMsg}`);
          }
        }
      }
    } else if (!foundEin) {
      console.log(`[Receipt] default_account_tax_ids not available, not an array, or no IDs to process.`);
    }

    if (foundEin) {
      ein = foundEin;
      console.log(`[Receipt] Final EIN for receipt: ${ein} for Stripe Account ${connectedStripeAccountId}`);
    } else {
      console.warn(`[Receipt] EIN not found for Stripe Account ${connectedStripeAccountId} after all checks. Defaulting to 'N/A'.`);
      const companyInfoForLog = stripeAccount.company ? { 
        name: stripeAccount.company.name, 
        tax_ids_exist: !!(stripeAccount.company as Stripe.Account.Company & { tax_ids?: unknown })?.tax_ids 
      } : 'No company info';
      const settingsInfoForLog = stripeAccount.settings ? { 
        dashboard_display_name: stripeAccount.settings.dashboard?.display_name, 
        tax_ids_exist: !!(stripeAccount.settings as Stripe.Account.Settings & { tax_ids?: unknown })?.tax_ids, 
        default_tax_ids_exist: !!stripeAccount.settings.invoices?.default_account_tax_ids 
      } : 'No settings info';
      console.log(`[Receipt] Stripe Account for EIN review (summary): company: ${JSON.stringify(companyInfoForLog)}, settings: ${JSON.stringify(settingsInfoForLog)}`);
    }
  } else {
    console.warn(`[Receipt] Stripe Account object for ${connectedStripeAccountId} is null (likely due to retrieval failure). EIN retrieval and account detail update skipped. Using defaults/DB values for receipt.`);
  }

  // Get donor email for receipt
  // This works for:
  // 1. Verified donors: email from Donor record or transaction
  // 2. Anonymous donors: email stored in donationTransaction.donorEmail (for receipt only)
  // 3. International donors: email stored in donationTransaction.donorEmail
  const donorEmail = donationTransaction.donorEmail || donationTransaction.Donor?.email;
  if (!donorEmail) {
    console.error(`[Receipt] No donor email found for transaction ${donationTransaction.id}. Cannot send receipt.`);
    return;
  }

  // Get donor language from transaction (defaults to 'en' if not set)
  const donorLanguage = (donationTransaction.donorLanguage || 'en') as 'en' | 'es';

  // Log receipt type for debugging
  if (donationTransaction.isAnonymous && donationTransaction.isInternational) {
    console.log(`[Receipt] Sending receipt to anonymous international donor (${donationTransaction.donorCountry || 'unknown'})`);
  } else if (donationTransaction.isAnonymous) {
    console.log(`[Receipt] Sending receipt to anonymous US donor`);
  } else if (donationTransaction.isInternational) {
    console.log(`[Receipt] Sending receipt to international donor (${donationTransaction.donorCountry || 'unknown'})`);
  }

  const donorName = donationTransaction.donorName || `${donationTransaction.Donor?.firstName || ''} ${donationTransaction.Donor?.lastName || ''}`.trim() || 'Valued Donor';

  const donorAddressParts: string[] = [];
  if (donationTransaction.Donor?.addressLine1) donorAddressParts.push(donationTransaction.Donor.addressLine1);
  const cityStateZipParts: string[] = [];
  if (donationTransaction.Donor?.city) cityStateZipParts.push(donationTransaction.Donor.city);
  if (donationTransaction.Donor?.state) cityStateZipParts.push(donationTransaction.Donor.state);
  if (donationTransaction.Donor?.postalCode) cityStateZipParts.push(donationTransaction.Donor.postalCode);
  if (cityStateZipParts.length > 0) donorAddressParts.push(cityStateZipParts.join(' '));
  if (donationTransaction.Donor?.country) donorAddressParts.push(donationTransaction.Donor.country);
  const donorAddress = donorAddressParts.length > 0 ? donorAddressParts.join('\n') : 'N/A';

  const churchAddressString = [
    churchRegisteredAddressObj.line1,
    churchRegisteredAddressObj.line2,
    `${churchRegisteredAddressObj.city || ''}${churchRegisteredAddressObj.city && (churchRegisteredAddressObj.state || churchRegisteredAddressObj.postal_code) ? ', ' : ''}${churchRegisteredAddressObj.state || ''} ${churchRegisteredAddressObj.postal_code || ''}`.trim(),
    churchRegisteredAddressObj.country
  ].filter(Boolean).join('\n');

  // Extract payment method details for enhanced display
  let cardLastFour: string | undefined;
  let cardBrand: string | undefined;
  
  if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
    const pm = paymentIntent.payment_method as Stripe.PaymentMethod;
    if (pm.card) {
      cardLastFour = pm.card.last4;
      cardBrand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
    }
  }

  // Generate a shorter confirmation number from transaction ID
  const confirmationNumber = donationTransaction.id.replace(/-/g, '').substring(0, 16).toUpperCase();

  const receiptData: DonationReceiptData = {
    transactionId: donationTransaction.id,
    confirmationNumber: confirmationNumber,
    datePaid: new Date(paymentIntent.created * 1000).toISOString(), // Pass ISO string, let template format by locale
    amountPaid: (paymentIntent.amount_received / 100).toFixed(2),
    currency: paymentIntent.currency.toUpperCase(),
    paymentMethod: paymentIntent.payment_method_types[0] ? paymentIntent.payment_method_types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
    cardLastFour: cardLastFour,
    cardBrand: cardBrand,
    churchName: churchRegisteredName,
    churchEin: ein,
    churchAddress: churchAddressString,
    churchEmail: churchRegisteredEmail,
    churchPhone: churchRegisteredPhone,
    churchLogoUrl: churchLogoUrl, // Use church's custom logo from LandingPageConfig
    donorName: donorName,
    donorEmail: donorEmail,
    donorAddress: donorAddress,
    donorPhone: donationTransaction.Donor?.phone || undefined,
    donationCampaign: donationTransaction.DonationType?.name || 'Tithes & Offerings',
    donationFrequency: 'one-time', // TODO: Update when recurring donations are implemented
    language: donorLanguage, // Add language for bilingual support
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';

  // Generate email HTML with error handling
  let emailHtml: string;
  try {
    emailHtml = generateDonationReceiptHtml(receiptData, appUrl);
  } catch (error) {
    console.error('[Receipt] Failed to generate email HTML, using fallback template:', error);
    // Simple fallback template
    emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Thank you for your donation!</h2>
          <p>Thank you for your generous donation of $${receiptData.amountPaid} ${receiptData.currency.toUpperCase()} to ${receiptData.churchName}.</p>
          <p><strong>Confirmation Number:</strong> ${receiptData.confirmationNumber}</p>
          <p><strong>Date:</strong> ${receiptData.datePaid}</p>
          <p>You will receive a detailed receipt shortly.</p>
        </body>
      </html>
    `;
  }

  try {
    // Use validated serverEnv to ensure proper email format without quotes
    const fromEmail = serverEnv.RESEND_FROM_EMAIL;
    // Bilingual email subject based on donor language
    const emailSubject = donorLanguage === 'es'
      ? `Gracias por tu contribución a ${receiptData.churchName}`
      : `Thank you for your contribution to ${receiptData.churchName}`;

    await resend.emails.send({
      from: fromEmail,
      to: [donorEmail],
      subject: emailSubject,
      html: emailHtml,
    });
    console.log(`[Receipt] Receipt email sent to ${donorEmail} for transaction ${donationTransaction.id}`);
    // processedAt already set when payment succeeded, no need to update again
  } catch (emailError: unknown) {
    console.error(`[Receipt] Error sending receipt email for transaction ${donationTransaction.id}:`, emailError);
    const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
    const errorCode = emailError instanceof Error && 'code' in emailError ? (emailError as Error & { code?: string }).code : undefined;
    
    // Capture error details for monitoring
    capturePaymentError(emailError as Error, {
      paymentIntentId: paymentIntent.id,
      churchId: donationTransaction.churchId,
    });
    
    // Log additional context for debugging
    console.error(`[Receipt] Email error details:`, {
      transactionId: donationTransaction.id,
      donorEmail,
      errorMessage,
      errorCode,
    });
    
    // Log the failure for manual follow-up
    // In production, you might want to:
    // 1. Send to a dead letter queue
    // 2. Create a task in a job queue for retry
    // 3. Alert the support team
    logger.warn(logger.fmt`MANUAL FOLLOW-UP NEEDED: Receipt email failed for transaction ${donationTransaction.id} to ${donorEmail}`);
    
    // Don't throw - let the webhook succeed even if email fails
    // This prevents Stripe from retrying the webhook unnecessarily
  }
}