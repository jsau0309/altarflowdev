import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod'; // Using Zod for validation
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@supabase/supabase-js'; // Import standard Supabase client
import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logger';

const RECEIPTS_BUCKET = 'receipts';
const SIGNED_URL_TTL_SECONDS = 86_400;

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
    logger.error('Error generating signed URL after upload', { operation: 'expense.receipt.signed_url_error' }, signedUrlError instanceof Error ? signedUrlError : new Error(String(signedUrlError)));
  }

  return {
    receiptPath: filePath,
    receiptUrl: urlData?.signedUrl ?? null,
  };
}

async function removeReceipt(path: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .remove([path]);

    if (error) {
      logger.warn('Failed to delete existing receipt', { operation: 'expense.receipt.delete_failed', path, error: error instanceof Error ? error.message : String(error) });
    }
  } catch (deleteError) {
    logger.error('Unexpected error deleting receipt', { operation: 'expense.receipt.delete_error', path }, deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
  }
}

// Define schema for PATCH validation (optional but recommended)
const expenseUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  expenseDate: z.string().datetime().optional(),
  category: z.string().min(1).optional(), // Legacy field
  expenseCategoryId: z.string().optional(), // New relation field
  vendor: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  receiptUrl: z.string().url().nullable().optional(),
  receiptPath: z.string().nullable().optional(), // Allow receipt storage path for regenerating signed URLs
  // Status might be updated by a different mechanism/role
  // status: z.nativeEnum(ExpenseStatus).optional(),
});

