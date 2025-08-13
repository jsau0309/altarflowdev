'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Set user context in Sentry for better error tracking
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || user.firstName || 'User',
      });

      // Add organization context if available
      if (user.organizationMemberships && user.organizationMemberships.length > 0) {
        const org = user.organizationMemberships[0].organization;
        Sentry.setContext('organization', {
          id: org.id,
          name: org.name,
          slug: org.slug,
        });
      }
    } else if (isLoaded && !user) {
      // Clear user context when logged out
      Sentry.setUser(null);
    }
  }, [user, isLoaded]);

  return <>{children}</>;
}