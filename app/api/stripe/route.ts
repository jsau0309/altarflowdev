import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeInstance } from '@/lib/stripe-server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db'; // Use centralized Prisma instance
import { clerkClient } from '@clerk/nextjs/server';
import type { OrganizationMembership } from '@clerk/backend';
import { logger } from '@/lib/logger';
import { hashChurchId } from '@/lib/logger/middleware';

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
  const idempotencyKey = req.headers.get('Idempotency-Key');
  
  if (!idempotencyKey) {
    // SECURITY: Use Map to prevent prototype pollution via malicious header names
    // Attackers could send headers like __proto__, constructor, etc.
    const headersMap = new Map<string, string>();
    req.headers.forEach((value, key) => {
      headersMap.set(key, value);
    });

    // Convert Map to plain object safely using Object.fromEntries
    const headersObject = Object.fromEntries(headersMap);
    logger.error('Idempotency-Key header is MISSING from the request', {
      operation: 'stripe.api.idempotency.missing_key',
      headers: headersObject
    });
    throw new Error('Idempotency-Key header is required');
  }
  
  const cacheKey = `${keyPrefix}${idempotencyKey}`;
  
  // Check if we've seen this request before
  const cachedResponse = await prisma.idempotency_cache.findUnique({
    where: { key: cacheKey },
  });
  
  if (cachedResponse) {
    logger.debug('[DEBUG] Idempotency: Returning cached response', { operation: 'stripe.api.debug', context: { cacheKey } });
    const parsedData = JSON.parse(cachedResponse.responseData);

    // If body is empty or undefined, ensure we return an empty string not null/undefined
    const bodyContent = parsedData.body || '';

    // Reconstruct the NextResponse from cached parts
    const reconstructedResponse = new NextResponse(bodyContent, {
      status: parsedData.status,
      headers: parsedData.headers,
    });

    logger.debug('[DEBUG] Idempotency: Reconstructed response', { operation: 'stripe.api.debug', context: { bodyLength: bodyContent.length } });
    return reconstructedResponse;
  }

  // Execute the operation, which returns a NextResponse
  let response: NextResponse;
  try {
    response = await operation();
  } catch (operationError) {
    logger.error('Idempotency operation failed', {
      operation: 'stripe.api.idempotency.operation_failed',
      cacheKey
    }, operationError instanceof Error ? operationError : new Error(String(operationError)));
    throw operationError;
  }

  // If operation was successful, prepare response for caching
  const bodyText = await response.clone().text(); // Clone because body can be read once

  // Don't cache error responses (4xx, 5xx) - only cache successful operations
  if (response.status >= 400) {
    logger.debug('Idempotency: Skipping cache for error response', {
      operation: 'stripe.api.idempotency.skip_error',
      status: response.status,
      cacheKey
    });
    return response;
  }

  // Don't cache empty responses for successful operations
  if (response.status === 200 && (!bodyText || bodyText.trim() === '')) {
    logger.debug('Idempotency: Skipping cache for empty 200 response', {
      operation: 'stripe.api.idempotency.skip_empty',
      cacheKey
    });
    return response;
  }

  const responseToCache = {
    body: bodyText,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  logger.debug('[DEBUG] Idempotency: Caching response', { operation: 'stripe.api.debug', context: {
    bodyLength: bodyText.length,
    status: response.status
  } });

  try {
    await prisma.idempotency_cache.create({
      data: {
        key: cacheKey,
        responseData: JSON.stringify(responseToCache),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Cache for 24 hours
      },
    });
    logger.debug('[DEBUG] Idempotency: Cached response', { operation: 'stripe.api.debug', context: { cacheKey } });
  } catch (cacheError) {
    if (
      cacheError instanceof Prisma.PrismaClientKnownRequestError &&
      cacheError.code === 'P2002'
    ) {
      const target = cacheError.meta?.target as string[] | undefined;
      if (target && target.includes('key')) {
        logger.warn('Idempotency cache write failed due to race condition', {
          operation: 'stripe.api.idempotency.race_condition',
          cacheKey,
          message: 'The result was likely cached by a concurrent request. Returning current operation\'s result.'
        });
      } else {
        logger.error('Idempotency cache write failed with P2002 on unexpected fields', {
          operation: 'stripe.api.idempotency.p2002_unexpected',
          cacheKey
        }, cacheError instanceof Error ? cacheError : new Error(String(cacheError)));
        throw cacheError;
      }
    } else {
      logger.error('Idempotency cache write failed', {
        operation: 'stripe.api.idempotency.cache_write_failed',
        cacheKey
      }, cacheError instanceof Error ? cacheError : new Error(String(cacheError)));
      throw cacheError;
    }
  }
  
  return response; 
}

