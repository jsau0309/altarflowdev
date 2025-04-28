import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const onboardingCompleteSchema = z.object({
  churchName: z.string().min(1, { message: "Church name is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  website: z.string().url({ message: "Invalid URL" }).nullable().optional(), // Optional and must be a valid URL if provided
});

// Ensure Supabase environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables required for admin actions.');
  // Potentially throw an error or handle this case depending on desired behavior at startup
}

// Create Supabase Admin client scoped to this module if variables are present
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// POST /api/onboarding/complete - Creates Church and updates Profile after signup/onboarding
export async function POST(request: Request) {
  const cookieStore = cookies();

  // --- Debug: Log cookies available to API route ---
  console.log("/api/onboarding/complete received cookies:", cookieStore.getAll());
  // --- End Debug ---

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // cookieStore.delete({ name, ...options })
        },
      },
    }
  );

  try {
    // 1. Get authenticated user - try getSession() first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("Error getting session:", sessionError);
        return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
    }

    if (!session) { // Check if session itself is null
        console.error("No active session found.");
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }
    
    // Now check if user exists within the valid session
    if (!session.user) {
        console.error("Session exists but user data is missing.");
        return NextResponse.json({ error: 'Unauthorized: Invalid session data' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = onboardingCompleteSchema.safeParse(body);

    if (!validation.success) {
      console.error("Onboarding validation error:", validation.error.errors);
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.flatten() }, { status: 400 });
    }
    const { churchName, address, phone, email, website } = validation.data;

    // 3. Check if user already completed onboarding (optional but good practice)
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { churchId: true, onboardingComplete: true },
    });

    if (userProfile?.onboardingComplete || userProfile?.churchId) {
        console.warn(`User ${userId} attempting onboarding completion again.`);
        // Decide how to handle: error, redirect, or just return success?
        // Returning success might be okay if the state is already correct.
      return NextResponse.json({ message: 'Onboarding already completed' }, { status: 200 }); // Or 409 Conflict
    }

    // 4. Perform database operations in a transaction
    let newChurchId: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        // Create the Church
        const newChurch = await tx.church.create({
          data: {
            name: churchName,
            address: address,
            phone: phone,
            email: email,
            website: website,
          },
        });
        newChurchId = newChurch.id; // Capture the new church ID

        console.log(`[Onboarding] Attempting to update profile ${userId} with churchId ${newChurch.id} and role ADMIN...`);

        // Update the user's Profile
        const updatedProfile = await tx.profile.update({
          where: { id: userId },
          data: {
            churchId: newChurch.id,
            onboardingComplete: true,
            role: 'ADMIN',
          },
          select: { id: true, role: true }
        });

        console.log(`[Onboarding] Profile update result for ${userId}:`, updatedProfile);

      });
    } catch (dbError) {
        console.error(`Database transaction failed for user ${userId}:`, dbError);
        // Rethrow to be caught by the outer try/catch
        throw new Error('Failed to update database.');
    }

    // 6. Return success response
    return NextResponse.json({ message: 'Onboarding completed successfully', churchId: newChurchId }, { status: 201 });

  } catch (error) {
    console.error("Error during onboarding completion:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Avoid leaking sensitive details in the response
    return NextResponse.json({ error: 'Failed to complete onboarding', details: errorMessage }, { status: 500 });
  }
} 