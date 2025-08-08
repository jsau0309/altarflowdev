'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';
import LoaderOne from '@/components/ui/loader-one';

export default function AfterSignupPage() {
  const router = useRouter();
  const { isLoaded, userInvitations } = useOrganizationList({
    userInvitations: {
      infinite: true,
    },
  });

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user has pending organization invitations
    if (userInvitations && userInvitations.data && userInvitations.data.length > 0) {
      // User was invited to join an existing church - go to invitation pending
      // The invitation-pending page will handle acceptance and then route to dashboard
      // The dashboard will check if the church has completed onboarding
      router.replace('/invitation-pending');
    } else {
      // User signed up to create their own church - go to onboarding
      router.replace('/onboarding/step-1');
    }
  }, [isLoaded, userInvitations, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoaderOne />
    </div>
  );
}