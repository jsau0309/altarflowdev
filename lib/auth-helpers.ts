import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers'; // Import cookies to log

/**
 * Server-side helper to get the current authenticated user.
 * Uses the server client configured with cookies.
 * 
 * @returns {Promise<User | null>} The Supabase user object or null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Log the cookies available in this context
    const cookieStore = cookies();
    console.log("Cookies available in getCurrentUser:", JSON.stringify(cookieStore.getAll(), null, 2));

    const supabase = createSupabaseServerClient(); // This internally uses cookies() again
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error fetching user:", error.message);
      return null;
    }

    console.log("Supabase getUser response:", data.user ? `User ID: ${data.user.id}` : "No user found");
    return data?.user || null;
  } catch (error) {
    console.error("Exception fetching user:", error);
    return null;
  }
}

// Optional: You might add other server-side auth helpers here later,
// e.g., checking roles by fetching the Profile linked to the user ID.

// Example (requires Profile model setup):
/*
import { prisma } from './prisma';
import type { Role } from '@prisma/client';

export async function getCurrentUserWithProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });
    return { ...user, profile }; // Combine auth user and profile data
  } catch (error) {
    console.error("Error fetching profile for user:", error);
    return user; // Return just the user if profile fetch fails
  }
}

export async function requireAdmin() {
  const userWithProfile = await getCurrentUserWithProfile();
  if (!userWithProfile || !userWithProfile.profile || userWithProfile.profile.role !== 'ADMIN') {
    throw new Error("Unauthorized: Admin role required.");
  }
  return userWithProfile;
}
*/ 