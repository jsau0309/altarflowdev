import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { createConnectAccountSchema, stripeAccountIdSchema, validateInput } from '@/lib/validation/stripe';

export async function createStripeConnectAccount(churchId: string, email: string, country: string = 'US') {
  try {
    // Validate input
    const validated = validateInput(createConnectAccountSchema, { churchId, email, country });
    
    // Create a new Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: validated.country,
      email: validated.email,
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
        churchId: validated.churchId,
      },
    });

    // Create a record in our database using Prisma ORM (type-safe)
    const createdAccount = await prisma.stripeConnectAccount.create({
      data: {
        stripeAccountId: account.id,
        churchId: validated.churchId,
      },
      select: {
        id: true,
        stripeAccountId: true,
        churchId: true,
      }
    });

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
    // Validate Stripe account ID format
    validateInput(stripeAccountIdSchema, accountId);
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
    const account = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: churchId }
    });
    return account;
  } catch (error) {
    console.error('Error fetching Stripe Connect account:', error);
    throw error;
  }
}
