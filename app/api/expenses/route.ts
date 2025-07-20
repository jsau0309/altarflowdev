import { NextRequest, NextResponse } from 'next/server';
// import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- Remove Supabase
// import { cookies } from 'next/headers'; // <-- Remove if not used
import { prisma } from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server'; // <-- Use getAuth
import { revalidateTag } from 'next/cache';

// Removed Supabase getUser helper function

// GET /api/expenses - Fetch expenses for the user's active organization
export async function GET(request: NextRequest) {
  try {
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request); 

    if (!userId) { 
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' }, 
        { status: 401 }
      );
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET expenses without active org.`);
      // Return empty array if no org selected, prevents errors downstream
      return NextResponse.json([], { status: 200 }); 
    }

    // 2. Fetch expenses associated with the active organization
    const expenses = await prisma.expense.findMany({
      where: {
        church: { // Filter by the related church using clerkOrgId
          clerkOrgId: orgId
        }
      },
      include: {
        submitter: {
          select: { firstName: true, lastName: true }, 
        },
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });

    return NextResponse.json(expenses);

  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' }, 
      { status: 500 }
    );
  }
}

// POST /api/expenses - Create a new expense for the active organization
export async function POST(request: NextRequest) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) { 
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' }, 
        { status: 401 }
      );
    }
    if (!orgId) {
      console.error(`User ${userId} attempted POST expense without active org.`);
      return NextResponse.json(
        { error: 'No active organization selected.' }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // 2. Validate required fields
    const { amount, expenseDate, category, vendor, description, receiptUrl, receiptPath } = body;
    if (!amount || !expenseDate || !category) {
      return NextResponse.json(
        { error: 'Missing required fields (amount, expenseDate, category)' }, 
        { status: 400 }
      );
    }

    // 3. Create the expense, connecting church via clerkOrgId
    const newExpense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        expenseDate: new Date(expenseDate),
        category,
        vendor: vendor || null,
        description: description || null,
        receiptUrl: receiptUrl || null,
        receiptPath: receiptPath || null,
        status: 'PENDING', 
        currency: 'USD',   
        submitter: {
          connect: { id: userId }, // Connect submitter using Clerk userId
        },
        church: {
          connect: { clerkOrgId: orgId }, // Connect church using Clerk orgId
        },
      },
    });

    // Invalidate dashboard cache after creating expense
    // Debug logging removed: expense created, invalidating cache
    revalidateTag(`dashboard-${orgId}`);

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    console.error("Error creating expense:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && 'code' in error) {
        switch (error.code) {
        case 'P2002': // Unique constraint violation
            return NextResponse.json(
              { error: 'Database constraint violation.' }, 
              { status: 409 }
            );
        case 'P2003': // Foreign key constraint failed (e.g., submitterId not in Profile)
          // This should be less likely now if user.created webhook works
            return NextResponse.json(
            { error: 'Associated user profile not found.' }, 
              { status: 400 }
            );
        case 'P2025': // Referenced record not found (e.g., Church with clerkOrgId)
           console.error(`Attempted to connect expense to non-existent church with clerkOrgId: ${orgId}`);
           return NextResponse.json({ error: 'Organization not found for creating expense.' }, { status: 404 });
          default:
            break;
      }
    }

    return NextResponse.json(
      { error: 'Failed to create expense' }, 
      { status: 500 }
    );
  }
} 