// Helper function to get admin email for an organization
async function getAdminEmailForOrganization(clerkOrgId: string): Promise<string | null> {
  try {
    const client = await clerkClient(); 
    // Debug logging removed: fetching memberships for organization
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
    });

    const memberships = membershipsResponse.data; 

    if (!memberships || memberships.length === 0) {
      logger.warn(`No memberships found for organization: ${clerkOrgId}`, { operation: 'stripe.api.warn' });
      return null;
    }

    const adminRole = "org:admin"; 

    const adminMembership = memberships.find((mem: OrganizationMembership) => mem.role === adminRole);

    if (!adminMembership || !adminMembership.publicUserData?.userId) {
      logger.warn(`No admin member found with role '${adminRole}' for organization: ${clerkOrgId}`, { operation: 'stripe.api.warn' });
      return null;
    }

    const adminUserId = adminMembership.publicUserData.userId;
    // Debug logging removed: admin member userId

    const adminUser = await client.users.getUser(adminUserId);

    if (!adminUser || !adminUser.primaryEmailAddress?.emailAddress) {
      logger.warn(`Admin user ${adminUserId} found, but no primary email address.`, { operation: 'stripe.api.warn' });
      return null;
    }

    const adminEmail = adminUser.primaryEmailAddress.emailAddress;
    // Debug logging removed: admin email fetched for organization
    return adminEmail;

  } catch (error) {
    logger.error(`Failed to get admin email for organization ${clerkOrgId}:`, { operation: 'stripe.api.ERROR' }, error instanceof Error ? error : new Error(String(error)));
    throw new Error(`Failed to retrieve admin email for organization ${clerkOrgId}.`);
  }
}

