import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { PrismaClient, Prisma } from '@prisma/client';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import type { OrganizationMembership } from '@clerk/backend';
import { getBaseUrl } from '@/lib/stripe';

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
  verificationStatus: string;
  requirementsCurrentlyDue: string;
  requirementsEventuallyDue: string;
  requirementsDisabledReason: string | null;
  tosAcceptanceDate: Date | null;
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
    delete: (args: { where: { stripeAccountId: string } }) => Promise<StripeConnectAccount>; // Added for delete
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
  churchId: string; // Changed from accountId to churchId
  refreshUrl?: string;
  returnUrl?: string;
};

interface CreateLoginLinkRequest {
  action: 'createLoginLink';
  accountId: string;
}

type DeleteAccountRequest = {
  action: 'deleteAccount';
  stripeAccountId: string; // The Stripe Account ID (acct_...) to delete
};

type StripeApiRequest = CreateAccountRequest | GetAccountRequest | CreateAccountLinkRequest | CreateLoginLinkRequest | DeleteAccountRequest;

// Helper function to handle idempotent operations for NextResponse
async function withIdempotency(
  req: Request,
  operation: () => Promise<NextResponse>, // Operation must return a NextResponse
  { keyPrefix = 'stripe_op_' }: { keyPrefix?: string } = {}
): Promise<NextResponse> { // Function returns a NextResponse
  const headersList = headers();
  const idempotencyKey = headersList.get('Idempotency-Key');
  
  if (!idempotencyKey) {
    console.error('[withIdempotency] Idempotency-Key header is MISSING from the request (derived from next/headers).');
    const headersObject: Record<string, string> = {};
    // Log headers from the 'req' object passed into withIdempotency
    req.headers.forEach((value, key) => {
      headersObject[key] = value;
    });
    console.error('[withIdempotency] Received headers on req object:', JSON.stringify(headersObject));
    throw new Error('Idempotency-Key header is required');
  }
  
  const cacheKey = `${keyPrefix}${idempotencyKey}`;
  
  // Check if we've seen this request before
  const cachedResponse = await extendedPrisma.idempotencyCache.findUnique({
    where: { key: cacheKey },
  });
  
  if (cachedResponse) {
    console.log(`[DEBUG] Idempotency: Returning cached response for key: ${cacheKey}`);
    const parsedData = JSON.parse(cachedResponse.responseData);
    // Reconstruct the NextResponse from cached parts
    return new NextResponse(parsedData.body, {
      status: parsedData.status,
      headers: parsedData.headers,
    });
  }
  
  // Execute the operation, which returns a NextResponse
  let response: NextResponse;
  try {
    response = await operation();
  } catch (operationError) {
    console.error(`Idempotent operation failed for key ${cacheKey}:`, operationError);
    throw operationError;
  }

  // If operation was successful, prepare response for caching
  const responseToCache = {
    body: await response.clone().text(), // Clone because body can be read once
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  try {
    await extendedPrisma.idempotencyCache.create({
      data: {
        key: cacheKey,
        responseData: JSON.stringify(responseToCache),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Cache for 24 hours
      },
    });
    console.log(`[DEBUG] Idempotency: Cached response for key: ${cacheKey}`);
  } catch (cacheError: any) { 
    if (
      cacheError instanceof Prisma.PrismaClientKnownRequestError &&
      cacheError.code === 'P2002'
    ) {
      const target = cacheError.meta?.target as string[] | undefined;
      if (target && target.includes('key')) {
        console.warn(
          `Idempotency cache write failed due to a race condition for key: ${cacheKey}. ` +
          `The result was likely cached by a concurrent request. Returning current operation's result.`
        );
      } else {
        console.error(
          `Idempotency cache write failed with P2002 on unexpected fields or missing/invalid meta.target for key: ${cacheKey}.`,
          cacheError
        );
        throw cacheError; 
      }
    } else {
      console.error(`Idempotency cache write failed for key: ${cacheKey}.`, cacheError);
      throw cacheError; 
    }
  }
  
  return response; 
}

// Helper function to get admin email for an organization
async function getAdminEmailForOrganization(clerkOrgId: string): Promise<string | null> {
  try {
    const client = await clerkClient(); 
    console.log(`[DEBUG] Fetching memberships for organization: ${clerkOrgId}`);
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
    });

    const memberships = membershipsResponse.data; 

    if (!memberships || memberships.length === 0) {
      console.warn(`[WARN] No memberships found for organization: ${clerkOrgId}`);
      return null;
    }

    const adminRole = "org:admin"; 

    const adminMembership = memberships.find((mem: OrganizationMembership) => mem.role === adminRole);

    if (!adminMembership || !adminMembership.publicUserData?.userId) {
      console.warn(`[WARN] No admin member found with role '${adminRole}' for organization: ${clerkOrgId}`);
      return null;
    }

    const adminUserId = adminMembership.publicUserData.userId;
    console.log(`[DEBUG] Found admin member with userId: ${adminUserId}`);

    const adminUser = await client.users.getUser(adminUserId);

    if (!adminUser || !adminUser.primaryEmailAddress?.emailAddress) {
      console.warn(`[WARN] Admin user ${adminUserId} found, but no primary email address.`);
      return null;
    }

    const adminEmail = adminUser.primaryEmailAddress.emailAddress;
    console.log(`[INFO] Successfully fetched admin email: ${adminEmail} for organization: ${clerkOrgId}`);
    return adminEmail;

  } catch (error) {
    console.error(`[ERROR] Failed to get admin email for organization ${clerkOrgId}:`, error);
    throw new Error(`Failed to retrieve admin email for organization ${clerkOrgId}.`);
  }
}

