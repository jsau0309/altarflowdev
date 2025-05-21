import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

// Create a single Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialize Prisma client with logging in development
const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

// Assign to global in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Type assertions for our custom models
type IdempotencyCache = {
  key: string;
  responseData: string;
  expiresAt: Date;
};

type StripeConnectAccount = {
  id: string;
  stripeAccountId: string;
  churchId: string;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

// Extend the Prisma client with our custom models
type ExtendedPrismaClient = typeof prisma & {
  idempotencyCache: {
    findUnique: (args: { where: { key: string } }) => Promise<IdempotencyCache | null>;
    create: (args: { data: { key: string; responseData: string; expiresAt: Date } }) => Promise<IdempotencyCache>;
  };
  stripeConnectAccount: {
    findUnique: (args: { where: { churchId: string }, select?: any }) => Promise<StripeConnectAccount | null>;
    findFirst: (args: { 
      where: { 
        stripeAccountId?: string;
        churchId?: string;
      };
      select?: any;
    }) => Promise<{ id: string } | null>;
    upsert: (args: { 
      where: { churchId: string };
      update: Partial<StripeConnectAccount>;
      create: Omit<StripeConnectAccount, 'id' | 'createdAt' | 'updatedAt'>;
    }) => Promise<StripeConnectAccount>;
    update: (args: {
      where: { stripeAccountId: string };
      data: Partial<StripeConnectAccount>;
    }) => Promise<StripeConnectAccount>;
  };
};

// Cast the Prisma client to our extended type
const extendedPrisma = prisma as unknown as ExtendedPrismaClient;

// Helper types for our API requests
type CreateAccountRequest = {
  action: 'createAccount';
  churchId: string;
};

type GetAccountRequest = {
  action: 'getAccount';
  accountId?: string;
  churchId?: string;
};

type CreateAccountLinkRequest = {
  action: 'createAccountLink';
  accountId: string;
  refreshUrl?: string;
  returnUrl?: string;
};

type StripeApiRequest = CreateAccountRequest | GetAccountRequest | CreateAccountLinkRequest;

// Helper function to handle idempotent operations
async function withIdempotency<T>(
  req: Request,
  operation: () => Promise<T>,
  { keyPrefix = 'stripe_op_' }: { keyPrefix?: string } = {}
): Promise<T> {
  const headersList = headers();
  const idempotencyKey = headersList.get('Idempotency-Key');
  
  if (!idempotencyKey) {
    throw new Error('Idempotency-Key header is required');
  }
  
  const cacheKey = `${keyPrefix}${idempotencyKey}`;
  
  // Check if we've seen this request before
  const cachedResponse = await extendedPrisma.idempotencyCache.findUnique({
    where: { key: cacheKey },
  });
  
  if (cachedResponse) {
    // Return the cached response
    return JSON.parse(cachedResponse.responseData) as T;
  }
  
  // Execute the operation
  try {
    const result = await operation();
    
    // Cache the successful response
    await extendedPrisma.idempotencyCache.create({
      data: {
        key: cacheKey,
        responseData: JSON.stringify(result),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Cache for 24 hours
      },
    });
    
    return result;
  } catch (error) {
    // Don't cache errors
    throw error;
  }
}

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Using the latest stable API version from the installed Stripe package
  apiVersion: '2025-02-24.acacia', // This should match the version from the installed Stripe package
  typescript: true,
});

// Type guard functions for request types
function isCreateAccountRequest(req: StripeApiRequest): req is CreateAccountRequest {
  return req.action === 'createAccount' && 'churchId' in req && typeof req.churchId === 'string';
}

function isGetAccountRequest(req: StripeApiRequest): req is GetAccountRequest {
  return req.action === 'getAccount' && (
    ('accountId' in req && typeof req.accountId === 'string') ||
    ('churchId' in req && typeof req.churchId === 'string')
  );
}

function isCreateAccountLinkRequest(req: StripeApiRequest): req is CreateAccountLinkRequest {
  return req.action === 'createAccountLink' && 'accountId' in req && typeof req.accountId === 'string';
}

