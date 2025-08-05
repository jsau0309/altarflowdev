'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/signin');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show nothing while auth is loading to prevent flashing
  if (!isLoaded) {
    return null;
  }

  // If not signed in, we're redirecting, so show nothing
  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}