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
  const [hasMinTimeElapsed, setHasMinTimeElapsed] = useState(false);

  // Ensure the loading screen shows for at least 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinTimeElapsed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user || !hasMinTimeElapsed) return;

    // Check if user has any organization memberships
    if (userMemberships && userMemberships.data && userMemberships.data.length > 0) {
      // User is part of an organization - they accepted the invitation!
      console.log('User has organization membership, redirecting to dashboard');
      // Add a small delay for smooth transition
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
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
  }, [isLoaded, user, userMemberships, userInvitations, checkCount, router, hasMinTimeElapsed]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative max-w-md mx-auto px-4 py-12">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 rounded-full"></div>
              <Image
                src="/images/Altarflow.svg"
                alt="AltarFlow Logo"
                width={180}
                height={54}
                className="h-12 w-auto relative"
              />
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
              {/* Inner icon */}
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {userMemberships && userMemberships.data && userMemberships.data.length > 0
                ? 'Almost there!'
                : 'Welcome to AltarFlow!'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
              {userMemberships && userMemberships.data && userMemberships.data.length > 0
                ? 'We\'re setting up your access to the organization. This will just take a moment...'
                : userInvitations && userInvitations.data && userInvitations.data.length > 0
                ? 'Please accept your organization invitation to continue to your dashboard.'
                : 'We\'re checking your organization access. Please wait a moment...'}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mt-8 flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Having trouble? Contact your church administrator for help.
        </p>
      </div>
    </div>
  );
}