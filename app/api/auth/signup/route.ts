import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
// Correct import for App Router SSR helpers
import { createServerClient, type CookieOptions } from '@supabase/ssr'; 

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  try {
    const { email, password, firstName, lastName } = await request.json(); 

    if (!email || !password || !firstName || !lastName) { 
      return NextResponse.json(
        { error: 'Missing required fields (email, password, firstName, lastName)' }, 
        { status: 400 }
      );
    }

    // Initialize Supabase client using cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try { // Wrap in try/catch for potential Next.js header setting issues
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore errors setting cookies in Route Handlers, middleware handles it
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore errors removing cookies in Route Handlers
            }
          },
        },
      }
    );

    // Sign up the user with Supabase Auth - OTP will be sent automatically
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Metadata to be stored in auth.users.raw_user_meta_data
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        // REMOVED: emailRedirectTo - Supabase handles OTP email automatically
        // emailRedirectTo: `${requestUrl.origin}/api/auth/callback`, 
      },
    });

    if (signUpError) {
      // Log the specific error received from Supabase
      console.error("Supabase signUp Error:", JSON.stringify(signUpError, null, 2));
      return NextResponse.json(
        // Ensure we pass a default message if signUpError.message is missing
        { error: signUpError.message || 'Supabase signup failed without a specific message.' }, 
        { status: 400 }
      );
    }

    // Ensure user object exists after successful signup
    if (!data || !data.user) {
        console.error("Supabase signup successful but no user data returned.");
        return NextResponse.json(
            { error: "User signup failed, user data missing." },
            { status: 500 }
        );
    }

    // Create user profile in Prisma database, linked to the auth user ID
    try {
        await prisma.profile.create({
          data: {
            id: data.user.id, // Link to the auth.users table
            firstName: firstName,
            lastName: lastName,
            // REMOVED: Automatic church creation removed.
            // church: {                
            //   create: {
            //     name: "Temporary Church" 
            //   }
            // }
            // churchId is now optional and will be set during onboarding
            // onboardingComplete defaults to false (per schema)
            // role defaults to STAFF (per schema)
          },
        });
    } catch (prismaError) {
        console.error("Error creating Prisma profile:", prismaError);
        // Optional: Attempt to delete the Supabase user if profile creation fails?
        // This requires using the admin client and is more complex.
        return NextResponse.json(
            { error: "Failed to create user profile after signup." },
            { status: 500 }
        );
    }

    // Return success response indicating OTP verification is needed
    // The client-side will handle redirecting to the /auth/verify-otp page
    return NextResponse.json({ 
      message: 'Signup successful, please check your email for the verification code.',
      // Pass the email back so the client can append it to the redirect URL
      email: email, 
      // Optional: Include user ID if needed by the client immediately, 
      // but usually not necessary before OTP verification.
      // userId: data.user.id 
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