// Initialize Stripe client with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  maxNetworkRetries: 2,
  appInfo: {
    name: 'AltarFlow',
    version: '1.0.0',
  },
});

// Type guard functions for request types
function isCreateAccountRequest(req: StripeApiRequest): req is CreateAccountRequest {
  return req.action === 'createAccount';
}

function isGetAccountRequest(req: StripeApiRequest): req is GetAccountRequest {
  return req.action === 'getAccount';
}

function isCreateAccountLinkRequest(req: StripeApiRequest): req is CreateAccountLinkRequest {
  return req.action === 'createAccountLink';
}

function isDeleteAccountRequest(req: StripeApiRequest): req is DeleteAccountRequest {
  return req.action === 'deleteAccount';
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as StripeApiRequest;
    console.log(`[DEBUG] Inside POST handler - action: ${body.action}, body:`, body);

    // Define default URLs within the POST function's scope to ensure availability
    const localDefaultReturnUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/banking` : 'http://localhost:3000/banking';
    const localDefaultRefreshUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/banking` : 'http://localhost:3000/banking';
    
    try {
      if (isCreateAccountRequest(body)) {
        return await withIdempotency(req, () => handleCreateAccount(
          body.churchId,
          undefined, // CreateAccountRequest has no custom refreshUrl
          undefined, // CreateAccountRequest has no custom returnUrl
          localDefaultRefreshUrl, // Pass locally defined default
          localDefaultReturnUrl   // Pass locally defined default
        ), { keyPrefix: `createAccount_${body.churchId}` });
      }
      else if (isGetAccountRequest(body)) {
        return await withIdempotency(req, () => handleGetAccount(body));
      }
      else if (isCreateAccountLinkRequest(body)) {
        // The client sends churchId. handleCreateAccount takes clerkOrgId (which is churchId)
        // and already handles creating the account if needed and then the link.
        // It also returns an object with onboardingUrl.
        // We can pass refreshUrl and returnUrl to handleCreateAccount if we modify it, 
        // or let it use its defaults for now.
        // For simplicity, let's call it with just churchId for now.
        return await withIdempotency(req, () => handleCreateAccount(
          body.churchId,      // Use churchId from CreateAccountLinkRequest
          body.refreshUrl,    // Pass custom refreshUrl from body
          body.returnUrl,     // Pass custom returnUrl from body
          localDefaultRefreshUrl,  // Pass locally defined default
          localDefaultReturnUrl    // Pass locally defined default
        ), { keyPrefix: `createAccountLink_${body.churchId}` });
      }
      else if (isDeleteAccountRequest(body)) {
        if (!body.stripeAccountId) {
          return NextResponse.json(
            { error: 'Missing stripeAccountId for deleteAccount action' },
            { status: 400 }
          );
        }
        return await withIdempotency(req, () => handleDeleteAccount(body.stripeAccountId), { keyPrefix: 'stripe_del_op_' });
      }
      else if (body.action === 'createLoginLink') { 
        const { accountId } = body as CreateLoginLinkRequest;
        
        if (!accountId) { 
          return NextResponse.json(
            { error: 'Missing accountId for login link' },
            { status: 400 }
          );
        }
        
        return await withIdempotency(req, async () => {
          try {
            const loginLink = await stripe.accounts.createLoginLink(accountId);
            return NextResponse.json({
              url: loginLink.url,
            });
          } catch (error) {
            console.error('Error creating login link:', error);
            return NextResponse.json(
              { error: 'Failed to create login link' },
              { status: 500 }
            );
          }
        });
      }
      else { 
        console.warn(`[WARN] Unknown action received: ${(body as any).action}`);
        return NextResponse.json(
            { error: `Unknown action: ${(body as any).action}` },
            { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('[CRITICAL] Error caught in POST handler main try...catch:', error);
      console.error('[CRITICAL] Error name:', error?.name);
      console.error('[CRITICAL] Error message:', error?.message);
      console.error('[CRITICAL] Error stack:', error?.stack);
      console.error('[CRITICAL] Error type (if any):', error?.type);
      console.error('[CRITICAL] Error code (if any):', error?.code);

      try {
        if (error instanceof Stripe.errors.StripeError) {
          console.log('[CRITICAL] Detected StripeError, returning specific response.');
          return NextResponse.json(
            { 
              error: 'Stripe API Error: ' + error.message,
              type: error.type,
              code: error.code,
            },
            { status: error.statusCode || 400 }
          );
        } else {
          console.log('[CRITICAL] Non-Stripe error, returning generic 500 response.');
          return NextResponse.json(
            { error: 'Internal Server Error - See server logs for details.' },
            { status: 500 }
          );
        }
      } catch (responseError: any) {
        console.error('[ULTRA_CRITICAL] Failed to create NextResponse in error handler:', responseError);
        throw new Error('PANIC: Failed to construct error response in POST handler.');
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Create a new Stripe Connect account
async function handleCreateAccount(
  clerkOrgId: string,
  customRefreshUrl?: string,
  customReturnUrl?: string,
  passedDefaultRefreshUrl?: string, // Added parameter
  passedDefaultReturnUrl?: string    // Added parameter
): Promise<NextResponse> {
  console.log('[DEBUG] handleCreateAccount - Input clerkOrgId:', clerkOrgId);

  try {
    console.log(`[DEBUG] Fetching church details for clerkOrgId: ${clerkOrgId}`);
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: clerkOrgId },
      select: { id: true, name: true }, 
    });

    if (!church) {
      console.error(`[ERROR] Church not found in database for clerkOrgId: ${clerkOrgId}`);
      return NextResponse.json(
        { error: 'Church organization not found in our records. Cannot create Stripe account.' },
        { status: 404 }
      );
    }
    const churchDatabaseId = church.id;
    const churchName = church.name;
    console.log(`[DEBUG] Found church in DB (ID: ${churchDatabaseId}, Name: ${churchName}) for clerkOrgId: ${clerkOrgId}`);

    const existingStripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: clerkOrgId }, 
    });

    if (existingStripeConnectAccount) {
      console.log(`[INFO] Existing StripeConnectAccount found for clerkOrgId ${clerkOrgId}: ${existingStripeConnectAccount.stripeAccountId}`);
      const finalRefreshUrlExisting = customRefreshUrl || passedDefaultRefreshUrl;
      const finalReturnUrlExisting = customReturnUrl || passedDefaultReturnUrl;
      console.log('[handleCreateAccount - Existing Account] Values for account link creation:');
      console.log('[handleCreateAccount - Existing Account] customRefreshUrl:', customRefreshUrl);
      console.log('[handleCreateAccount - Existing Account] defaultRefreshUrl:', passedDefaultRefreshUrl);
      console.log('[handleCreateAccount - Existing Account] FINAL refresh_url for Stripe:', finalRefreshUrlExisting);
      console.log('[handleCreateAccount - Existing Account] customReturnUrl:', customReturnUrl);
      console.log('[handleCreateAccount - Existing Account] defaultReturnUrl:', passedDefaultReturnUrl);
      console.log('[handleCreateAccount - Existing Account] FINAL return_url for Stripe:', finalReturnUrlExisting);
      console.log('[handleCreateAccount - Existing Account] Stripe Account ID for link:', existingStripeConnectAccount.stripeAccountId);

      const accountLink = await stripe.accountLinks.create({
        account: existingStripeConnectAccount.stripeAccountId,
        refresh_url: finalRefreshUrlExisting,
        return_url: finalReturnUrlExisting,
        type: 'account_onboarding',
      });
      console.log(`[DEBUG] Created new account link for existing Stripe account: ${existingStripeConnectAccount.stripeAccountId}`);
      return NextResponse.json({
        accountId: existingStripeConnectAccount.stripeAccountId,
        onboardingUrl: accountLink.url,
        message: 'Stripe account already exists. New onboarding link generated.',
      });
    }

    console.log(`[INFO] No existing StripeConnectAccount found for clerkOrgId ${clerkOrgId}. Proceeding with new account creation.`);
    let adminEmail: string | null = null;
    try {
      adminEmail = await getAdminEmailForOrganization(clerkOrgId);
    } catch (error) {
      console.error(`[ERROR] Stripe account creation failed due to error fetching admin email for org ${clerkOrgId}:`, error);
      return NextResponse.json(
        { error: "Stripe account creation failed: Could not retrieve organization admin details." },
        { status: 500 }
      );
    }

    if (!adminEmail) {
      console.error(`[ERROR] No admin email found for Stripe account creation (org: ${clerkOrgId}).`);
      return NextResponse.json(
        { error: "Stripe account creation failed: Administrator email not found for the organization." },
        { status: 404 } 
      );
    }

    console.log(`[INFO] Using admin email for Stripe: ${adminEmail} for organization ${clerkOrgId}`);

    const newStripeAccount = await stripe.accounts.create({
      type: 'express',
      email: adminEmail, 
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8398', 
        name: churchName || clerkOrgId, 
        product_description: 'Religious services and community support',
      },
      metadata: {
        clerkOrgId: clerkOrgId, 
        churchDatabaseId: churchDatabaseId, 
      },
    });
    console.log(`[DEBUG] New Stripe account created successfully: ${newStripeAccount.id} for clerkOrgId: ${clerkOrgId}`);

    await prisma.stripeConnectAccount.create({
      data: {
        stripeAccountId: newStripeAccount.id,
        churchId: clerkOrgId, 
      }
    });
    console.log(`[DEBUG] StripeConnectAccount record inserted into DB for new Stripe Account ID: ${newStripeAccount.id} and Church (clerkOrgId): ${clerkOrgId}`);

    const finalRefreshUrlNew = customRefreshUrl || passedDefaultRefreshUrl;
    const finalReturnUrlNew = customReturnUrl || passedDefaultReturnUrl;
    console.log('[handleCreateAccount - New Account] Values for account link creation:');
    console.log('[handleCreateAccount - New Account] customRefreshUrl:', customRefreshUrl);
    console.log('[handleCreateAccount - New Account] defaultRefreshUrl:', passedDefaultRefreshUrl);
    console.log('[handleCreateAccount - New Account] FINAL refresh_url for Stripe:', finalRefreshUrlNew);
    console.log('[handleCreateAccount - New Account] customReturnUrl:', customReturnUrl);
    console.log('[handleCreateAccount - New Account] defaultReturnUrl:', passedDefaultReturnUrl);
    console.log('[handleCreateAccount - New Account] FINAL return_url for Stripe:', finalReturnUrlNew);
    console.log('[handleCreateAccount - New Account] Stripe Account ID for link:', newStripeAccount.id);

    const accountLink = await stripe.accountLinks.create({
      account: newStripeAccount.id,
      refresh_url: finalRefreshUrlNew,
      return_url: finalReturnUrlNew,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId: newStripeAccount.id,
      onboardingUrl: accountLink.url,
    });

  } catch (error) {
    console.error('Error in handleCreateAccount:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        console.error('[ERROR] Prisma Foreign Key Constraint Violation (P2003):', error.message);
        return NextResponse.json(
          { error: 'Database error: Could not link Stripe account to church due to a reference issue.' }, 
          { status: 500 }
        );
      }
      console.error('[ERROR] Prisma Database Error:', error.message);
      return NextResponse.json(
        { error: 'A database error occurred while creating the Stripe account.' }, 
        { status: 500 }
      );
    } else if (error instanceof Stripe.errors.StripeError) {
      console.error('[ERROR] Stripe API Error:', error.message);
      return NextResponse.json(
        { error: `Stripe API error: ${error.message}` }, 
        { status: error.statusCode || 500 }
      );
    } else {
      console.error('[ERROR] Unknown error in handleCreateAccount:', error);
      return NextResponse.json(
        { error: 'An unexpected error occurred while creating the Stripe account.' }, 
        { status: 500 }
      );
    }
  }
}

