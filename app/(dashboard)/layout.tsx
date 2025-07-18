import type React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ClientDashboardLayout from './_client-layout'; 

export default async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    console.log('[ServerDashboardLayout] No userId found, redirecting to /signin');
    redirect('/signin');
  }

  // Check if organization has active subscription
  if (orgId) {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { subscriptionStatus: true }
    });

    // If church exists but hasn't paid yet, redirect to settings account tab
    if (church && church.subscriptionStatus === 'pending_payment') {
      redirect('/settings?tab=account');
    }
  }

  console.log(`[ServerDashboardLayout] Rendering for user ${userId}...`);
  
  return (
    <ClientDashboardLayout>{children}</ClientDashboardLayout>
  );
}