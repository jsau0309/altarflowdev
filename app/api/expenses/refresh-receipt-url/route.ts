import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// POST /api/expenses/refresh-receipt-url - Generate a fresh signed URL for a receipt
export async function POST(request: Request) {
  // Initialize Supabase Admin Client FIRST to check env vars early
  const supabaseAdmin = createAdminClient(); 
  console.log('Refresh Route: Supabase admin client initialized.');

  try {
    // Get cookies for Supabase auth (still needed for user check)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { expenseId } = await request.json();
    if (!expenseId) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Security check: only allow access to the user's own expenses
    if (expense.submitterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cast to the correct type with receiptPath
    const expenseWithPath = expense as unknown as {
      id: string;
      receiptPath?: string | null;
      receiptUrl?: string | null;
    };

    // Make sure the receipt path exists
    if (!expenseWithPath.receiptPath) {
      return NextResponse.json({ error: 'No receipt path associated with this expense' }, { status: 404 });
    }
    
    const filePath = expenseWithPath.receiptPath;

    // Add a small delay before trying to get the signed URL
    console.log("Waiting 0.5 second for Supabase to process access...");
    await delay(500);

    let receiptUrl = null; // Default to null
    try {
      console.log(`  >> Creating signed URL for path (admin): ${filePath}`);
      // Generate a fresh signed URL (15 minutes expiry for viewing) USING ADMIN CLIENT
      const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(filePath, 900); // 15 minutes

      if (signedUrlError) {
        console.error('Admin Failed to generate signed URL:', signedUrlError);
        return NextResponse.json({ error: 'Failed to generate signed URL for receipt', details: signedUrlError.message }, { status: 500 });
      } else if (urlData?.signedUrl) {
        receiptUrl = urlData.signedUrl;
        console.log('Admin successfully generated signed URL.');
      } else {
        console.error('Admin Signed URL generation returned no URL data.');
        return NextResponse.json({ error: 'No signed URL returned from Supabase (admin)' }, { status: 500 });
      }
    } catch (urlError) {
      console.error('Error generating signed URL (admin):', urlError);
      const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error during URL generation';
      return NextResponse.json({ error: 'Error generating signed URL', details: errorMessage }, { status: 500 });
    }

    // Update the expense with the new URL
    await prisma.expense.update({
      where: { id: expenseId },
      data: { receiptUrl }, // This will be the newly generated signed URL
    });

    return NextResponse.json({ 
      receiptUrl,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString() // 15 minutes from now
    });

  } catch (error) {
    console.error('Error refreshing receipt URL:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 