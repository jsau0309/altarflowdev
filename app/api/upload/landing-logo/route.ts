import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const LOGOS_BUCKET = 'landing-logos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Rate limiter: 5 uploads per 15 minutes per organization
const uploadRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9_.-]/g, '_');

type ValidationResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function validateLogoFile(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      status: 413,
      error: 'File too large. Maximum size is 5MB.',
    };
  }

  const contentType = file.type || 'application/octet-stream';

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP, SVG) are allowed.',
    };
  }

  return { ok: true };
}

async function uploadLogo({
  file,
  orgId,
}: {
  file: File;
  orgId: string;
}) {
  const supabaseAdmin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const sanitizedFilename = sanitizeFilename(file.name || 'logo');
  const filePath = `${orgId}/logos/${Date.now()}_${sanitizedFilename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(LOGOS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload logo to storage.');
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(LOGOS_BUCKET)
    .getPublicUrl(filePath);

  return {
    logoUrl: urlData.publicUrl,
    logoPath: filePath,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No organization' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await uploadRateLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateLogoFile(file);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadLogo({ file, orgId });

    return NextResponse.json({
      success: true,
      ...uploadResult,
    });
  } catch (error) {
    logger.error('[POST /api/upload/landing-logo] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove old logos
export async function DELETE(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No organization' },
        { status: 401 }
      );
    }

    const { logoPath } = await request.json();

    if (!logoPath || typeof logoPath !== 'string') {
      return NextResponse.json(
        { error: 'Invalid logo path' },
        { status: 400 }
      );
    }

    // Verify the path belongs to this organization
    if (!logoPath.startsWith(`${orgId}/logos/`)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid logo path' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.storage
      .from(LOGOS_BUCKET)
      .remove([logoPath]);

    if (error) {
      logger.error('Failed to delete logo:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: 'Failed to delete logo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[DELETE /api/upload/landing-logo] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