// Initialize Stripe client with proper error handling
const stripe = getStripeInstance();

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
    // Debug logging removed: POST handler action and body details

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
        return await withIdempotency(req, () => handleGetAccount(body), { 
          keyPrefix: `getAccount_${body.churchId || body.accountId || 'unknown'}` 
        });
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
            logger.error('Error creating login link', { operation: 'stripe.api.error' }, error instanceof Error ? error : new Error(String(error)));
            return NextResponse.json(
              { error: 'Failed to create login link' },
              { status: 500 }
            );
          }
        });
      }
      else {
        logger.warn(`Unknown action received: ${(body as StripeApiRequest & { action: string }).action}`, { operation: 'stripe.api.warn' });
        return NextResponse.json(
            { error: `Unknown action: ${(body as StripeApiRequest & { action: string }).action}` },
            { status: 400 }
        );
      }
    } catch (error) {
      logger.error('CRITICAL: Error caught in POST handler main try...catch', {
        operation: 'stripe.api.post.critical_error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        isStripeError: error instanceof Stripe.errors.StripeError
      }, error instanceof Error ? error : new Error(String(error)));

      if (error instanceof Stripe.errors.StripeError) {
        logger.error('CRITICAL: Stripe-specific error details', {
          operation: 'stripe.api.post.stripe_error',
          errorType: error.type,
          errorCode: error.code
        });
      }

      try {
        if (error instanceof Stripe.errors.StripeError) {
          logger.debug('[CRITICAL] Detected StripeError, returning specific response.', { operation: 'stripe.api.debug' });
          return NextResponse.json(
            {
              error: 'Stripe API Error: ' + error.message,
              type: error.type,
              code: error.code,
            },
            { status: error.statusCode || 400 }
          );
        } else {
          logger.debug('[CRITICAL] Non-Stripe error, returning generic 500 response.', { operation: 'stripe.api.debug' });
          return NextResponse.json(
            { error: 'Internal Server Error - See server logs for details.' },
            { status: 500 }
          );
        }
      } catch (responseError) {
        logger.error('[ULTRA_CRITICAL] Failed to create NextResponse in error handler', { operation: 'stripe.api.error' }, responseError instanceof Error ? responseError : new Error(String(responseError)));
        throw new Error('PANIC: Failed to construct error response in POST handler.');
      }
    }
  } catch {
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
  // Debug logging removed: handleCreateAccount input

  try {
    // Debug logging removed: fetching church details
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: clerkOrgId },
      select: { id: true, name: true }, 
    });

    if (!church) {
      logger.error(`Church not found in database for clerkOrgId: ${clerkOrgId}`, { operation: 'stripe.api.ERROR' });
      return NextResponse.json(
        { error: 'Church organization not found in our records. Cannot create Stripe account.' },
        { status: 404 }
      );
    }
    const churchDatabaseId = church.id;
    const churchName = church.name;
    // Debug logging removed: church details found in DB

    const existingStripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: clerkOrgId }, 
    });

    if (existingStripeConnectAccount) {
      // Debug logging removed: existing Stripe account found
      const finalRefreshUrlExisting = customRefreshUrl || passedDefaultRefreshUrl;
      const finalReturnUrlExisting = customReturnUrl || passedDefaultReturnUrl;
      logger.debug('[handleCreateAccount - Existing Account] Values for account link creation:', { operation: 'stripe.api.debug' });
      logger.debug('[handleCreateAccount - Existing Account] customRefreshUrl:', { operation: 'stripe.api.debug', context: customRefreshUrl });
      logger.debug('[handleCreateAccount - Existing Account] defaultRefreshUrl:', { operation: 'stripe.api.debug', context: passedDefaultRefreshUrl });
      logger.debug('[handleCreateAccount - Existing Account] FINAL refresh_url for Stripe:', { operation: 'stripe.api.debug', context: finalRefreshUrlExisting });
      logger.debug('[handleCreateAccount - Existing Account] customReturnUrl:', { operation: 'stripe.api.debug', context: customReturnUrl });
      logger.debug('[handleCreateAccount - Existing Account] defaultReturnUrl:', { operation: 'stripe.api.debug', context: passedDefaultReturnUrl });
      logger.debug('[handleCreateAccount - Existing Account] FINAL return_url for Stripe:', { operation: 'stripe.api.debug', context: finalReturnUrlExisting });
      // Debug logging removed: Stripe Account ID for link

      const accountLink = await stripe.accountLinks.create({
        account: existingStripeConnectAccount.stripeAccountId,
        refresh_url: finalRefreshUrlExisting,
        return_url: finalReturnUrlExisting,
        type: 'account_onboarding',
      });
      logger.debug(`Created new account link for existing Stripe account: ${existingStripeConnectAccount.stripeAccountId}`, { operation: 'stripe.api.debug' });
      return NextResponse.json({
        accountId: existingStripeConnectAccount.stripeAccountId,
        url: accountLink.url, // Changed key from onboardingUrl to url
        message: 'Stripe account already exists. New onboarding link generated.',
      });
    }

    logger.info(`No existing StripeConnectAccount found for clerkOrgId ${clerkOrgId}. Proceeding with new account creation.`, { operation: 'stripe.api.info' });
    let adminEmail: string | null = null;
    try {
      adminEmail = await getAdminEmailForOrganization(clerkOrgId);
    } catch (error) {
      logger.error(`Stripe account creation failed due to error fetching admin email for org ${clerkOrgId}:`, { operation: 'stripe.api.ERROR' }, error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: "Stripe account creation failed: Could not retrieve organization admin details." },
        { status: 500 }
      );
    }

    if (!adminEmail) {
      logger.error(`No admin email found for Stripe account creation (org: ${clerkOrgId}).`, { operation: 'stripe.api.ERROR' });
      return NextResponse.json(
        { error: "Stripe account creation failed: Administrator email not found for the organization." },
        { status: 404 } 
      );
    }

    // Debug logging removed: admin email for Stripe

    const newStripeAccount = await stripe.accounts.create({
      type: 'express',
      email: adminEmail, 
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        link_payments: { requested: true }, // Enable Link
        us_bank_account_ach_payments: { requested: true }, // Enable ACH bank payments
        // Apple Pay and Google Pay are automatically enabled with card_payments
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
    // Debug logging removed: new Stripe account created

    await prisma.stripeConnectAccount.create({
      data: {
        stripeAccountId: newStripeAccount.id,
        churchId: clerkOrgId,
        updatedAt: new Date(),
      }
    });
    logger.debug(`StripeConnectAccount record inserted into DB for new Stripe Account ID: ${newStripeAccount.id} and Church (clerkOrgId): ${clerkOrgId}`, { operation: 'stripe.api.debug' });

    // Generate account link for the newly created account
    const finalRefreshUrlNew = customRefreshUrl || passedDefaultRefreshUrl;
    const finalReturnUrlNew = customReturnUrl || passedDefaultReturnUrl;

    logger.debug('[handleCreateAccount - New Account] Values for account link creation:', { operation: 'stripe.api.debug' });
    logger.debug('[handleCreateAccount - New Account] customRefreshUrl:', { operation: 'stripe.api.debug', context: customRefreshUrl });
    logger.debug('[handleCreateAccount - New Account] defaultRefreshUrl:', { operation: 'stripe.api.debug', context: passedDefaultRefreshUrl });
    logger.debug('[handleCreateAccount - New Account] FINAL refresh_url for Stripe:', { operation: 'stripe.api.debug', context: finalRefreshUrlNew });
    logger.debug('[handleCreateAccount - New Account] customReturnUrl:', { operation: 'stripe.api.debug', context: customReturnUrl });
    logger.debug('[handleCreateAccount - New Account] defaultReturnUrl:', { operation: 'stripe.api.debug', context: passedDefaultReturnUrl });
    logger.debug('[handleCreateAccount - New Account] FINAL return_url for Stripe:', { operation: 'stripe.api.debug', context: finalReturnUrlNew });
    // Debug logging removed: Stripe Account ID for link

    const newAccountLink = await stripe.accountLinks.create({
      account: newStripeAccount.id,
      refresh_url: finalRefreshUrlNew,
      return_url: finalReturnUrlNew,
      type: 'account_onboarding',
    });
    logger.debug(`Created account link for new Stripe account: ${newStripeAccount.id}`, { operation: 'stripe.api.debug' });

    return NextResponse.json({
      accountId: newStripeAccount.id,
      url: newAccountLink.url, // Use 'url' key
      message: 'New Stripe account created and onboarding link generated.',
    });

  } catch (error) {
    logger.error('Error in handleCreateAccount', {
      operation: 'stripe.api.create_account.error',
      churchId: hashChurchId(clerkOrgId)
    }, error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        logger.error('Prisma Foreign Key Constraint Violation (P2003)', {
          operation: 'stripe.api.create_account.p2003',
          code: error.code
        });
        return NextResponse.json(
          { error: 'Database error: Could not link Stripe account to church due to a reference issue.' },
          { status: 500 }
        );
      }
      logger.error('Prisma Database Error', {
        operation: 'stripe.api.create_account.prisma_error',
        code: error.code
      });
      return NextResponse.json(
        { error: 'A database error occurred while creating the Stripe account.' },
        { status: 500 }
      );
    } else if (error instanceof Stripe.errors.StripeError) {
      logger.error('Stripe API Error', {
        operation: 'stripe.api.create_account.stripe_error',
        errorType: error.type,
        errorCode: error.code
      });
      return NextResponse.json(
        { error: `Stripe API error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    } else {
      logger.error('Unknown error in handleCreateAccount', {
        operation: 'stripe.api.create_account.unknown_error'
      }, error instanceof Error ? error : new Error(String(error)));
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
    if (!accountId && !churchId) {
      return NextResponse.json(
        { error: 'Either accountId or churchId must be provided' },
        { status: 400 }
      );
    }

    let connectAccount: { id: string; stripeAccountId: string } | undefined;
    
    if (accountId) {
      // Use Prisma's safe query builder instead of raw SQL
      const account = await prisma.stripeConnectAccount.findFirst({
        where: { stripeAccountId: accountId },
        select: { id: true, stripeAccountId: true }
      });
      connectAccount = account || undefined;
    } else if (churchId) {
      // Use Prisma's safe query builder instead of raw SQL
      const account = await prisma.stripeConnectAccount.findFirst({
        where: { churchId: churchId },
        select: { id: true, stripeAccountId: true }
      });
      connectAccount = account || undefined;
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

    // Use Prisma's safe update method instead of raw SQL
    const updatedAccount = await prisma.stripeConnectAccount.update({
      where: { id: connectAccount.id },
      data: {
        chargesEnabled: stripeAccount.charges_enabled || false,
        detailsSubmitted: stripeAccount.details_submitted || false,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        verificationStatus: verificationStatus,
        requirementsCurrentlyDue: newRequirementsCurrentlyDueArray,
        requirementsEventuallyDue: newRequirementsEventuallyDueArray,
        requirementsDisabledReason: requirementsDisabledReason,
        tosAcceptanceDate: tosAcceptanceDate,
        updatedAt: new Date()
      }
    });

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

    // Debug logging removed: full account response details
    
    // Ensure we're returning a proper NextResponse with content
    const jsonResponse = JSON.stringify(responseAccount);
    return new NextResponse(jsonResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Error fetching Stripe account', { operation: 'stripe.api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch Stripe account' },
      { status: 500 }
    );
  }
}

// Helper function to determine verification status from Stripe account
function getVerificationStatus(account: Stripe.Account): string {
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

// Delete a Stripe Connect account
async function handleDeleteAccount(stripeAccountId: string): Promise<NextResponse> {
  logger.info(`Attempting to delete Stripe account: ${stripeAccountId}`, { operation: 'stripe.api.info' });

  if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
    logger.error('Invalid Stripe Account ID provided for deletion', {
      operation: 'stripe.api.delete_account.invalid_id',
      providedId: stripeAccountId || 'undefined'
    });
    return NextResponse.json(
      { error: 'Invalid Stripe Account ID format.' },
      { status: 400 }
    );
  }

  try {
    // 1. Delete the account from Stripe
    const deletedStripeAccount = await stripe.accounts.del(stripeAccountId);
    logger.debug(`Successfully deleted Stripe account ${stripeAccountId}. Deleted status: ${deletedStripeAccount.deleted}`, { operation: 'stripe.api.debug' });

    if (!deletedStripeAccount.deleted) {
      logger.warn(`Stripe API indicated account ${stripeAccountId} was not deleted, though no error was thrown.`, { operation: 'stripe.api.warn' });
    }

    // 2. Delete the account from local Prisma database
    try {
      // Ensure your StripeConnectAccount model has a unique constraint on stripeAccountId
      // or adjust the where clause if deletion needs to be based on another unique field found via stripeAccountId.
      const deletedDbRecord = await prisma.stripeConnectAccount.delete({
        where: { stripeAccountId: stripeAccountId },
      });
      logger.debug(`Successfully deleted StripeConnectAccount record from DB for Stripe Account ID: ${stripeAccountId}. DB Record ID: ${deletedDbRecord.id}`, { operation: 'stripe.api.debug' });
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        logger.warn(`StripeConnectAccount record for ${stripeAccountId} not found in DB for deletion, or already deleted. Stripe deletion was successful.`, { operation: 'stripe.api.warn' });
      } else {
        logger.error(`Failed to delete StripeConnectAccount record from DB for ${stripeAccountId} after successful Stripe deletion:`, { operation: 'stripe.api.ERROR' }, dbError instanceof Error ? dbError : new Error(String(dbError)));
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

  } catch (error) {
    logger.error(`Failed to delete Stripe account ${stripeAccountId}:`, { operation: 'stripe.api.ERROR' }, error instanceof Error ? error : new Error(String(error)));
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