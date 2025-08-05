import type React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ClientDashboardLayout from './_client-layout';
import AuthWrapper from './auth-wrapper'; 

export default async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();
  
  // Don't redirect immediately - let client-side handle it
  if (!userId) {
    console.log('[ServerDashboardLayout] No userId found, will let client handle redirect');
    return (
      <AuthWrapper>
        <ClientDashboardLayout>{children}</ClientDashboardLayout>
      </AuthWrapper>
    );
  }

  // Check if church exists and handle access control
  if (orgId) {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { 
        subscriptionStatus: true,
        trialEndsAt: true,
        onboardingCompleted: true,
        onboardingStep: true,
      }
    });

    // Check onboarding status first
    if (!church || !church.onboardingCompleted) {
      const step = church?.onboardingStep || 1;
      console.log(`[ServerDashboardLayout] Onboarding not completed, redirecting to step ${step}`);
      redirect(`/onboarding/step-${step}`);
    }

    // If church is in trial and trial has expired, update status
    if (church && church.subscriptionStatus === 'trial' && church.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(church.trialEndsAt);
      
      if (now > trialEnd) {
        // Trial has expired, update status to pending_payment
        await prisma.church.update({
          where: { clerkOrgId: orgId },
          data: { subscriptionStatus: 'pending_payment' }
        });
        // Trial expired, status updated to pending_payment
      }
    }
  } else {
    // No organization, redirect to onboarding
    console.log('[ServerDashboardLayout] No orgId found, redirecting to onboarding welcome');
    redirect('/onboarding/welcome');
  }

  // Server-side layout rendering
  
  return (
    <ClientDashboardLayout>{children}</ClientDashboardLayout>
  );
}