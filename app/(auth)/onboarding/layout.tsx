"use client"; // Provider likely uses client-side state/hooks

import type React from "react";
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Clerk to load before checking auth state
    if (isLoaded && !isSignedIn) {
      console.log('[OnboardingLayout] User not signed in, redirecting to /signin');
      router.push('/signin'); 
    }
  }, [isLoaded, isSignedIn, router]);

  // Render nothing or a loading indicator while Clerk is loading
  if (!isLoaded) {
    // Optional: Add a loading skeleton or spinner here
    return null; 
  }

  // If loaded and signed in, render the onboarding content
  if (isSignedIn) {
    return <OnboardingProvider>{children}</OnboardingProvider>;
  }

  // Fallback: Render nothing if loaded but not signed in (should be handled by redirect)
  return null;
} 