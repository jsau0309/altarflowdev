import { createClient } from "@supabase/supabase-js"
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client instance configured with admin privileges 
 * using the Service Role Key. Use this only in secure server-side environments.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("Supabase URL is not defined in environment variables (NEXT_PUBLIC_SUPABASE_URL).");
    }
    if (!serviceKey) {
        throw new Error("Supabase Service Role Key is not defined in environment variables (SUPABASE_SERVICE_ROLE_KEY).");
    }

    const supabase = createClient<Database>(
        supabaseUrl,
        serviceKey,
        { auth: { persistSession: false } } // Prevent server-side session persistence
    );

    return supabase;
}

/**
 * Pre-initialized Supabase client with admin privileges.
 * Note: Using createAdminClient() directly might be preferable to ensure 
 * environment variables are checked at the time of use.
 */
export const supabaseAdmin = createAdminClient();
