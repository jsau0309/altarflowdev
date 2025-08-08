import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use your project's Stripe API version
  typescript: true,
});

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
        stripeConnectAccount: {
          select: {
            stripeAccountId: true,
          },
        },
      },
    });

    if (!church) {
      return NextResponse.json({ error: 'Church not found for this organization.' }, { status: 404 });
    }

    // Handle case where no Stripe account exists yet - create one for onboarding
    let stripeConnectAccountId: string;
    
    if (!church.stripeConnectAccount || !church.stripeConnectAccount.stripeAccountId) {
      // Create a new Connect account for onboarding
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          churchId: orgId,
        },
      });
      
      // Save the account to database
      // Note: churchId references clerkOrgId in the schema, not the church.id
      await prisma.stripeConnectAccount.create({
        data: {
          churchId: orgId, // Use orgId which is the clerkOrgId
          stripeAccountId: account.id,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          verificationStatus: 'unverified',
        },
      });
      
      stripeConnectAccountId = account.id;
    } else {
      stripeConnectAccountId = church.stripeConnectAccount.stripeAccountId;
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
