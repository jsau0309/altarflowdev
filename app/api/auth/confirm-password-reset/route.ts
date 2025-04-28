import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Input validation schema
const confirmSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

// Instantiate Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase env vars for admin actions in confirm-password-reset.');
}
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export async function POST(request: Request) {
  if (!supabaseAdmin) {
     return NextResponse.json({ error: 'Server configuration error: Supabase Admin client not available.' }, { status: 500 });
  }

  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validation = confirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { token, password } = validation.data;

    // 2. Find the token record in the database
    // Use Prisma directly - no RLS issues as we look up by public token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: token },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired password reset token.' }, { status: 400 });
    }

    // 3. Check if the token has expired
    if (tokenRecord.expiresAt < new Date()) {
       await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } }).catch(e => console.error("Failed to delete expired token", e));
      return NextResponse.json({ error: 'Password reset token has expired.' }, { status: 400 });
    }

    const userId = tokenRecord.userId;

    // 4. Update the user's password using Supabase Admin Client
    console.log(`Attempting to update password for user ${userId}`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password } // Update the password
    );

    if (updateError) {
      console.error(`Failed to update password for user ${userId}:`, updateError);
      return NextResponse.json({ error: 'Failed to update password.', details: updateError.message }, { status: 500 });
    }
    console.log(`Successfully updated password for user ${userId}`);

    // 5. Delete the used password reset token
    await prisma.passwordResetToken.delete({ 
      where: { id: tokenRecord.id } 
    }).catch(e => console.error("Failed to delete used password reset token", e)); // Log error but consider success

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

  } catch (error) {
    console.error("Error in POST /api/auth/confirm-password-reset:", error);
    return NextResponse.json({ error: 'Failed to process password reset confirmation' }, { status: 500 });
  }
} 