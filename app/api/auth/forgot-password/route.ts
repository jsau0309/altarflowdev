import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Import the initialized Supabase client

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Construct the redirect URL for the password reset confirmation page
    // Ensure this page exists and can handle the reset token (e.g., /reset-password)
    const redirectUrl = `${request.headers.get('origin')}/reset-password`; 
    // Alternatively, use a fixed URL if preferred:
    // const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`;

    // Call Supabase to send the password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase password reset error:', error.message);
      // Don't expose specific errors like "User not found" for security
      // Return a generic success message regardless, to prevent email enumeration
      // return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 }); 
    }

    // Always return a success message to prevent leaking information about registered emails
    return NextResponse.json({ 
      message: 'If an account exists for this email, a password reset link has been sent.' 
    });

  } catch (err) {
    console.error('Forgot Password API route error:', err);
    // Still return a generic success message even on unexpected errors
    return NextResponse.json({ 
        message: 'If an account exists for this email, a password reset link has been sent.' 
    }, { status: 200 }); // Return 200 OK even if internal error, for security
  }
} 