export async function POST(req: Request) {
  try {
    // Get the organization ID from Clerk
    const authObj = await auth();
    const orgId = authObj.orgId;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - No organization selected' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await req.json() as StripeApiRequest;
    
    // Extract action safely
    const { action } = body;
    
    // Ensure the churchId in the request matches the authenticated organization
    if ('churchId' in body && body.churchId && body.churchId !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid organization' },
        { status: 403 }
      );
    }

    // Route the request based on the action
    if (isCreateAccountRequest(body)) {
      return await withIdempotency(req, () => 
        handleCreateAccount(orgId), // Use the orgId from auth
        { keyPrefix: 'create_acct_' }
      );
    }
    
    if (isGetAccountRequest(body)) {
      // Always use the authenticated orgId for getAccount
      return await withIdempotency(req, () => 
        handleGetAccount({ ...body, churchId: orgId }),
        { keyPrefix: 'get_acct_' }
      );
    }
    
    if (isCreateAccountLinkRequest(body)) {
      // Verify the account belongs to the current organization
      const account = await extendedPrisma.stripeConnectAccount.findFirst({
        where: { 
          stripeAccountId: body.accountId,
          churchId: orgId
        },
        select: { id: true },
      });
      
      if (!account) {
        return NextResponse.json(
          { error: 'Unauthorized - Account not found or does not belong to your organization' },
          { status: 403 }
        );
      }
      
      return await withIdempotency(req, () => 
        handleCreateAccountLink({
          accountId: body.accountId,
          refreshUrl: body.refreshUrl,
          returnUrl: body.returnUrl,
        }),
        { keyPrefix: 'create_link_' }
      );
    }
    
    return NextResponse.json(
      { error: 'Invalid action or missing required parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Stripe API Error:', error);
    
    // Handle idempotency key errors specifically
    if (error instanceof Error && error.message.includes('Idempotency-Key')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          code: error.code,
        },
        { status: 400 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Create a new Stripe Connect account
async function handleCreateAccount(churchId: string) {
  // Create the Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      church_id: churchId,
    },
  });

  // Save the account reference in our database
  await extendedPrisma.stripeConnectAccount.upsert({
    where: { churchId },
    update: {
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
      metadata: account.metadata as any,
    },
    create: {
      stripeAccountId: account.id,
      churchId,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
      metadata: account.metadata as any,
    },
  });

  return NextResponse.json({ 
    accountId: account.id,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
}

// Get account details
async function handleGetAccount({ accountId, churchId }: GetAccountRequest) {
  if (!accountId && !churchId) {
    throw new Error('Either accountId or churchId must be provided');
  }

  let stripeAccountId = accountId;
  
  // If only churchId is provided, look up the Stripe account ID
  if (!stripeAccountId && churchId) {
    const account = await extendedPrisma.stripeConnectAccount.findUnique({
      where: { churchId },
      select: { stripeAccountId: true },
    });
    
    if (!account) {
      // Return a 200 response with null account when no account is found
      return NextResponse.json({ account: null });
    }
    
    stripeAccountId = account.stripeAccountId;
  }
  
  if (!stripeAccountId) {
    throw new Error('Unable to determine Stripe account ID');
  }

  // Retrieve the account from Stripe
  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  
  // Update our local database with the latest status
  await extendedPrisma.stripeConnectAccount.update({
    where: { stripeAccountId },
    data: {
      chargesEnabled: stripeAccount.charges_enabled || false,
      detailsSubmitted: stripeAccount.details_submitted || false,
      payoutsEnabled: stripeAccount.payouts_enabled || false,
      metadata: stripeAccount.metadata as any,
    },
  });

  return NextResponse.json({ 
    account: {
      id: stripeAccount.id,
      detailsSubmitted: stripeAccount.details_submitted,
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      requirements: stripeAccount.requirements,
      metadata: stripeAccount.metadata,
    }
  });
}

// Create an account link for onboarding
export async function handleCreateAccountLink({
  accountId,
  refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/banking/account`,
  returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/banking/account?success=true`,
}: {
  accountId: string;
  refreshUrl?: string;
  returnUrl?: string;
}) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  if (!accountLink.url) {
    throw new Error('Failed to create account link');
  }

  return NextResponse.json({ url: accountLink.url });
}
