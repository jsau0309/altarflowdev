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

  // Check if church exists and handle access control
  if (orgId) {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { 
        subscriptionStatus: true,
        trialEndsAt: true,
      }
    });

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
        console.log(`[ServerDashboardLayout] Trial expired for org ${orgId}, updated to pending_payment`);
      }
    }
  }

  console.log(`[ServerDashboardLayout] Rendering for user ${userId}...`);
  
  return (
    <ClientDashboardLayout>{children}</ClientDashboardLayout>
  );
}