// GET /api/expenses/[expenseId] - Fetch a single expense from the active organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error('User attempted GET on expense without active org', { operation: 'expense.get.no_org', userId, expenseId });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // 2. Fetch the expense only if it belongs to the active org
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        Church: { clerkOrgId: orgId }
      },
      // Include submitter info if needed for auth check below
      // include: { submitter: { select: { id: true } } } // Not strictly needed if using expense.submitterId
    });

    if (!expense) {
      // Returns 404 if expense doesn't exist or doesn't belong to this org
      return NextResponse.json({ error: 'Expense not found or access denied' }, { status: 404 });
    }

    // 3. Authorization check: Allow viewing for any member of the organization
    // Since we already verified the expense belongs to the user's org, they can view it
    // Only delete operations are restricted to admins

    return NextResponse.json(expense);

  } catch (error) {
    const { expenseId } = await params;
    logger.error('Error fetching expense', { operation: 'expense.get.error', expenseId }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

// PATCH /api/expenses/[expenseId] - Update an existing expense in the active organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { expenseId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error('User attempted PATCH on expense without active org', { operation: 'expense.patch.no_org', userId, expenseId });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // 2. Fetch expense minimal data for auth check before update
    const existingExpense = await prisma.expense.findFirst({
      where: { 
        id: expenseId, 
        Church: { clerkOrgId: orgId } 
      },
      select: { submitterId: true, status: true, receiptPath: true } // Select only needed fields
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found or access denied' }, { status: 404 });
    }

    // 3. Authorization: Only allow submitter to update PENDING expenses
    // TODO: Refine roles later (e.g., using authResult.orgRole)
    if (existingExpense.submitterId !== userId) {
        return NextResponse.json({ error: 'Forbidden: Not submitter' }, { status: 403 });
    }
    if (existingExpense.status !== 'PENDING') {
        return NextResponse.json({ error: 'Forbidden: Expense not pending' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    const isMultipart = contentType.includes('multipart/form-data');

    let amountValue: number | undefined;
    let expenseDateValue: string | undefined;
    let categoryValue: string | undefined;
    let expenseCategoryId: string | undefined;
    let vendorValue: string | null | undefined;
    let descriptionValue: string | null | undefined;
    let receiptFile: File | null = null;
    let preferredFilename: string | null = null;
    let removeReceiptFlag = false;
    let providedReceiptPath: string | null | undefined;
    let previousReceiptPath: string | null = existingExpense.receiptPath ?? null;

    let hasAmountField = false;
    let hasExpenseDateField = false;
    let hasCategoryField = false;
    let hasExpenseCategoryIdField = false;
    let hasVendorField = false;
    let hasDescriptionField = false;
    let hasReceiptPathField = false;

    if (isMultipart) {
      const formData = await request.formData();

      if (formData.has('amount')) {
        hasAmountField = true;
        const amountRaw = formData.get('amount');
        if (typeof amountRaw === 'string' && amountRaw.trim().length > 0) {
          amountValue = Number.parseFloat(amountRaw);
        }
      }

      if (formData.has('expenseDate')) {
        hasExpenseDateField = true;
        const expenseDateRaw = formData.get('expenseDate');
        if (typeof expenseDateRaw === 'string' && expenseDateRaw.trim().length > 0) {
          expenseDateValue = expenseDateRaw;
        }
      }

      if (formData.has('category')) {
        hasCategoryField = true;
        const categoryRaw = formData.get('category');
        if (typeof categoryRaw === 'string' && categoryRaw.trim().length > 0) {
          categoryValue = categoryRaw;
        }
      }

      if (formData.has('expenseCategoryId')) {
        hasExpenseCategoryIdField = true;
        const expenseCategoryIdRaw = formData.get('expenseCategoryId');
        if (typeof expenseCategoryIdRaw === 'string' && expenseCategoryIdRaw.trim().length > 0) {
          expenseCategoryId = expenseCategoryIdRaw;
        }
      }

      if (formData.has('vendor')) {
        hasVendorField = true;
        const vendorRaw = formData.get('vendor');
        if (typeof vendorRaw === 'string') {
          vendorValue = vendorRaw.trim().length > 0 ? vendorRaw : null;
        } else {
          vendorValue = null;
        }
      }

      if (formData.has('description')) {
        hasDescriptionField = true;
        const descriptionRaw = formData.get('description');
        if (typeof descriptionRaw === 'string') {
          descriptionValue = descriptionRaw.trim().length > 0 ? descriptionRaw : null;
        } else {
          descriptionValue = null;
        }
      }

      if (formData.has('receipt')) {
        const receiptEntry = formData.get('receipt');
        if (receiptEntry instanceof File && receiptEntry.size > 0) {
          receiptFile = receiptEntry;
        }
      }

      if (formData.has('receiptMetadata')) {
        const metadataEntry = formData.get('receiptMetadata');
        if (typeof metadataEntry === 'string') {
          try {
            const parsed = JSON.parse(metadataEntry);
            if (parsed && typeof parsed === 'object' && typeof parsed.originalFilename === 'string') {
              preferredFilename = parsed.originalFilename;
            }
          } catch (parseError) {
            logger.warn('Failed to parse receipt metadata JSON', { operation: 'expense.receipt.metadata_parse_error', error: parseError instanceof Error ? parseError.message : String(parseError) });
          }
        }
      }

      if (formData.has('previousReceiptPath')) {
        const previousPathEntry = formData.get('previousReceiptPath');
        if (typeof previousPathEntry === 'string' && previousPathEntry.trim().length > 0) {
          previousReceiptPath = previousPathEntry;
        }
      }

      if (formData.has('removeReceipt')) {
        const removeEntry = formData.get('removeReceipt');
        if (typeof removeEntry === 'string') {
          removeReceiptFlag = removeEntry === 'true';
        }
      }

      if (formData.has('receiptPath')) {
        hasReceiptPathField = true;
        const pathEntry = formData.get('receiptPath');
        if (typeof pathEntry === 'string' && pathEntry.trim().length > 0) {
          providedReceiptPath = pathEntry;
        } else {
          providedReceiptPath = null;
        }
      }
    } else {
      const body = await request.json();

      // 4. Validate input data
      const validation = expenseUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
      }
      const data = validation.data;

      if (data.amount !== undefined) {
        hasAmountField = true;
        amountValue = data.amount;
      }
      if (data.expenseDate !== undefined) {
        hasExpenseDateField = true;
        expenseDateValue = data.expenseDate;
      }
      if (data.category !== undefined) {
        hasCategoryField = true;
        categoryValue = data.category;
      }
      if (data.expenseCategoryId !== undefined) {
        hasExpenseCategoryIdField = true;
        expenseCategoryId = data.expenseCategoryId;
      }
      if (data.vendor !== undefined) {
        hasVendorField = true;
        vendorValue = data.vendor ?? null;
      }
      if (data.description !== undefined) {
        hasDescriptionField = true;
        descriptionValue = data.description ?? null;
      }
      if (data.receiptPath !== undefined) {
        hasReceiptPathField = true;
        providedReceiptPath = data.receiptPath ?? null;
        removeReceiptFlag = data.receiptPath === null;
      }
    }

    const updateData: Record<string, unknown> = {};

    if (hasAmountField) {
      if (amountValue === undefined || Number.isNaN(amountValue) || amountValue <= 0) {
        return NextResponse.json({ error: 'Invalid amount provided.' }, { status: 400 });
      }
      updateData.amount = amountValue;
    }

    if (hasExpenseDateField) {
      if (!expenseDateValue) {
        return NextResponse.json({ error: 'Invalid expense date provided.' }, { status: 400 });
      }
      const parsedDate = new Date(expenseDateValue);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expense date provided.' }, { status: 400 });
      }
      updateData.expenseDate = parsedDate;
    }

    if (hasCategoryField && categoryValue) {
      updateData.category = categoryValue;
    }

    if (hasExpenseCategoryIdField) {
      updateData.expenseCategoryId = expenseCategoryId ?? null;
    }

    if (hasVendorField) {
      updateData.vendor = vendorValue ?? null;
    }

    if (hasDescriptionField) {
      updateData.description = descriptionValue ?? null;
    }

    let newReceiptPath: string | null | undefined;
    let newReceiptUrl: string | null | undefined;

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
        newReceiptPath = uploadResult.receiptPath;
        newReceiptUrl = uploadResult.receiptUrl;

        const pathToDelete = previousReceiptPath ?? existingExpense.receiptPath;
        if (pathToDelete) {
          await removeReceipt(pathToDelete);
        }
      } catch (uploadError) {
        logger.error('Receipt upload failed during update', { operation: 'expense.patch.upload_failed' }, uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
        return NextResponse.json(
          { error: uploadError instanceof Error ? uploadError.message : 'Failed to upload new receipt.' },
          { status: 500 }
        );
      }
    } else if (removeReceiptFlag) {
      const pathToDelete = previousReceiptPath ?? existingExpense.receiptPath;
      if (pathToDelete) {
        await removeReceipt(pathToDelete);
      }
      newReceiptPath = null;
      newReceiptUrl = null;
    } else if (hasReceiptPathField) {
      newReceiptPath = providedReceiptPath ?? null;
      if (providedReceiptPath === null) {
        newReceiptUrl = null;
      }
    }

    if (newReceiptPath !== undefined) {
      updateData.receiptPath = newReceiptPath;
    }
    if (newReceiptUrl !== undefined) {
      updateData.receiptUrl = newReceiptUrl;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
    }

    // 5. Perform the update using updateMany to ensure org boundary
    const updateResult = await prisma.expense.updateMany({
      where: {
        id: expenseId,
        Church: { clerkOrgId: orgId },
        // Optional: Add status/submitter checks again for extra safety, though checked above
        // submitterId: userId,
        // status: 'PENDING'
      },
      data: updateData as Prisma.ExpenseUpdateManyMutationInput,
    });

    // Invalidate dashboard cache after updating expense
    // Debug logging removed: expense updated, invalidating cache
    revalidateTag(`dashboard-${orgId}`);

    // 6. Check if the update was successful
    if (updateResult.count === 0) {
      // This could happen if the expense was modified between the fetch and update (race condition)
      // or if the initial check somehow passed incorrectly.
      logger.warn('PATCH failed for expense', { operation: 'expense.patch.failed', expenseId, userId, updateCount: updateResult.count });
      return NextResponse.json({ error: 'Expense update failed or access denied' }, { status: 404 });
    }

    // 7. Fetch the updated expense to return it
    const updatedExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        Church: { clerkOrgId: orgId } 
      }
    });

    return NextResponse.json(updatedExpense);

  } catch (error) {
    const { expenseId } = await params;
    logger.error('Error updating expense', { operation: 'expense.patch.error', expenseId }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE /api/expenses/[expenseId] - Delete an expense from the active organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { expenseId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error('User attempted DELETE on expense without active org', { operation: 'expense.delete.no_org', userId, expenseId });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // 2. Fetch the expense to get details (like receiptPath) AND verify ownership/org
    const existingExpense = await prisma.expense.findFirst({
      where: { 
        id: expenseId, 
        Church: { clerkOrgId: orgId } 
      },
      select: { submitterId: true, receiptPath: true } // Select needed fields
    });

    if (!existingExpense) {
      // Already deleted, not found, or doesn't belong to this org
      return new NextResponse(null, { status: 204 }); // Idempotent: No Content
    }

    // 3. Authorization: Check if user is admin
    // First, get the user's profile to check their role
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!userProfile || userProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete expenses' }, { status: 403 });
    }

    // 4. Attempt to delete file from Supabase Storage if path exists
    if (existingExpense.receiptPath) {
        logger.debug('Attempting to delete storage file', { operation: 'expense.delete.storage_delete_attempt', receiptPath: existingExpense.receiptPath });
        try {
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
              throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
            }
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY,
              { auth: { persistSession: false } } 
            );
            const { data: storageData, error: storageError } = await supabaseAdmin.storage
                .from('receipts')
                .remove([existingExpense.receiptPath]);
            logger.debug('Storage deletion response data', { operation: 'expense.delete.storage_response', storageData });
            logger.debug('Storage deletion response error', { operation: 'expense.delete.storage_response_error', storageError });
            if (storageError) {
                logger.warn('Failed to delete storage file', { operation: 'expense.delete.storage_delete_failed', receiptPath: existingExpense.receiptPath, error: storageError });
            } else {
                logger.info('Successfully deleted storage file or file did not exist', { operation: 'expense.delete.storage_deleted', receiptPath: existingExpense.receiptPath });
            }
        } catch (storageCatchError) {
            logger.error('Unexpected error deleting storage file', { operation: 'expense.delete.storage_error', receiptPath: existingExpense.receiptPath }, storageCatchError instanceof Error ? storageCatchError : new Error(String(storageCatchError)));
        }
    }

    // 5. Delete the expense record using deleteMany for org safety
    const deleteResult = await prisma.expense.deleteMany({
      where: { 
        id: expenseId, 
        Church: { clerkOrgId: orgId },
        // Optional: Add submitter check again for extra safety
        // submitterId: userId 
      },
    });

    // Invalidate dashboard cache after deleting expense
    logger.info('Expense deleted successfully, invalidating cache', { operation: 'expense.delete.success', orgId });
    revalidateTag(`dashboard-${orgId}`);

    // 6. Check count (should be 1 if initial findFirst succeeded)
    if (deleteResult.count === 0) {
        // Should not happen if findFirst succeeded, but log defensively
        logger.warn('DELETE inconsistency for expense', { operation: 'expense.delete.inconsistency', expenseId, userId, deleteCount: deleteResult.count });
        // Return error as state might be inconsistent
        return NextResponse.json({ error: 'Failed to delete expense record after check' }, { status: 500 });
    }
    
    logger.info('Successfully deleted expense record', { operation: 'expense.delete.record_deleted', expenseId });

    // 7. Return success response
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    const { expenseId } = await params;
    logger.error('Error deleting expense', { operation: 'expense.delete.error', expenseId }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete expense';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 
