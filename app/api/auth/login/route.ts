import { NextResponse } from 'next/server';
// Remove the client-side supabase import
// import { supabase } from '@/lib/supabase'; 
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = cookies(); // Get cookie store instance

  // Create Supabase client for Route Handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
             // The `set` method was called from a Server Component.
             // This can be ignored if you have middleware refreshing
             // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt to sign in with Supabase Auth using the server client
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      // Provide a generic error message to the client
      return NextResponse.json(
        { error: 'Invalid login credentials' }, 
        { status: 401 } // Unauthorized
      );
    }

    // On successful login, createServerClient handles session management via cookies
    // Return user information (or just a success message)
    // No need to explicitly set cookies here, createServerClient does it.
    return NextResponse.json({ 
      message: 'Login successful',
      user: data.user // Be mindful of what user data you expose
    });

  } catch (err) {
    console.error('Login API route error:', err);
    // Handle potential JSON parsing errors or other unexpected issues
    let errorMessage = 'An unexpected error occurred';
    if (err instanceof Error) {
        errorMessage = err.message;
    }    
    return NextResponse.json(
      { error: 'Server error during login', details: errorMessage }, 
      { status: 500 }
    );
  }
} 