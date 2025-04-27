"use client";

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// This component handles the client-side auth listener
export default function SupabaseListener() {
  // Add log here to confirm component mount
  console.log('[SupabaseListener] Component rendering...'); 

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    console.log('[SupabaseListener] Setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SupabaseListener] Auth State Change Event Received:', event);
      if (session) {
        console.log('[SupabaseListener] Session User ID:', session.user?.id);
      } else {
        console.log('[SupabaseListener] No session data received in event.');
      }
      // Refresh the page to sync server components with the session
      console.log('[SupabaseListener] Calling router.refresh()...');
      router.refresh();
      console.log('[SupabaseListener] router.refresh() called.');
    });

    // Cleanup subscription on component unmount
    return () => {
      console.log('[SupabaseListener] Cleaning up auth listener...');
      subscription?.unsubscribe();
    };
  // Ensure router and supabase are stable dependencies
  }, [supabase, router]); 

  // This component doesn't render anything itself
  return null; 
} 