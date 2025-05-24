import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const webhookSecret = process.env.STRIPE_CLI_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not set.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }
  if (!signature) {
    console.error('Stripe signature is missing from the request.');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
        300 // Clock skew tolerance
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  console.log(`Received Stripe event: ${event.type}`, { eventId: event.id }); // Added eventId for better tracking

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent ${paymentIntentSucceeded.id} was successful!`);
        await prisma.donationTransaction.update({
          where: { stripePaymentIntentId: paymentIntentSucceeded.id },
          data: {
            status: 'succeeded',
            paymentMethodType: paymentIntentSucceeded.payment_method_types[0] || null,
          },
        });
        console.log(`Updated transaction for PaymentIntent ${paymentIntentSucceeded.id} to succeeded.`);
        break;

      case 'payment_intent.payment_failed':
        const paymentIntentPaymentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent ${paymentIntentPaymentFailed.id} failed.`);
        await prisma.donationTransaction.update({
          where: { stripePaymentIntentId: paymentIntentPaymentFailed.id },
          data: {
            status: 'failed',
            // Optionally store failure reason: paymentIntentPaymentFailed.last_payment_error?.message
          },
        });
        console.log(`Updated transaction for PaymentIntent ${paymentIntentPaymentFailed.id} to failed.`);
        break;

      case 'account.updated':
        const accountUpdated = event.data.object as Stripe.Account;
        console.log(`Processing event: ${event.type} for account ${accountUpdated.id}`);
        await handleAccountUpdated(accountUpdated);
        break;

      case 'capability.updated':
        const capabilityUpdated = event.data.object as Stripe.Capability;
        console.log(`Processing event: ${event.type} for capability ${capabilityUpdated.id} on account ${capabilityUpdated.account as string}`);
        await handleCapabilityUpdated(capabilityUpdated);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (handlerError) {
      // Catch errors from DB operations within cases or from the helper functions
      console.error(`Error processing webhook event ${event.id} (type: ${event.type}):`, handlerError);
      // Return 500 so Stripe retries for processing errors.
      return NextResponse.json({ error: 'Webhook event processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// Helper functions for Connect events (restored from original file)
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log('handleAccountUpdated: Processing account.updated event for account:', account.id);

    let verificationStatus = 'unverified';
    if (account.charges_enabled && account.payouts_enabled) {
      verificationStatus = 'verified';
    } else if (account.details_submitted) {
      if (account.requirements?.disabled_reason) {
        verificationStatus = account.requirements.disabled_reason === 'requirements.past_due'
          ? 'action_required'
          : 'restricted';
      } else {
        verificationStatus = 'pending';
      }
    }

    const updateData = {
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
      verificationStatus,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      requirementsDisabledReason: account.requirements?.disabled_reason || null,
      tosAcceptanceDate: account.tos_acceptance?.date
        ? new Date(account.tos_acceptance.date * 1000)
        : null,
      updatedAt: new Date(), // Ensure this is always set to reflect the update time
    };

    await prisma.stripeConnectAccount.update({
        where: { stripeAccountId: account.id },
        data: updateData,
    });
    // Switched from $executeRaw to Prisma ORM update for type safety and consistency,
    // assuming StripeConnectAccount model fields match updateData structure.

    console.log(`handleAccountUpdated: Successfully updated StripeConnectAccount for account: ${account.id}`);
  } catch (error: any) {
    console.error(`Error in handleAccountUpdated for account ${account.id}:`, error);
    throw error; // Re-throw to be caught by the main handler's try-catch, ensuring Stripe retries
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  try {
    const accountId = capability.account as string;
    console.log(`handleCapabilityUpdated: Processing capability.updated event for capability: ${capability.id} on account: ${accountId}`);
    const retrievedAccount = await stripe.accounts.retrieve(accountId);
    await handleAccountUpdated(retrievedAccount); // Re-use handleAccountUpdated to refresh account status
    console.log(`handleCapabilityUpdated: Successfully processed capability.updated by re-evaluating account: ${accountId}`);
  } catch (error: any) {
    console.error(`Error in handleCapabilityUpdated for capability ${capability.id} on account ${capability.account as string}:`, error);
    throw error; // Re-throw
  }
}
