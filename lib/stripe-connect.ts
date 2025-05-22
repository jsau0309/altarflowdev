import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function createStripeConnectAccount(churchId: string, email: string, country: string = 'US') {
  try {
    // Create a new Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Pre-fill the business profile
      business_profile: {
        mcc: '8661', // Religious organizations
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
      // Store the church ID in metadata for easy lookup
      metadata: {
        churchId,
      },
    });

    // Create a record in our database using raw SQL
    await prisma.$executeRaw`
      INSERT INTO "StripeConnectAccount" 
      ("id", "stripeAccountId", "churchId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${account.id}, ${churchId}::uuid, NOW(), NOW())
    `;

    // Return the created account details
    const [createdAccount] = await prisma.$queryRaw<Array<{
      id: string;
      stripeAccountId: string;
      churchId: string;
    }>>`
      SELECT * FROM "StripeConnectAccount" 
      WHERE "stripeAccountId" = ${account.id}
      LIMIT 1
    `;

    return {
      account,
      connectAccount: createdAccount,
    };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

export async function getAccountOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating account onboarding link:', error);
    throw error;
  }
}

export async function getExpressDashboardLink(accountId: string) {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating Express Dashboard link:', error);
    throw error;
  }
}

export async function getStripeConnectAccount(churchId: string) {
  try {
    const accounts = await prisma.$queryRaw<Array<{
      id: string;
      stripeAccountId: string;
      churchId: string;
      chargesEnabled: boolean;
      detailsSubmitted: boolean;
      payoutsEnabled: boolean;
      verificationStatus: string;
      requirementsCurrentlyDue: string;
      requirementsEventuallyDue: string;
      requirementsDisabledReason: string | null;
      tosAcceptanceDate: Date | null;
      metadata: any;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT * FROM "StripeConnectAccount" 
      WHERE "churchId" = ${churchId}::uuid
      LIMIT 1
    `;
    return accounts[0] || null;
  } catch (error) {
    console.error('Error fetching Stripe Connect account:', error);
    throw error;
  }
}
