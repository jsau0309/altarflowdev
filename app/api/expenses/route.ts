import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Helper to create Supabase client for the API route
async function getUser(request: Request) {
  // Get the cookies from the request
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // We don't need to set cookies in an API route
        },
        remove(name: string, options: CookieOptions) {
          // We don't need to remove cookies in an API route
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error("Auth error:", error?.message || "No user found");
    return null;
  }

  return user;
}

// GET /api/expenses - Fetch expenses for the logged-in user's CHURCH
export async function GET(request: Request) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' }, 
        { status: 401 }
      );
    }

    // Fetch the user's profile to get their churchId
    let userChurchId: string;
    try {
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: user.id },
        select: { churchId: true },
      });
      if (!profile.churchId) {
        throw new Error('User profile is missing required churchId.');
      }
      userChurchId = profile.churchId;
    } catch (profileError) {
      console.error(`Error fetching profile churchId for user ${user.id}:`, profileError);
      // Return empty array if profile/church is missing, similar to members GET
      return NextResponse.json([], { status: 200 }); 
    }

    // Fetch expenses associated with the user's church
    const expenses = await prisma.expense.findMany({
      where: {
        // Filter by the churchId associated with the expense
        churchId: userChurchId,
      },
      // Optional: Include submitter details if needed on the frontend
      include: {
        submitter: {
          select: { firstName: true, lastName: true }, // Select only needed fields
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

// POST /api/expenses - Create a new expense for the logged-in user
export async function POST(request: Request) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' }, 
        { status: 401 }
      );
    }

    // Fetch user's profile to get their churchId
    let userChurchId: string;
    try {
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: user.id },
        select: { churchId: true },
      });
      // Ensure churchId exists (should be guaranteed by schema/previous steps)
      if (!profile.churchId) {
        throw new Error('User profile is missing required churchId.');
      }
      userChurchId = profile.churchId;
    } catch (profileError) {
      console.error(`Error fetching profile churchId for user ${user.id}:`, profileError);
      // Provide a more specific error message
      return NextResponse.json(
        { error: 'Failed to retrieve user church affiliation. Profile might be incomplete.' }, 
        { status: 400 } // Bad request as profile is needed
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { amount, expenseDate, category, vendor, description, receiptUrl, receiptPath } = body;
    if (!amount || !expenseDate || !category) {
      return NextResponse.json(
        { error: 'Missing required fields (amount, expenseDate, category)' }, 
        { status: 400 }
      );
    }

    // Create the expense
    const newExpense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        expenseDate: new Date(expenseDate),
        category,
        vendor: vendor || null,
        description: description || null,
        receiptUrl: receiptUrl || null,
        receiptPath: receiptPath || null,
        status: 'PENDING', // Explicit default
        currency: 'USD',   // Default currency
        // Connect the submitter relation using the user's ID
        submitter: {
          connect: { id: user.id },
        },
        // Connect the church relation using the fetched userChurchId
        church: {
          connect: { id: userChurchId },
        },
        // approverId is optional/nullable, so no need to connect here
      },
    });

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    console.error("Error creating expense:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if ('code' in error) {
        switch (error.code) {
          case 'P2002':
            return NextResponse.json(
              { error: 'Database constraint violation.' }, 
              { status: 409 }
            );
          case 'P2003':
            return NextResponse.json(
              { error: 'Associated user profile not found. Please complete your profile setup.' }, 
              { status: 400 }
            );
          default:
            break;
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create expense' }, 
      { status: 500 }
    );
  }
} 