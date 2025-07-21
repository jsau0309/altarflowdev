'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList, useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function InvitationPendingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { userMemberships, isLoaded, userInvitations } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
    userInvitations: {
      infinite: true,
    },
  });
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Check if user has any organization memberships
    if (userMemberships && userMemberships.data && userMemberships.data.length > 0) {
      // User is part of an organization - they accepted the invitation!
      console.log('User has organization membership, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Check if there are pending invitations
    if (userInvitations && userInvitations.data && userInvitations.data.length > 0) {
      console.log('User has pending invitations:', userInvitations.data.length);
      // Don't redirect yet - let them see the invitation in Clerk's UI
      // Clerk should show the invitation acceptance UI automatically
      return;
    }

    // No memberships and no invitations
    if (checkCount > 2) {
      // After a few checks, assume no invitation exists
      console.log('No invitations found after multiple checks, redirecting to onboarding');
      router.push('/onboarding/welcome');
      return;
    }

    // Keep checking for a bit in case the invitation is still loading
    const timer = setTimeout(() => {
      setCheckCount(prev => prev + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLoaded, user, userMemberships, userInvitations, checkCount, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/Altarflow.svg"
              alt="AltarFlow Logo"
              width={150}
              height={45}
              className="h-10 w-auto"
            />
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Setting Up Your Account
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {userInvitations && userInvitations.data && userInvitations.data.length > 0
              ? 'Please accept your organization invitation to continue...'
              : 'Please wait while we check your access...'}
          </p>
        </div>
      </div>
    </div>
  );
}