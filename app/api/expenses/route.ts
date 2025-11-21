import { NextRequest, NextResponse } from 'next/server';
// import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- Remove Supabase
// import { cookies } from 'next/headers'; // <-- Remove if not used
import { prisma } from '@/lib/db';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuth } from '@clerk/nextjs/server'; // <-- Use getAuth
import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logger';

// Removed Supabase getUser helper function

const RECEIPTS_BUCKET = 'receipts';
const SIGNED_URL_TTL_SECONDS = 86_400; // 24 hours

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9_.-]/g, '_');

const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

type ReceiptValidationResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function validateReceiptFileForUpload(file: File): ReceiptValidationResult {
  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    return {
      ok: false,
      status: 413,
      error: 'File too large. Maximum size is 10MB.',
    };
  }

  const contentType = file.type || 'application/octet-stream';

  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(contentType)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.',
    };
  }

  return { ok: true };
}

async function uploadReceipt({
  file,
  orgId,
  userId,
  preferredName,
}: {
  file: File;
  orgId: string;
  userId: string;
  preferredName?: string | null;
}) {
  const supabaseAdmin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const baseName = preferredName && preferredName.length > 0 ? preferredName : (file.name || 'receipt');
  const sanitizedFilename = sanitizeFilename(baseName);
  const filePath = `${orgId}/receipts/${userId}/${Date.now()}_${sanitizedFilename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload receipt to storage.');
  }

  const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) {
    logger.error('Error generating signed URL after upload:', { operation: 'api.error' }, signedUrlError instanceof Error ? signedUrlError : new Error(String(signedUrlError)));
  }

  return {
    receiptPath: filePath,
    receiptUrl: urlData?.signedUrl ?? null,
  };
}

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
      logger.error(`User ${userId} attempted GET expenses without active org.`, { operation: 'api.error' });
      // Return empty array if no org selected, prevents errors downstream
      return NextResponse.json([], { status: 200 }); 
    }

    // 2. Fetch expenses associated with the active organization
    const expenses = await prisma.expense.findMany({
      where: {
        Church: { // Filter by the related church using clerkOrgId
          clerkOrgId: orgId
        }
      },
      include: {
        Profile_Expense_submitterIdToProfile: {
          select: { firstName: true, lastName: true },
        },
        ExpenseCategory: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });

    return NextResponse.json(expenses);

  } catch (error) {
    logger.error('Error fetching expenses:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error(`User ${userId} attempted POST expense without active org.`, { operation: 'api.error' });
      return NextResponse.json(
        { error: 'No active organization selected.' }, 
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    let amountValue: number | null = null;
    let expenseDateValue: string | null = null;
    let categoryValue: string | null = null;
    let expenseCategoryId: string | null = null;
    let vendorValue: string | null = null;
    let descriptionValue: string | null = null;
    let receiptFile: File | null = null;
    let preferredFilename: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const amountRaw = formData.get('amount');
      if (typeof amountRaw === 'string' && amountRaw.trim().length > 0) {
        amountValue = Number.parseFloat(amountRaw);
      }

      const expenseDateRaw = formData.get('expenseDate');
      if (typeof expenseDateRaw === 'string' && expenseDateRaw.trim().length > 0) {
        expenseDateValue = expenseDateRaw;
      }

      // Support both new expenseCategoryId and legacy category field
      const expenseCategoryIdRaw = formData.get('expenseCategoryId');
      if (typeof expenseCategoryIdRaw === 'string' && expenseCategoryIdRaw.trim().length > 0) {
        expenseCategoryId = expenseCategoryIdRaw;
      } else {
        // Fallback to legacy category field
        const categoryRaw = formData.get('category');
        if (typeof categoryRaw === 'string' && categoryRaw.trim().length > 0) {
          categoryValue = categoryRaw;
        }
      }

      const vendorRaw = formData.get('vendor');
      if (typeof vendorRaw === 'string') {
        vendorValue = vendorRaw.trim().length > 0 ? vendorRaw : null;
      }

      const descriptionRaw = formData.get('description');
      if (typeof descriptionRaw === 'string') {
        descriptionValue = descriptionRaw.trim().length > 0 ? descriptionRaw : null;
      }

      const receiptEntry = formData.get('receipt');
      if (receiptEntry instanceof File && receiptEntry.size > 0) {
        receiptFile = receiptEntry;
      }

      const metadataEntry = formData.get('receiptMetadata');
      if (typeof metadataEntry === 'string') {
        try {
          const parsed = JSON.parse(metadataEntry);
          if (parsed && typeof parsed === 'object' && typeof parsed.originalFilename === 'string') {
            preferredFilename = parsed.originalFilename;
          }
        } catch (parseError) {
          logger.warn('Failed to parse receipt metadata JSON', {
            operation: 'api.expense.metadata_parse_error',
            metadataEntry
          });
        }
      }
    } else {
      const body = await request.json();
      if (body?.amount !== undefined && body.amount !== null && body.amount !== '') {
        amountValue = Number.parseFloat(body.amount);
      }
      expenseDateValue = typeof body?.expenseDate === 'string' ? body.expenseDate : null;

      // Support both new expenseCategoryId and legacy category field
      if (typeof body?.expenseCategoryId === 'string' && body.expenseCategoryId.trim().length > 0) {
        expenseCategoryId = body.expenseCategoryId;
      } else {
        categoryValue = typeof body?.category === 'string' ? body.category : null;
      }

      vendorValue = typeof body?.vendor === 'string' ? (body.vendor.trim() ? body.vendor : null) : null;
      descriptionValue = typeof body?.description === 'string' ? (body.description.trim() ? body.description : null) : null;
    }

    // 2. Validate required fields
    if (
      amountValue === null ||
      Number.isNaN(amountValue) ||
      amountValue <= 0 ||
      !expenseDateValue ||
      (!expenseCategoryId && !categoryValue)
    ) {
      return NextResponse.json(
        { error: 'Missing required fields (amount, expenseDate, category or expenseCategoryId)' },
        { status: 400 }
      );
    }

    const expenseDate = new Date(expenseDateValue);
    if (Number.isNaN(expenseDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expense date provided.' },
        { status: 400 }
      );
    }

    let receiptPath: string | null = null;
    let receiptUrl: string | null = null;

    if (receiptFile) {
      const validationResult = validateReceiptFileForUpload(receiptFile);
      if (!validationResult.ok) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: validationResult.status }
        );
      }

      try {
        const uploadResult = await uploadReceipt({
          file: receiptFile,
          orgId,
          userId,
          preferredName: preferredFilename,
        });
        receiptPath = uploadResult.receiptPath;
        receiptUrl = uploadResult.receiptUrl;
      } catch (uploadError) {
        logger.error('Receipt upload failed:', { operation: 'api.error' }, uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
        return NextResponse.json(
          { error: uploadError instanceof Error ? uploadError.message : 'Failed to upload receipt.' },
          { status: 500 }
        );
      }
    }

    // 3. Get the church UUID from clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church configuration not found.' },
        { status: 404 }
      );
    }

    // SECURITY: Validate expenseCategoryId belongs to this church (prevent cross-tenant reference)
    if (expenseCategoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: expenseCategoryId },
        select: { churchId: true, name: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Expense category not found.' },
          { status: 404 }
        );
      }

      if (category.churchId !== church.id) {
        return NextResponse.json(
          { error: 'Forbidden: Expense category does not belong to your organization.' },
          { status: 403 }
        );
      }
    }

    // 4. Create the expense with the church UUID
    const newExpense = await prisma.expense.create({
      data: {
        amount: amountValue,
        expenseDate,
        category: categoryValue, // Legacy field for backward compatibility
        expenseCategoryId: expenseCategoryId, // New relation field
        vendor: vendorValue,
        description: descriptionValue,
        receiptUrl,
        receiptPath,
        status: 'PENDING',
        currency: 'USD',
        submitterId: userId, // Set submitter using Clerk userId
        churchId: church.id, // Use the church UUID directly
      },
    });

    // Invalidate dashboard cache after creating expense
    // Debug logging removed: expense created, invalidating cache
    revalidateTag(`dashboard-${orgId}`);

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    logger.error('Error creating expense:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    
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
           logger.error(`Attempted to connect expense to non-existent church with clerkOrgId: ${orgId}`, { operation: 'api.error' });
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
