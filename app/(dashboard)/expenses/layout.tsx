import type React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();
  
  if (orgId) {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { subscriptionStatus: true }
    });

    // Redirect free and grace_period users to upgrade
    if (church && (church.subscriptionStatus === 'free' || 
                   church.subscriptionStatus === 'grace_period')) {
      redirect('/settings?tab=account&upgrade=true');
    }
  }
  
  return <>{children}</>;
}