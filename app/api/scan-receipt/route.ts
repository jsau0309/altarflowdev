import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuth } from '@clerk/nextjs/server';
import { processReceiptWithDocumentAI, mapToExpenseFormat } from '@/lib/document-ai-auth';

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  // --- Log Environment Variable Before Initializing Admin Client ---
  console.log(`Checking SUPABASE_SERVICE_ROLE_KEY existence: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Exists' : 'MISSING or undefined'}`);

  // Initialize Supabase Admin Client (used for storage upload)
  const supabaseAdmin = createAdminClient();
  console.log('Supabase admin client initialized successfully.');

  let orgId: string | null | undefined = null; // Declare outside try

  try {
    // 1. Get Authenticated User ID & Org ID using Clerk
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;
    
    if (!userId) { 
      console.error('Auth Error: No Clerk userId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
        console.error(`Auth Error: User ${userId} has no active organization.`);
        return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
      }
    console.log(`Authenticated Clerk User ID: ${userId}, Org ID: ${orgId}`);

    // --- Process Form Data --- 
    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No receipt file found' }, { status: 400 });
    }
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalFilename = file.name;
    const contentType = file.type || 'application/octet-stream'; // Get content type

    console.log(`Step 1: File found (${originalFilename}, ${contentType})`); 
    console.log(`Step 2: File buffer created, length: ${fileBuffer.length}`);
    
    // --- Document AI Parsing --- 
    console.log("Step 3: Starting Document AI processing...");
    
    let extractedData;
    try {
      // Process with Google Document AI
      const documentAIResult = await processReceiptWithDocumentAI(
        fileBuffer,
        contentType
      );
      
      // Map to our format
      const mappedData = mapToExpenseFormat(documentAIResult);
      
      extractedData = {
        vendor: mappedData.vendor,
        total: mappedData.amount,
        date: mappedData.date,
        // Additional fields from Document AI
        taxAmount: documentAIResult.taxAmount,
        invoiceNumber: documentAIResult.invoiceNumber,
        currency: documentAIResult.currency,
        items: documentAIResult.items,
      };
      
      console.log("Step 4: Document AI processing complete:", extractedData);
    } catch (parseError) {
      console.error('Document AI Parsing Error:', parseError);
      
      // Check if Document AI is not configured
      if (parseError instanceof Error && parseError.message.includes('configuration missing')) {
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

    // --- Supabase Storage Upload (USING ADMIN CLIENT) ---
    console.log("Step 5: Attempting Supabase upload (using admin client)...");
    const timestamp = Date.now();
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_'); 
    const filePath = `${orgId}/receipts/${userId}/${timestamp}_${sanitizedFilename}`;

    console.log(`  >> Uploading to path: ${filePath}`);

    // Use supabaseAdmin client here
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Admin Upload Error:', uploadError);
      const errorMessage = uploadError.message || 'Failed to upload receipt to storage via admin';
      const errorDetails = uploadError.stack || undefined;
      return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
    }
    console.log("Step 6: Supabase upload successful (via admin):", uploadData);

    // --- Get Signed URL (USING ADMIN CLIENT) ---
    console.log("Step 7: Getting signed URL (using admin client)...");
    console.log("Waiting 0.5 second for Supabase to process the file...");
    await delay(500); 
    
    let receiptUrl: string | null = null; // Default to null
    try {
      console.log(`  >> Creating signed URL for path: ${filePath}`);
      const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(filePath, 86400); // 24 hours
        
      if (signedUrlError) {
        console.error('Supabase Admin Signed URL Error:', signedUrlError);
      } else if (urlData?.signedUrl) {
        receiptUrl = urlData.signedUrl;
        console.log("Step 8: Signed URL obtained (via admin, expires in 24 hours)");
      } else {
        console.warn("Admin Signed URL generation returned no URL data.");
      }
    } catch (signedUrlCatchError) {
      console.error('Error creating admin signed URL:', signedUrlCatchError);
    }

    // --- Return Response ---
    const response = {
      extractedData,
      receiptPath: uploadData?.path || filePath,
      receiptUrl,
      message: 'Receipt processed successfully with Document AI'
    };

    console.log("Step 9: Returning response");
    return NextResponse.json(response);

  } catch (error) {
    console.error('Scan Receipt Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStatus = error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}