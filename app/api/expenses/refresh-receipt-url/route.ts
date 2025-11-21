import { NextRequest, NextResponse } from 'next/server';
// import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- Remove Supabase
// import { cookies } from 'next/headers'; // <-- Remove if not used
import { prisma } from '@/lib/db';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuth } from '@clerk/nextjs/server'; // <-- Use getAuth for Route Handlers
import { logger } from '@/lib/logger';

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// POST /api/expenses/refresh-receipt-url - Generate a fresh signed URL for a receipt
export async function POST(request: NextRequest) {
  // Initialize Supabase Admin Client FIRST to check env vars early
  const supabaseAdmin = createAdminClient(); 
  logger.info('Refresh Route: Supabase admin client initialized.', { operation: 'api.info' });
  let orgId: string | null | undefined = null; // Declare outside try

  try {
    // Get cookies for Supabase auth - REMOVED
    // const cookieStore = cookies();
    // const supabase = createServerClient(...);

    // Verify authentication using Clerk
    const authResult = getAuth(request); // Use getAuth
    const userId = authResult.userId;
    orgId = authResult.orgId; // Assign orgId
    
    if (!userId) {
      logger.error('Refresh URL Auth Error: No Clerk userId found.', { operation: 'api.error' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error(`User ${userId} attempted refresh URL without active org.`, { operation: 'api.error' });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // Get request body
    const { expenseId } = await request.json();
    if (!expenseId) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    // Find the expense, ensuring it belongs to the active org
    const expense = await prisma.expense.findFirst({
      where: { 
        id: expenseId, 
        Church: { clerkOrgId: orgId } 
      },
      select: { id: true, submitterId: true, receiptPath: true } // Select only needed fields
    });

    if (!expense) {
      // Not found or doesn't belong to this org
      return NextResponse.json({ error: 'Expense not found or access denied' }, { status: 404 });
    }

    // Security check: Allow access to receipts for:
    // 1. The user who submitted the expense
    // 2. Any member or admin in the same organization
    // Since we already verified the expense belongs to the user's org, no additional check needed
    logger.info(`User ${userId} from org ${orgId} accessing receipt for expense ${expenseId}.`, { operation: 'api.info' });

    // Make sure the receipt path exists
    if (!expense.receiptPath) {
      return NextResponse.json({ error: 'No receipt path associated with this expense' }, { status: 404 });
    }
    
    const filePath = expense.receiptPath;

    // Add a small delay before trying to get the signed URL
    logger.info('Waiting 0.5 second for Supabase to process access...', { operation: 'api.info' });
    await delay(500);

    let receiptUrl: string | null = null; // Variable to hold the generated URL
    try {
      logger.info(`  >> Creating signed URL for path (admin): ${filePath}`, { operation: 'api.info' });
      // Generate a fresh signed URL (15 minutes expiry for viewing) USING ADMIN CLIENT
      const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(filePath, 900); // 15 minutes

      if (signedUrlError) {
        logger.error('Admin Failed to generate signed URL:', { operation: 'api.error' }, signedUrlError instanceof Error ? signedUrlError : new Error(String(signedUrlError)));
        return NextResponse.json({ error: 'Failed to generate signed URL for receipt', details: signedUrlError.message }, { status: 500 });
      } else if (urlData?.signedUrl) {
        receiptUrl = urlData.signedUrl;
        logger.info('Admin successfully generated signed URL.', { operation: 'api.info' });
      } else {
        logger.error('Admin Signed URL generation returned no URL data.', { operation: 'api.error' });
        return NextResponse.json({ error: 'No signed URL returned from Supabase (admin)' }, { status: 500 });
      }
    } catch (urlError) {
      logger.error('Error generating signed URL (admin):', { operation: 'api.error' }, urlError instanceof Error ? urlError : new Error(String(urlError)));
      const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error during URL generation';
      return NextResponse.json({ error: 'Error generating signed URL', details: errorMessage }, { status: 500 });
    }

    // Update the expense with the new URL, ensuring it still belongs to the org
    const updateResult = await prisma.expense.updateMany({
      where: { 
        id: expenseId,
        Church: { clerkOrgId: orgId } // Ensure org match during update
      },
      data: { receiptUrl }, // This will be the newly generated signed URL
    });

    if (updateResult.count === 0) {
       logger.warn(`Refresh URL: Update failed for expense ${expenseId}. Count: ${updateResult.count}`, { operation: 'api.warn' });
       // Expense might have been deleted between find and update
       return NextResponse.json({ error: 'Failed to update expense record after URL generation' }, { status: 404 }); // Or 500?
    }

    return NextResponse.json({ 
      receiptUrl,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString() // 15 minutes from now
    });

  } catch (error) {
    logger.error('Error refreshing receipt URL:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 