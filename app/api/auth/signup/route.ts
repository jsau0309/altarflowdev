import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
// Correct import for App Router SSR helpers
import { createServerClient, type CookieOptions } from '@supabase/ssr'; 
// Import Supabase Admin client for token deletion (if needed, though Prisma might suffice)
import { createClient } from '@supabase/supabase-js';

// Instantiate Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables required for admin actions in signup.');
}
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  try {
    // Destructure inviteToken from the body, make it optional
    const { email, password, firstName, lastName, inviteToken } = await request.json(); 

    // Validation remains mostly the same, inviteToken is optional
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

    // --- Invite Token Handling --- 
    let validatedChurchId: string | null = null;
    let inviteTokenRecordId: string | null = null; // Store token ID for deletion
    if (inviteToken && typeof inviteToken === 'string') {
        console.log(`Signup attempt with invite token: ${inviteToken}`);
        const tokenRecord = await prisma.inviteToken.findUnique({
            where: { token: inviteToken },
        });

        if (!tokenRecord) {
            console.warn(`Invalid invite token received: ${inviteToken}`);
            return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 400 });
        }

        if (tokenRecord.expiresAt < new Date()) {
            console.warn(`Expired invite token received: ${inviteToken}`);
            // Optional: Delete expired token here
            await prisma.inviteToken.delete({ where: { id: tokenRecord.id } }).catch(e => console.error("Failed to delete expired token", e));
            return NextResponse.json({ error: 'Invitation token has expired.' }, { status: 400 });
        }

        if (tokenRecord.email.toLowerCase() !== email.toLowerCase()) {
            console.warn(`Invite token email mismatch. Token: ${tokenRecord.email}, Signup: ${email}`);
            return NextResponse.json({ error: 'Invitation email does not match signup email.' }, { status: 400 });
        }
        
        // Token is valid, store churchId for profile creation
        validatedChurchId = tokenRecord.churchId;
        inviteTokenRecordId = tokenRecord.id; // Store ID for safer deletion
        console.log(`Valid invite token. User will be added to church ${validatedChurchId}`);
    }
    // --- End Invite Token Handling --- 

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

    const newUserId = data.user.id; // Get the new user ID

    // --- Conditional Profile Creation --- 
    try {
        if (validatedChurchId && inviteTokenRecordId) {
            // Invited user: Create profile with churchId, STAFF role, onboarding complete
            console.log(`Creating profile for invited user ${newUserId} in church ${validatedChurchId}`);
            await prisma.profile.create({
                data: {
                    id: newUserId,
                    firstName: firstName,
                    lastName: lastName,
                    churchId: validatedChurchId, // Set churchId from token
                    role: 'STAFF', // Explicitly set role
                    onboardingComplete: true, // Skip onboarding
                },
            });

            // --- Add: Confirm Email using Admin Client --- 
            if (!supabaseAdmin) {
                console.error("Supabase Admin client not available to confirm email.");
                // Decide how critical this is - maybe throw to rollback transaction? Or just log?
                throw new Error("Server configuration error prevents email confirmation.");
            }
            console.log(`Attempting to admin-confirm email for user ${newUserId}`);
            const { error: adminUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
                newUserId,
                { email_confirm: true } // Mark email as confirmed
            );
            if (adminUpdateError) {
                console.error(`Failed to admin-confirm email for user ${newUserId}:`, adminUpdateError);
                // Decide how to handle - rollback? Log and continue?
                throw new Error("Failed to confirm user email status.");
            }
            console.log(`Successfully admin-confirmed email for user ${newUserId}`);
            // --- End Add --- 

            // Delete the used invite token (use ID for safety)
            console.log(`Deleting used invite token id ${inviteTokenRecordId}`);
            await prisma.inviteToken.delete({ 
                where: { id: inviteTokenRecordId } // Use ID 
            }).catch(e => console.error("Failed to delete used token after profile creation", e));

        } else {
            // Standard user: Create profile with defaults (will do onboarding)
             console.log(`Creating profile for standard user ${newUserId}`);
            await prisma.profile.create({
                data: {
                    id: newUserId, 
                    firstName: firstName,
                    lastName: lastName,
                    // Let schema defaults handle churchId (null), role (STAFF), onboardingComplete (false)
                },
            });
        }
    } catch (prismaError) {
        console.error("Error creating Prisma profile:", prismaError);
        // Optional: Attempt to delete the Supabase user if profile creation fails?
        // This requires using the admin client and is more complex.
        return NextResponse.json(
            { error: "Failed to create user profile after signup." },
            { status: 500 }
        );
    }

    // --- Conditional Response --- 
    if (validatedChurchId) {
        // Invited user skips OTP/confirmation (handled by Supabase invite flow conceptually)
        // and onboarding. Redirect straight to dashboard? Or return specific success message.
        // NOTE: If email confirmation IS enabled in Supabase, they might still need 
        // to confirm via the standard flow unless invite implicitly confirms.
        // For now, return success indicating direct access is likely.
         return NextResponse.json({ 
            message: 'Signup successful via invitation! You can now log in.',
            invitedUser: true, // Flag for client-side handling
            email: email 
         });
    } else {
        // Standard user needs OTP verification
        return NextResponse.json({ 
            message: 'Signup successful, please check your email for the verification code.',
            invitedUser: false,
            email: email,
        });
    }

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
