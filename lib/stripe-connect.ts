import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { createConnectAccountSchema, stripeAccountIdSchema, validateInput } from '@/lib/validation/stripe';
import { logger } from '@/lib/logger';

export async function createStripeConnectAccount(churchId: string, email: string, country: string = 'US') {
  try {
    // Validate input
    const validated = validateInput(createConnectAccountSchema, { churchId, email, country });
    
    // Create a new Connect account
    // Build the account params with proper typing
    const accountParams: any = {
      type: 'express',
      country: validated.country,
      email: validated.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        link_payments: { requested: true }, // Enable Link
        us_bank_account_ach_payments: { requested: true }, // Enable ACH bank payments
      },
      // Pre-fill the business profile
      business_profile: {
        mcc: '8661', // Religious organizations
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
      // Settings with statement descriptor
      settings: {
        payments: {
          statement_descriptor: 'ALTARFLOW DONATION',
        },
        // Disable automatic email receipts for Express accounts
        // This is valid in the API but not in TypeScript definitions
        emails: {
          customer: {
            enabled: false
          }
        }
      },
      // Store the church ID in metadata for easy lookup
      metadata: {
        churchId: validated.churchId,
      },
    };
    
    const account = await stripe.accounts.create(accountParams);

    // Create a record in our database using Prisma ORM (type-safe)
    const createdAccount = await prisma.stripeConnectAccount.create({
      data: {
        stripeAccountId: account.id,
        churchId: validated.churchId,
        updatedAt: new Date(),
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
    logger.error('Error creating Stripe Connect account', {
      operation: 'stripe.connect.create_account_error',
      churchId,
      email,
      country
    }, error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error creating account onboarding link', {
      operation: 'stripe.connect.onboarding_link_error',
      accountId
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getExpressDashboardLink(accountId: string) {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    logger.error('Error creating Express Dashboard link', {
      operation: 'stripe.connect.dashboard_link_error',
      accountId
    }, error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error fetching Stripe Connect account', {
      operation: 'stripe.connect.fetch_account_error',
      churchId
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function disableStripeAutomaticReceipts(stripeAccountId: string) {
  try {
    // Update the Connect account to disable automatic receipts
    // This works for Express and Custom accounts
    const updateParams: any = {
      settings: {
        payments: {
          statement_descriptor: 'ALTARFLOW DONATION',
        },
        // Disable automatic email receipts
        // This is valid in the API but not in TypeScript definitions
        emails: {
          customer: {
            enabled: false
          }
        }
      },
    };
    
    const updatedAccount = await stripe.accounts.update(stripeAccountId, updateParams);

    logger.info('Disabled automatic receipts for Stripe account', {
      operation: 'stripe.connect.disable_receipts',
      stripeAccountId
    });
    return updatedAccount;
  } catch (error) {
    logger.error('Error disabling automatic receipts', {
      operation: 'stripe.connect.disable_receipts_error',
      stripeAccountId
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
