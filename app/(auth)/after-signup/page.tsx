'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';
import LoaderOne from '@/components/ui/loader-one';

export default function AfterSignupPage() {
  const router = useRouter();
  const { isLoaded, userInvitations, userMemberships } = useOrganizationList({
    userInvitations: {
      infinite: true,
    },
    userMemberships: {
      infinite: true,
    },
  });

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user already has organization memberships (accepted invitation during signup)
    if (userMemberships && userMemberships.data && userMemberships.data.length > 0) {
      // User is already a member - they accepted an invitation during signup
      // Send them directly to dashboard
      router.replace('/dashboard');
    } 
    // Check if user has pending organization invitations
    else if (userInvitations && userInvitations.data && userInvitations.data.length > 0) {
      // User was invited but hasn't accepted yet - go to invitation pending
      router.replace('/invitation-pending');
    } else {
      // User signed up to create their own church - go to onboarding
      router.replace('/onboarding/step-1');
    }
  }, [isLoaded, userInvitations, userMemberships, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoaderOne />
    </div>
  );
}