import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { processReceiptWithGemini } from '@/lib/gemini-receipt-ocr';
import { rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

type ApiExtractedData = {
  vendor: string | null;
  total: number | null;
  date: string | null;
  confidence?: 'high' | 'medium' | 'low';
};

export async function POST(request: NextRequest) {
  let orgId: string | null | undefined = null; // Declare outside try

  try {
    // 0. Rate limiting check
    const rateLimitResult = await rateLimits.receiptScan(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many receipt scan requests. Please try again in a minute.',
          remaining: rateLimitResult.remaining
        },
        { status: 429 }
      );
    }

    // 1. Get Authenticated User ID & Org ID using Clerk
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      logger.error('Auth Error: No Clerk userId found', { operation: 'api.error' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
        logger.error(`Auth Error: User ${userId} has no active organization.`, { operation: 'api.error' });
        return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
      }
    if (process.env.NODE_ENV === 'development') {
      logger.info('Authenticated User - Org: [REDACTED]', { operation: 'api.info' });
    }

    // --- Process Form Data ---
    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No receipt file found' }, { status: 400 });
    }

    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 413 });
    }

    // MIME type validation
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    const contentType = file.type || 'application/octet-stream';

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json({
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.'
      }, { status: 400 });
    }

    // Convert file to buffer with error handling
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } catch (bufferError) {
      logger.error('File buffer conversion error:', { operation: 'api.error' }, bufferError instanceof Error ? bufferError : new Error(String(bufferError)));
      return NextResponse.json({
        error: 'Failed to process file. Please try again.'
      }, { status: 500 });
    }

    const originalFilename = file.name;

    if (process.env.NODE_ENV === 'development') {
      logger.info(`File: ${originalFilename}, Type: ${contentType}, Size: ${fileBuffer.length} bytes`, { operation: 'api.info' });
    }

    // --- Gemini OCR Parsing ---

    let extractedData: ApiExtractedData;
    try {
      const geminiResult = await processReceiptWithGemini({
        fileBuffer,
        mimeType: contentType,
        trackingContext: {
          distinctId: userId,
          traceId: `receipt_scan_${Date.now()}_${userId}`,
          orgId,
        },
      });

      extractedData = {
        vendor: geminiResult.vendor,
        total: geminiResult.total,
        date: geminiResult.date,
        confidence: geminiResult.confidence,
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info('Gemini OCR completed successfully', { operation: 'api.info' });
      }
    } catch (parseError) {
      logger.error('Gemini OCR Parsing Error:', { operation: 'api.error' }, parseError instanceof Error ? parseError : new Error(String(parseError)));

      if (parseError instanceof Error && parseError.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          {
            error: 'Receipt scanning is temporarily unavailable. Please enter details manually.',
            fallback: true
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to process receipt. Please try again or enter details manually.',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // --- Return Response ---
    const response = {
      extractedData,
      metadata: {
        originalFilename,
        contentType,
        size: fileBuffer.length,
        orgId,
        userId,
      },
      message: 'Receipt processed successfully with Gemini OCR'
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Scan Receipt Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStatus = error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}
