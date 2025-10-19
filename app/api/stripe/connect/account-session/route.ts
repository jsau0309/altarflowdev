import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getStripeInstance } from '@/lib/stripe-server';

const stripe = getStripeInstance();

export async function POST(req: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized: No organization ID found.' }, { status: 401 });
    }

    // Fetch the church/organization details including the Stripe Connect Account ID
    const church = await prisma.church.findUnique({
      where: {
        clerkOrgId: orgId,
      },
      select: {
        id: true,
        StripeConnectAccount: {
          select: {
            stripeAccountId: true,
          },
        },
      },
    });

    if (!church) {
      return NextResponse.json({ error: 'Church not found for this organization.' }, { status: 404 });
    }

    // Check if we need to create an account
    let stripeConnectAccountId: string;
    
    if (!church.StripeConnectAccount || !church.StripeConnectAccount.stripeAccountId) {
      // Check if this is an explicit request to start onboarding
      const body = await req.json().catch(() => ({}));
      const startOnboarding = body.startOnboarding === true;
      
      if (!startOnboarding) {
        // Return a response indicating onboarding is needed without creating account
        return NextResponse.json({ 
          requiresOnboarding: true,
          message: 'No Stripe Connect account exists. User must start onboarding first.'
        }, { status: 200 });
      }
      
      // Only create account if explicitly requested
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          link_payments: { requested: true }, // Enable Link
          us_bank_account_ach_payments: { requested: true }, // Enable ACH bank payments
        },
        metadata: {
          churchId: orgId,
        },
      });
      
      // Save the account to database using upsert to handle race conditions
      await prisma.stripeConnectAccount.upsert({
        where: { churchId: orgId },
        create: {
          churchId: orgId,
          stripeAccountId: account.id,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          verificationStatus: 'unverified',
          updatedAt: new Date(),
        },
        update: {
          stripeAccountId: account.id,
          updatedAt: new Date(),
        }
      });
      
      stripeConnectAccountId = account.id;
    } else {
      stripeConnectAccountId = church.StripeConnectAccount.stripeAccountId;
    }

    // Create an Account Session
    const accountSession = await stripe.accountSessions.create({
      account: stripeConnectAccountId,
      components: {
        account_management: {
          enabled: true,
        },
        account_onboarding: {
          enabled: true,
        },
        balances: {
          enabled: true,
          features: {
            instant_payouts: true,
            edit_payout_schedule: true,
          },
        },
        payments: {
          enabled: true,
        },
        payouts: {
          enabled: true,
          features: {
            instant_payouts: true,
            edit_payout_schedule: true,
          },
        },
        notification_banner: {
          enabled: true,
        },
        documents: {
          enabled: true,
        },
      },
    });

    return NextResponse.json({ client_secret: accountSession.client_secret });

  } catch (error) {
    console.error('Error creating Stripe Account Session:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Differentiate Stripe errors for more specific feedback if possible
    if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: error.statusCode || 500 });
    }
    return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
