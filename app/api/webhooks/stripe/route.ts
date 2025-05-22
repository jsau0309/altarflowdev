import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature') as string;

    // Verify the webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
        // Add tolerance for clock skew (in seconds)
        300
      );
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    // Log the event for debugging
    console.log(`Received Stripe event: ${event.type}`, { event });

    // Handle the specific event type
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;
      // Add more event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log('Processing account.updated event for account:', account.id);

    // Determine verification status based on Stripe account status
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
      updatedAt: new Date(),
    };

    await prisma.$executeRaw`
      UPDATE "StripeConnectAccount"
      SET
        "chargesEnabled" = ${updateData.chargesEnabled},
        "detailsSubmitted" = ${updateData.detailsSubmitted},
        "payoutsEnabled" = ${updateData.payoutsEnabled},
        "verificationStatus" = ${updateData.verificationStatus},
        "requirementsCurrentlyDue" = ${updateData.requirementsCurrentlyDue},
        "requirementsEventuallyDue" = ${updateData.requirementsEventuallyDue},
        "requirementsDisabledReason" = ${updateData.requirementsDisabledReason},
        "tosAcceptanceDate" = ${updateData.tosAcceptanceDate},
        "updatedAt" = ${updateData.updatedAt}
      WHERE "stripeAccountId" = ${account.id}
    `;
    console.log(`Successfully updated StripeConnectAccount for account: ${account.id} via webhook.`);
  } catch (error: any) {
    console.error(`Error in handleAccountUpdated for account ${account.id}:`, error);
    throw error;
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  try {
    console.log(`Processing capability.updated event for capability: ${capability.id} on account: ${capability.account as string}`);
    const retrievedAccount = await stripe.accounts.retrieve(capability.account as string);
    await handleAccountUpdated(retrievedAccount);
    console.log(`Successfully processed capability.updated by updating parent account: ${retrievedAccount.id}`);
  } catch (error: any) {
    console.error(`Error in handleCapabilityUpdated for capability ${capability.id} on account ${capability.account as string}:`, error);
    throw error;
  }
}


