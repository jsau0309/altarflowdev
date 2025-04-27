"use server";

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { redirect } from 'next/navigation';

// Input validation schema (same as before)
const onboardingCompleteSchema = z.object({
  churchName: z.string().min(1, { message: "Church name is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  website: z.string().url({ message: "Invalid URL" }).nullable().optional(),
});

// Define the return type for the action state
export type OnboardingFormState = {
  message: string;
  errors?: z.ZodIssue[];
  success: boolean;
};

export async function completeOnboardingAction(
  prevState: OnboardingFormState, 
  formData: FormData
): Promise<OnboardingFormState> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { // Use the full cookie handlers for server actions
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );

  try {
    // 1. Get authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.error("ServerAction Auth Error:", sessionError);
      return { message: "Authentication failed. Please sign in again.", success: false };
    }
    const userId = session.user.id;

    // 2. Extract and validate form data
    const rawData = {
        churchName: formData.get('churchName'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        website: formData.get('website') || null, // Handle empty optional field
    };
    const validation = onboardingCompleteSchema.safeParse(rawData);

    if (!validation.success) {
      console.error("ServerAction Validation Error:", validation.error.issues);
      return { 
        message: "Invalid input data.", 
        errors: validation.error.issues, 
        success: false 
      };
    }
    const { churchName, address, phone, email, website } = validation.data;

    // 3. Check if user already completed onboarding (copied from API route)
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { churchId: true, onboardingComplete: true },
    });

    if (userProfile?.onboardingComplete || userProfile?.churchId) {
        console.warn(`User ${userId} attempting onboarding completion again via Server Action.`);
        // Redirect to next step or dashboard if already completed
        redirect('/onboarding/step-3'); // Or maybe /dashboard?
    }

    // 4. Perform database operations in a transaction (copied from API route)
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
        newChurchId = newChurch.id;

        // Update the user's Profile
        await tx.profile.update({
          where: { id: userId },
          data: {
            churchId: newChurch.id,
            onboardingComplete: true,
          },
        });
      });
    } catch (dbError) {
        console.error(`ServerAction DB Transaction Error for user ${userId}:`, dbError);
        return { message: "Database operation failed.", success: false };
    }

    // 5. Auth metadata update is handled by the add-church-claim hook, no action needed here.

  } catch (error) {
    console.error("Unexpected Error in completeOnboardingAction:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { message: `Server error: ${message}`, success: false };
  }

  // 6. On success, redirect to the next step
  // Important: Redirect must happen *outside* the try/catch block
  // if it's the successful outcome
  redirect('/onboarding/step-3');

  // Note: The redirect technically prevents this return from being reached,
  // but we need it for type safety if redirect were conditional.
  // return { message: 'Onboarding completed successfully', success: true };
} 