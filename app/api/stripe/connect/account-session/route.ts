import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma'; // Assuming prisma is at this path

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
    // Assuming your Church model has a field like 'clerkOrgId' and 'stripeConnectAccountId'
    const church = await prisma.church.findUnique({
      where: {
        clerkOrgId: orgId, // Or whatever field links your Church model to Clerk's orgId
      },
      select: {
        stripeConnectAccount: {
          select: {
            stripeAccountId: true,
          },
        },
      },
    });

    if (!church || !church.stripeConnectAccount || typeof church.stripeConnectAccount.stripeAccountId !== 'string' || !church.stripeConnectAccount.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe Connect account not found or not configured for this organization.' }, { status: 404 });
    }

    const stripeConnectAccountId = church.stripeConnectAccount.stripeAccountId;

    // Create an Account Session
    const accountSession = await stripe.accountSessions.create({
      account: stripeConnectAccountId,
      components: {
        account_management: {
          enabled: true,
          // features: {} // Optional: fine-tune features if needed later
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
        payments: { // For the list of transactions/payments
          enabled: true,
        },
        payouts: { // For managing payout settings and initiating payouts
          enabled: true,
          features: {
            instant_payouts: true,
            edit_payout_schedule: true,
          },
        },
        // payouts_list is removed as it's not used on the frontend
        // You can add other components like 'documents' or 'notification_banner' later if needed
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