// Get account details
async function handleGetAccount({
  accountId,
  churchId,
}: GetAccountRequest): Promise<NextResponse> {
  try {
    let whereClause = {};
    
    if (accountId) {
      whereClause = { stripeAccountId: accountId };
    } else if (churchId) {
      whereClause = { churchId };
    } else {
      return NextResponse.json(
        { error: 'Either accountId or churchId must be provided' },
        { status: 400 }
      );
    }

    let connectAccount: { id: string; stripeAccountId: string } | undefined;
    
    if (accountId) {
      const accounts = await prisma.$queryRaw<Array<{ id: string; stripeAccountId: string }>>`
        SELECT * FROM "StripeConnectAccount" 
        WHERE "stripeAccountId" = ${accountId}
        LIMIT 1
      `;
      connectAccount = accounts[0];
    } else if (churchId) {
      const accounts = await prisma.$queryRaw<Array<{ id: string; stripeAccountId: string }>>`
        SELECT * FROM "StripeConnectAccount" 
        WHERE "churchId" = ${churchId}::text
        LIMIT 1
      `;
      connectAccount = accounts[0];
    }

    if (!connectAccount) {
      return NextResponse.json(
        { error: 'Stripe account not found' },
        { status: 404 }
      );
    }

    const stripeAccount = await stripe.accounts.retrieve(
      connectAccount.stripeAccountId
    );

    const verificationStatus = getVerificationStatus(stripeAccount);
    const newRequirementsCurrentlyDueArray = stripeAccount.requirements?.currently_due || [];
    const newRequirementsEventuallyDueArray = stripeAccount.requirements?.eventually_due || [];
    const requirementsDisabledReason = stripeAccount.requirements?.disabled_reason || null;
    const tosAcceptanceDate = stripeAccount.tos_acceptance?.date 
      ? new Date(stripeAccount.tos_acceptance.date * 1000) 
      : null;

    await prisma.$executeRaw`
      UPDATE "StripeConnectAccount"
      SET 
        "chargesEnabled" = ${stripeAccount.charges_enabled || false},
        "detailsSubmitted" = ${stripeAccount.details_submitted || false},
        "payoutsEnabled" = ${stripeAccount.payouts_enabled || false},
        "verificationStatus" = ${verificationStatus},
        "requirementsCurrentlyDue" = ${newRequirementsCurrentlyDueArray},
        "requirementsEventuallyDue" = ${newRequirementsEventuallyDueArray},
        "requirementsDisabledReason" = ${requirementsDisabledReason},
        "tosAcceptanceDate" = ${tosAcceptanceDate},
        "updatedAt" = NOW()
      WHERE "id" = ${connectAccount.id}::uuid
    `;

    const updatedAccounts = await prisma.$queryRaw<Array<StripeConnectAccount>>`
      SELECT * FROM "StripeConnectAccount" 
      WHERE "id" = ${connectAccount.id}::uuid
      LIMIT 1
    `;
    const updatedAccount = updatedAccounts[0];

    // Construct the response object to match frontend's StripeAccount type
    const responseAccount = {
      id: updatedAccount.id, // Local DB UUID
      stripeAccountId: stripeAccount.id, // Actual Stripe ID (acct_...)
      churchId: updatedAccount.churchId, // From local DB
      details_submitted: stripeAccount.details_submitted || false,
      charges_enabled: stripeAccount.charges_enabled || false,
      payouts_enabled: stripeAccount.payouts_enabled || false,
      verificationStatus: getVerificationStatus(stripeAccount), // Already calculated
      requirementsCurrentlyDue: stripeAccount.requirements?.currently_due || [],
      requirementsEventuallyDue: stripeAccount.requirements?.eventually_due || [],
      requirementsDisabledReason: stripeAccount.requirements?.disabled_reason || null,
      tosAcceptanceDate: stripeAccount.tos_acceptance?.date 
        ? new Date(stripeAccount.tos_acceptance.date * 1000).toISOString() 
        : null,
      // Ensure all fields expected by the frontend's StripeAccount type are included here,
      // mapping from stripeAccount (live Stripe data) or updatedAccount (local DB record) as appropriate.
    };

    return NextResponse.json(responseAccount);
  } catch (error) {
    console.error('Error fetching Stripe account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe account' },
      { status: 500 }
    );
  }
}

