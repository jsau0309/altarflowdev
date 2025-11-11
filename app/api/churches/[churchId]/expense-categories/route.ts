import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

interface Params {
  churchId: string; // This is the Clerk Organization ID from the path
}

// GET - Fetch all expense categories for a church
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId } = await params;
  const { searchParams } = new URL(request.url);
  const includeHidden = searchParams.get('includeHidden') === 'true';

  if (!churchId) {
    return NextResponse.json({ error: 'Church ID (Clerk Organization ID) from path is required' }, { status: 400 });
  }

  try {
    // Find the internal Church record using the clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    const internalChurchUUID = church.id;

    // Fetch ExpenseCategory records for that church (exclude hidden categories unless includeHidden is true)
    const expenseCategories = await prisma.expenseCategory.findMany({
      where: {
        churchId: internalChurchUUID,
        ...(includeHidden ? {} : { isHidden: false }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(expenseCategories, { status: 200 });

  } catch (error) {
    console.error(`Error fetching expense categories for church (Clerk Org ID: ${churchId}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to fetch expense categories', details: errorMessage }, { status: 500 });
  }
}

// POST - Create a new expense category
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    // Find the internal Church record
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    // Create the expense category
    const expenseCategory = await prisma.expenseCategory.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        churchId: church.id,
        isSystemCategory: false,
        isDeletable: true,
      },
    });

    return NextResponse.json(expenseCategory, { status: 201 });

  } catch (error) {
    console.error(`Error creating expense category for church (Clerk Org ID: ${churchId}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to create expense category', details: errorMessage }, { status: 500 });
  }
}
