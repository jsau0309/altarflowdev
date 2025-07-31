'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Define the state shape expected by useFormState
interface VerifyOtpState {
  error: string | null;
  // Add other potential state fields here if needed, e.g., success: boolean
}

// Update the action to accept prevState as the first argument
export async function verifyOtpAction(
  prevState: VerifyOtpState, // Accept previous state
  formData: FormData
): Promise<VerifyOtpState> { // Return the state shape
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
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

  const otp = formData.get('otp') as string;
  const email = formData.get('email') as string;

  if (!otp || !email) {
    return { error: 'Email and OTP are required.' };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  });

  if (verifyError) {
    console.error('[verifyOtpAction] Supabase OTP Verification Error:', verifyError);
    // Provide a more user-friendly error message
    let errorMessage = 'Failed to verify OTP. Please check the code and try again.';
    if (verifyError.message.includes('expired')) {
        errorMessage = 'The verification code has expired. Please request a new one.';
    } else if (verifyError.message.includes('not found')) {
        errorMessage = 'Invalid verification code.'; // Or user not found, Supabase might consolidate these
    }
    // Return the error state
    return { error: errorMessage };
  }

  // On successful verification, Supabase automatically handles the session.
  // Redirect the user to the first step of onboarding.
  console.log(`[verifyOtpAction] OTP verified successfully for ${email}. Redirecting to onboarding...`);
  redirect('/onboarding/step-1');

  // The redirect function throws an error, so this part is unreachable,
  // but it clarifies the flow.
  // return { success: true };
} 