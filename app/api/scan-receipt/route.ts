// Revert to ESM imports
import { NextRequest, NextResponse } from 'next/server';
// Use namespace import
import * as mindee from "mindee";
// import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- Remove Supabase
// import { cookies } from 'next/headers'; // <-- Remove if not used
// import { prisma } from '@/lib/db'; // Not used in this endpoint
import { createAdminClient } from '@/utils/supabase/admin'; // Import the admin client creator
import { getAuth } from '@clerk/nextjs/server'; // Use getAuth

// Initialize the Mindee client using the namespace import
const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  // Get cookies for Supabase auth - REMOVED
  // const cookieStore = cookies();

  // Initialize Supabase client for Route Handler - REMOVED
  // const supabase = createServerClient(...);

  // --- Log Environment Variable Before Initializing Admin Client ---
  console.log(`Checking SUPABASE_SERVICE_ROLE_KEY existence: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Exists' : 'MISSING or undefined'}`);
  // Add more detailed log if needed, but be careful not to log the actual key:
  // console.log(`SUPABASE_SERVICE_ROLE_KEY length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length}`); 

  // Initialize Supabase Admin Client (used for storage upload) - REMAINS
  const supabaseAdmin = createAdminClient();
  console.log('Supabase admin client initialized successfully.'); // Log success

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
    
    // --- Mindee Parsing --- 
    const inputSource: mindee.InputSource = mindeeClient.docFromBuffer(fileBuffer, originalFilename);
    console.log("Step 3: InputSource loaded"); 

    console.log("Step 4: Attempting mindeeClient.parse..."); 
    const mindeeApiResponse = await mindeeClient.parse(
        mindee.product.FinancialDocumentV1, 
        inputSource 
    );
    console.log("Step 5: Mindee parse finished.");
    // console.log("Full Mindee API Response:", mindeeApiResponse); // Keep if needed for debug

    // Refined Error Handling for Mindee
    const mindeeApiRequestError = mindeeApiResponse?.apiRequest?.error;
    const isMindeeErrorObjectPopulated = mindeeApiRequestError && Object.keys(mindeeApiRequestError).length > 0;
    const mindeeStatusCode = mindeeApiResponse?.apiRequest?.statusCode;
    
    if (!mindeeApiResponse || (mindeeStatusCode && (mindeeStatusCode < 200 || mindeeStatusCode >= 300)) || isMindeeErrorObjectPopulated) {
        console.error('Mindee API Request Error:', mindeeApiRequestError); 
        const httpStatus = mindeeStatusCode || 500;
        const errorMessage = mindeeApiResponse?.apiRequest?.error?.message || 'Failed to call Mindee API';
        const errorDetails = mindeeApiResponse?.apiRequest?.error?.details || undefined;
        return NextResponse.json(
            { error: errorMessage, details: errorDetails },
            { status: httpStatus }
        );
    }
    if (!mindeeApiResponse.document?.inference?.prediction) {
        console.error('Mindee Parsing Error: No prediction found in the response.');
        return NextResponse.json(
            { error: 'Mindee parsing failed: No prediction found' },
            { status: 500 }
        );
    }
    const prediction = mindeeApiResponse.document.inference.prediction;
    const extractedData = {
      vendor: prediction.supplierName?.value || null,       
      total: prediction.totalAmount?.value || null,        
      date: prediction.date?.value || null, 
    };
    console.log("Step 6: Mindee data extracted:", extractedData);

    // --- Supabase Storage Upload (USING ADMIN CLIENT) ---
    console.log("Step 7: Attempting Supabase upload (using admin client)...");
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
    console.log("Step 8: Supabase upload successful (via admin):", uploadData);

    // --- Get Signed URL (USING ADMIN CLIENT) ---
    console.log("Step 9: Getting signed URL (using admin client)...");
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
        console.log("Step 10: Signed URL obtained (via admin, expires in 24 hours)");
      } else {
        console.warn("Admin Signed URL generation returned no URL data.");
      }
    } catch (urlError) {
      console.error('Error generating signed URL (admin client catch):', urlError);
    }
    
    // Store the file path (using orgId) and the URL
    const finalData = {
      ...extractedData,
      receiptUrl: receiptUrl, 
      receiptPath: filePath,
    };

    console.log("Final data returned:", finalData);
    return NextResponse.json({ data: finalData });

  } catch (error) {
    if (!supabaseAdmin) {
      console.error('Failed to initialize Supabase admin client. Error likely occurred during createAdminClient().');
    }
    console.error('Error processing receipt (Outer Catch):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error processing receipt', details: errorMessage }, { status: 500 });
  }
} 