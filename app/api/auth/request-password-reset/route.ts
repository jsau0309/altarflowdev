import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Input validation schema
const requestSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Ensure Resend API Key is set
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('Missing RESEND_API_KEY environment variable for password reset.');
}
const resend = new Resend(resendApiKey);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
// Add a log to see the actual value read from environment
console.log("Value read for RESEND_FROM_EMAIL:", FROM_EMAIL);

if (!FROM_EMAIL) {
  console.error('Missing RESEND_FROM_EMAIL environment variable for password reset.');
}

// Instantiate Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase env vars for admin actions in request-password-reset.');
}
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const RESET_TOKEN_EXPIRY_MINUTES = 60; // Token valid for 1 hour

export async function POST(request: Request) {
  if (!resendApiKey || !FROM_EMAIL) {
    return NextResponse.json({ error: 'Server configuration error: Email sending not configured.' }, { status: 500 });
  }
  if (!supabaseAdmin) {
     return NextResponse.json({ error: 'Server configuration error: Supabase Admin client not available.' }, { status: 500 });
  }

  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { email } = validation.data;

    // 2. Find user by email using Supabase Admin Client - fetch list and filter
    let userId: string | null = null;
    try {
        // Fetch users (potentially need pagination for very large user bases)
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
             page: 1,
             perPage: 1000 // Adjust if needed
        }); 

        if (listError) {
             console.error(`Supabase admin listUsers error:`, listError);
             throw new Error("Failed to list users."); 
        }
        
        // Find the user with the matching email (case-insensitive)
        const foundUser = usersData.users.find(user => user.email?.toLowerCase() === email.toLowerCase());

        if (foundUser) {
             userId = foundUser.id;
        }

    } catch (lookupError) {
        console.error("Error during user lookup:", lookupError);
        // Return generic success even if lookup fails internally
        return NextResponse.json({ message: 'If an account exists for this email, a password reset link has been sent.' }, { status: 200 });
    }

    // --- Security Note: Return generic success if user not found --- 
    if (!userId) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ message: 'If an account exists for this email, a password reset link has been sent.' }, { status: 200 });
    }

    // --- Continue with token generation only if userId was found --- 
    console.log(`Proceeding with password reset for user ${userId}`);

    // 3. Generate secure token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // 4. Store token in database
    await prisma.passwordResetToken.deleteMany({ where: { userId: userId } });
    await prisma.passwordResetToken.create({
      data: { userId: userId, token: token, expiresAt: expiresAt },
    });

    // 5. Construct Reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // 6. Send password reset email via Resend
    console.log(`Sending password reset email to ${email} for user ${userId}`);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Reset Your Altarflow Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>You requested a password reset for your Altarflow account.</p>
        <p>Please click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link is valid for ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
    });

    if (emailError) {
      console.error(`Resend password reset email error for ${email}:`, emailError);
      // If email fails, the token still exists. Should we delete it?
      // For now, we let it expire naturally, but log the critical failure.
      // Return generic success to user, but log internal error.
       return NextResponse.json({ message: 'If an account exists for this email, a password reset link has been sent.' }, { status: 200 });
       // Or maybe return 500 if email failure is critical?
       // return NextResponse.json({ error: 'Failed to send password reset email.'}, { status: 500 });
    }

    console.log(`Password reset email sent successfully to ${email}. Email ID: ${emailData?.id}`);

    // Return generic success message
    return NextResponse.json({ message: 'If an account exists for this email, a password reset link has been sent.' }, { status: 200 });

  } catch (error) {
    console.error("Error in POST /api/auth/request-password-reset:", error);
    // Return generic success message even on internal errors to prevent info leaks
    return NextResponse.json({ message: 'If an account exists for this email, a password reset link has been sent.' }, { status: 200 });
    // Or return 500 for ops monitoring:
    // return NextResponse.json({ error: 'Failed to process password reset request'}, { status: 500 });
  }
} 