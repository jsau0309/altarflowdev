// app/(dashboard)/layout.tsx (Server Component)

import type React from 'react';
import { auth } from '@clerk/nextjs/server'; // <-- Import Clerk auth
import { redirect } from 'next/navigation'; // <-- Import redirect
// Removed unused imports: cookies, headers, createServerClient, prisma

// Import the client layout component
import ClientDashboardLayout from './_client-layout'; 

// Make the layout an async function
export default async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  // Get userId, awaiting the auth() call
  const { userId } = await auth(); 

  // If no userId, redirect to sign-in
  if (!userId) {
    console.log('[ServerDashboardLayout] No userId found, redirecting to /signin');
    redirect('/signin');
  }

  // If userId exists, the user is authenticated.
  console.log(`[ServerDashboardLayout] Rendering for user ${userId}...`);
  
  return (
    <ClientDashboardLayout>{children}</ClientDashboardLayout>
  );
}

