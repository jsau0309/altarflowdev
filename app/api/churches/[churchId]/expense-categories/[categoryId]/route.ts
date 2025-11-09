import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

interface Params {
  churchId: string;
  categoryId: string;
}

// PUT - Update an expense category
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, categoryId } = await params;
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

    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found` }, { status: 404 });
    }

    // Check if category exists and belongs to this church
    const existingCategory = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Expense category not found' }, { status: 404 });
    }

    if (existingCategory.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Category does not belong to this church' }, { status: 403 });
    }

    // Update the category
    const updatedCategory = await prisma.expenseCategory.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        color: color.trim(),
      },
    });

    return NextResponse.json(updatedCategory, { status: 200 });

  } catch (error) {
    console.error(`Error updating expense category:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to update expense category', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete an expense category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, categoryId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found` }, { status: 404 });
    }

    // Check if category exists and belongs to this church
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { Expense: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Expense category not found' }, { status: 404 });
    }

    if (category.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Category does not belong to this church' }, { status: 403 });
    }

    // Check if category is deletable
    if (!category.isDeletable || category.isSystemCategory) {
      return NextResponse.json({ error: 'Cannot delete system category' }, { status: 400 });
    }

    // Check if category is in use
    if (category._count.Expense > 0) {
      return NextResponse.json({
        error: 'Cannot delete category that is in use by expenses',
        inUse: true,
        expenseCount: category._count.Expense
      }, { status: 400 });
    }

    // Delete the category
    await prisma.expenseCategory.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting expense category:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to delete expense category', details: errorMessage }, { status: 500 });
  }
}