// Helper function to determine verification status from Stripe account
function getVerificationStatus(account: any): string {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'verified';
  } else if (account.details_submitted) {
    if (account.requirements?.disabled_reason) {
      return account.requirements.disabled_reason === 'requirements.past_due' 
        ? 'action_required' 
        : 'restricted';
    } else {
      return 'pending';
    }
  }
  return 'unverified';
}

// Create an account link for onboarding
async function handleCreateAccountLink({
  accountId,
  refreshUrl = `${getBaseUrl()}/dashboard/banking/account`,
  returnUrl = `${getBaseUrl()}/dashboard/banking/account?success=true`,
}: {
  accountId: string;
  refreshUrl?: string;
  returnUrl?: string;
}): Promise<NextResponse> {
  try {
    try {
      await stripe.accounts.update(accountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      console.log(`Ensured capabilities (card_payments, transfers) are requested for account: ${accountId}`);
    } catch (capabilityError: any) {
      console.error(`Error requesting capabilities for account ${accountId} before creating account link:`, capabilityError.message);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    if (!accountLink.url) {
      throw new Error('Failed to create account link');
    }
    
    return NextResponse.json({
      url: accountLink.url,
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { error: 'Failed to create account link' },
      { status: 500 }
    );
  }
}

// Delete a Stripe Connect account
async function handleDeleteAccount(stripeAccountId: string): Promise<NextResponse> {
  console.log(`[INFO] Attempting to delete Stripe account: ${stripeAccountId}`);

  if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
    console.error('[ERROR] Invalid Stripe Account ID provided for deletion:', stripeAccountId);
    return NextResponse.json(
      { error: 'Invalid Stripe Account ID format.' },
      { status: 400 }
    );
  }

  try {
    // 1. Delete the account from Stripe
    const deletedStripeAccount = await stripe.accounts.del(stripeAccountId);
    console.log(`[DEBUG] Successfully deleted Stripe account ${stripeAccountId}. Deleted status: ${deletedStripeAccount.deleted}`);

    if (!deletedStripeAccount.deleted) {
      console.warn(`[WARN] Stripe API indicated account ${stripeAccountId} was not deleted, though no error was thrown.`);
    }

    // 2. Delete the account from local Prisma database
    try {
      // Ensure your StripeConnectAccount model has a unique constraint on stripeAccountId
      // or adjust the where clause if deletion needs to be based on another unique field found via stripeAccountId.
      const deletedDbRecord = await extendedPrisma.stripeConnectAccount.delete({
        where: { stripeAccountId: stripeAccountId }, 
      });
      console.log(`[DEBUG] Successfully deleted StripeConnectAccount record from DB for Stripe Account ID: ${stripeAccountId}. DB Record ID: ${deletedDbRecord.id}`);
    } catch (dbError: any) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        console.warn(`[WARN] StripeConnectAccount record for ${stripeAccountId} not found in DB for deletion, or already deleted. Stripe deletion was successful.`);
      } else {
        console.error(`[ERROR] Failed to delete StripeConnectAccount record from DB for ${stripeAccountId} after successful Stripe deletion:`, dbError);
        return NextResponse.json(
          { 
            message: `Stripe account ${stripeAccountId} deleted successfully, but failed to clean up local record. Please check server logs.`,
            stripeAccountId: stripeAccountId,
            deletedOnStripe: true
          },
          { status: 207 } 
        );
      }
    }

    return NextResponse.json({
      message: `Stripe account ${stripeAccountId} and associated local record deleted successfully.`,
      stripeAccountId: stripeAccountId,
      deleted: true, 
    });

  } catch (error: any) {
    console.error(`[ERROR] Failed to delete Stripe account ${stripeAccountId}:`, error);
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: `Stripe API error during deletion: ${error.message}`,
          type: error.type,
          code: error.code 
        },
        { status: error.statusCode || 500 }
      );
    } else {
      return NextResponse.json(
        { error: `An unexpected error occurred while deleting Stripe account ${stripeAccountId}.` },
        { status: 500 }
      );
    }
  }
}