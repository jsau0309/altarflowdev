import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Remove unused Supabase Admin client for invites
// import { createClient } from '@supabase/supabase-js'; 
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';
import crypto from 'crypto'; // Import crypto
import { Resend } from 'resend'; // Import Resend

// Input validation schema
const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Ensure Resend API Key is set
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('Missing RESEND_API_KEY environment variable.');
}
const resend = new Resend(resendApiKey);

// Define your verified sending domain email address
// IMPORTANT: Replace with your actual verified sender email
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Altarflow <no-reply@altarflow.com>'; 

// Remove Supabase Admin Client instantiation if only used for invites
/*
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables required for admin actions in /api/settings/invitations.');
}
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
*/

const MAX_STAFF_MEMBERS = 3;
const INVITE_TOKEN_EXPIRY_HOURS = 24; // Token valid for 24 hours

// POST /api/settings/invitations - Invites a new user to the church using Resend
export async function POST(request: Request) {
  // Remove check for supabaseAdmin if not used elsewhere in this file
  /* if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error: Supabase Admin client not available.' }, { status: 500 });
  } */
  if (!resendApiKey) {
     return NextResponse.json({ error: 'Server configuration error: Resend API key not configured.' }, { status: 500 });
  }

  const cookieStore = cookies();
  // Supabase client for getting current user session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
    }
  );

  try {
    // 1. Get authenticated user & validate role (remains the same)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { churchId: true, role: true },
    });
    if (!userProfile || !userProfile.churchId) {
      return NextResponse.json({ error: 'User profile or church association not found' }, { status: 404 });
    }
    if (userProfile.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Only admins can invite users.' }, { status: 403 });
    }
    const churchId = userProfile.churchId;

    // 2. Parse and validate request body (remains the same)
    const body = await request.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { email: emailToInvite } = validation.data;

    // 3. Check User Limit (remains the same)
    const staffCount = await prisma.profile.count({
      where: { churchId: churchId, role: 'STAFF' },
    });
    if (staffCount >= MAX_STAFF_MEMBERS) {
      return NextResponse.json({ error: `User limit reached (${MAX_STAFF_MEMBERS} staff members maximum).` }, { status: 403 });
    }

    // --- New Logic using Resend --- 

    // 4. Generate secure token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // 5. Store token in database
    try {
      await prisma.inviteToken.create({
        data: {
          token: token,
          email: emailToInvite,
          churchId: churchId,
          expiresAt: expiresAt,
        },
      });
    } catch (dbError) {
      console.error("Error storing invite token:", dbError);
      // Handle potential unique constraint violation if token generation somehow collides
      return NextResponse.json({ error: 'Failed to create invitation record.' }, { status: 500 });
    }

    // 6. Construct Signup URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; // Fallback for local dev
    const signupUrl = `${baseUrl}/signup?invite_token=${token}`;

    // 7. Send invitation email via Resend
    try {
        console.log(`Attempting to send invite email via Resend to ${emailToInvite} for church ${churchId}`);
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [emailToInvite],
          subject: 'You are invited to join Altarflow',
          // Basic HTML content - replace with React Email component later if desired
          html: `
            <h1>Invitation to Altarflow</h1>
            <p>You have been invited to join the Altarflow church management platform.</p>
            <p>Please click the link below to sign up:</p>
            <a href="${signupUrl}">Accept Invitation & Sign Up</a>
            <p>This link will expire in ${INVITE_TOKEN_EXPIRY_HOURS} hours.</p>
            <p>If you did not expect this invitation, please ignore this email.</p>
          `,
          // Alternatively, use the react property with an imported component:
          // react: <InvitationEmailTemplate signupUrl={signupUrl} expiryHours={INVITE_TOKEN_EXPIRY_HOURS} />
        });

        if (emailError) {
            console.error(`Resend email error for ${emailToInvite}:`, emailError);
            throw new Error('Failed to send invitation email.'); // Let outer catch handle response
        }

        console.log(`Resend invite sent successfully to ${emailToInvite}. Email ID: ${emailData?.id}`);

    } catch (sendError) {
       // If email fails, should we delete the token we just created?
       // Consider adding logic here to delete the InviteToken if email sending fails critically.
        console.error("Error during Resend email sending:", sendError);
         return NextResponse.json({ error: 'Failed to send invitation email.', details: sendError instanceof Error ? sendError.message : 'Unknown error' }, { status: 500 });
    }

    // --- Remove Old Supabase Invite Logic --- 
    /*
    console.log(`Attempting to invite ${emailToInvite} for church ${churchId}`);
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(...);
    if (inviteError) { ... }
    console.log(`Invite sent successfully to ${emailToInvite}. Invite data:`, inviteData);
    */

    return NextResponse.json({ message: 'Invitation sent successfully.' }, { status: 200 });

  } catch (error) {
    // General catch block remains mostly the same
    console.error("Error in POST /api/settings/invitations:", error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Failed to process invitation request', details: message }, { status: 500 });
  }
} 