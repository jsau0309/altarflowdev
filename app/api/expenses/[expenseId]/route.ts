import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod'; // Using Zod for validation
import { createClient } from '@supabase/supabase-js'; // Import standard Supabase client

// Define schema for PATCH validation (optional but recommended)
const expenseUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  expenseDate: z.string().datetime().optional(),
  category: z.string().min(1).optional(),
  vendor: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  receiptUrl: z.string().url().nullable().optional(),
  receiptPath: z.string().nullable().optional(), // Allow receipt storage path for regenerating signed URLs
  // Status might be updated by a different mechanism/role
  // status: z.nativeEnum(ExpenseStatus).optional(), 
});

// GET /api/expenses/[expenseId] - Fetch a single expense
export async function GET(
  request: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseId = params.expenseId;
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Authorization check: Ensure the user is the submitter (basic check)
    // We might need more complex logic later for admins/approvers
    if (expense.submitterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(expense);

  } catch (error) {
    console.error(`Error fetching expense ${params.expenseId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

// PATCH /api/expenses/[expenseId] - Update an existing expense
export async function PATCH(
  request: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseId = params.expenseId;
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Authorization: Only allow submitter to update PENDING expenses (initial logic)
    if (existingExpense.submitterId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Not submitter' }, { status: 403 });
    }
    if (existingExpense.status !== 'PENDING') {
        return NextResponse.json({ error: 'Forbidden: Expense not pending' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = expenseUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const dataToUpdate = validation.data;

    // Ensure date is handled correctly
    if(dataToUpdate.expenseDate) {
        dataToUpdate.expenseDate = new Date(dataToUpdate.expenseDate) as any;
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedExpense);

  } catch (error) {
    console.error(`Error updating expense ${params.expenseId}:`, error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE /api/expenses/[expenseId] - Delete an expense
export async function DELETE(
  request: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    // Check user authentication first
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseId = params.expenseId;

    // 1. Fetch the expense to get details BEFORE deleting
    const expenseRecord = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expenseRecord) {
      // Already deleted or never existed, idempotency suggests returning success
      return new NextResponse(null, { status: 204 }); // No Content
    }

    // Explicitly cast to include receiptPath
    const existingExpense = expenseRecord as typeof expenseRecord & { receiptPath?: string | null };

    // Authorization: Only allow submitter to delete (adjust as needed for roles)
    if (existingExpense.submitterId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Not submitter' }, { status: 403 });
    }
    // Add any other conditions (e.g., status check) if necessary
    // if (existingExpense.status !== 'PENDING') {
    //     return NextResponse.json({ error: 'Forbidden: Can only delete pending expenses' }, { status: 403 });
    // }

    // 2. Attempt to delete file from Supabase Storage if path exists
    if (existingExpense.receiptPath) {
        console.log(`Attempting to delete storage file: ${existingExpense.receiptPath}`);
        try {
            // Create a Supabase client with SERVICE_ROLE_KEY for admin privileges
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
              throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
            }
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY,
              { auth: { persistSession: false } } // Important: prevent server-side session persistence
            );

            // Capture the full response
            const { data: storageData, error: storageError } = await supabaseAdmin.storage
                .from('receipts')
                .remove([existingExpense.receiptPath]);

            // Log both data and error regardless
            console.log(`Storage deletion response - Data:`, storageData);
            console.log(`Storage deletion response - Error:`, storageError);

            if (storageError) {
                // Log the error but don't stop the DB deletion
                console.warn(`Failed to delete storage file ${existingExpense.receiptPath}:`, storageError);
            } else if (storageData) { // Check if data exists
                console.log(`Successfully deleted storage file: ${existingExpense.receiptPath}`);
                // Optionally log more details from storageData if available, e.g., number of files deleted
                console.log(`  Deletion details:`, storageData);
            } else {
                // This case might indicate success but no specific data returned, which is possible
                console.log(`Storage deletion call completed for ${existingExpense.receiptPath}, but no specific data returned in response.`);
            }

        } catch (storageCatchError) {
            // Catch any unexpected errors during storage interaction
            console.error(`Unexpected error deleting storage file ${existingExpense.receiptPath}:`, storageCatchError);
        }
    }

    // 3. Delete the expense record from the database
    await prisma.expense.delete({
      where: { id: expenseId },
    });
    console.log(`Successfully deleted expense record: ${expenseId}`);

    // 4. Return success response
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    // Catch errors from Prisma client or other parts of the process
    console.error(`Error deleting expense ${params.expenseId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete expense';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 