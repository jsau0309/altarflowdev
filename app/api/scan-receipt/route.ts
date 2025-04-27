// Revert to ESM imports
import { NextResponse } from 'next/server';
// Use namespace import
import * as mindee from "mindee";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma'; // Import Prisma client
import { createAdminClient } from '@/utils/supabase/admin'; // Import the admin client creator

// Initialize the Mindee client using the namespace import
const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  // Get cookies for Supabase auth
  const cookieStore = cookies();

  // Initialize Supabase client for Route Handler (used for auth check)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // We don't need set/remove in this read-only auth context for upload
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  // --- Log Environment Variable Before Initializing Admin Client ---
  console.log(`Checking SUPABASE_SERVICE_ROLE_KEY existence: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Exists' : 'MISSING or undefined'}`);
  // Add more detailed log if needed, but be careful not to log the actual key:
  // console.log(`SUPABASE_SERVICE_ROLE_KEY length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length}`); 

  // Initialize Supabase Admin Client (used for storage upload)
  const supabaseAdmin = createAdminClient();
  console.log('Supabase admin client initialized successfully.'); // Log success

  try {
    // --- Get Authenticated User --- 
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;
    console.log("User ID:", userId);

    // --- Get User's Church ID --- 
    let churchId: string;
    try {
      // Fetch the profile and cast the type to include churchId
      const profileRecord = await prisma.profile.findUniqueOrThrow({
        where: { id: userId },
        // Select basic fields, we'll cast below
        // select: { churchId: true }, // Removed select to fetch full object for casting
      });

      const profile = profileRecord as typeof profileRecord & { churchId: string | null };

      // Since churchId is now required by schema, we expect it to be non-null
      // Added check for robustness in case of data inconsistency
      if (!profile.churchId) { 
        throw new Error('User profile is missing required churchId.');
      }
      churchId = profile.churchId;
      console.log(`User belongs to Church ID: ${churchId}`);
    } catch (profileError) {
      console.error(`Error fetching profile or churchId for user ${userId}:`, profileError);
      const errorMessage = profileError instanceof Error ? profileError.message : 'Failed to retrieve user profile or church association.';
      return NextResponse.json({ error: 'Server error: Could not verify user church affiliation.', details: errorMessage }, { status: 500 });
    }

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
    // Sanitize more thoroughly: replace spaces AND other non-allowed chars with underscores
    // Allowed: letters (a-z, A-Z), numbers (0-9), underscore (_), hyphen (-), period (.)
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_'); 
    const filePath = `${churchId}/receipts/${userId}/${timestamp}_${sanitizedFilename}`;

    console.log(`  >> Uploading to path: ${filePath}`);

    // Use supabaseAdmin client here to bypass RLS for the upload
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      // Log the specific error from Supabase Admin client
      console.error('Supabase Admin Upload Error:', uploadError);
      const errorMessage = uploadError.message || 'Failed to upload receipt to storage via admin';
      const errorDetails = uploadError.stack || undefined; // Include stack if available
      return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
    }
    console.log("Step 8: Supabase upload successful (via admin):", uploadData);

    // --- Get Signed URL (USING ADMIN CLIENT) ---
    // Using admin client here to bypass potential SELECT RLS issues or timing delays
    // after admin upload.
    console.log("Step 9: Getting signed URL (using admin client)...");
    
    // Add a delay before requesting the signed URL to give Supabase time to process the file
    // Keeping a small delay might still be beneficial, but less critical with admin client.
    console.log("Waiting 0.5 second for Supabase to process the file...");
    await delay(500); // Reduced delay
    
    let receiptUrl = null; // Default to null
    try {
      console.log(`  >> Creating signed URL for path: ${filePath}`);
      // Use the supabaseAdmin client here
      const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(filePath, 86400); // 24 hours in seconds
        
      if (signedUrlError) {
        // Log error even with admin client
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
    
    // Store the file path alongside the (potentially null) signed URL
    // This will allow regenerating signed URLs when needed
    const finalData = {
      ...extractedData,
      receiptUrl: receiptUrl, // This might be null if signed URL failed
      // Store the path for future URL generation (USING THE NEW FORMAT)
      receiptPath: filePath,
    };

    console.log("Final data returned:", finalData);
    return NextResponse.json({ data: finalData });

  } catch (error) {
    // Add specific log if admin client init fails
    if (!supabaseAdmin) {
      console.error('Failed to initialize Supabase admin client. Error likely occurred during createAdminClient().');
    }
    console.error('Error processing receipt (Outer Catch):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error processing receipt', details: errorMessage }, { status: 500 });
  }
} 