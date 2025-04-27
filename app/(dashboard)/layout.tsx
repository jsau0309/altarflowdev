// app/(dashboard)/layout.tsx (Server Component)

import type React from 'react';
// Removed unused imports: cookies, headers, createServerClient, prisma, redirect

// Import the client layout component
import ClientDashboardLayout from './_client-layout'; 

export default async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  // Removed all Supabase/Prisma/redirect logic.
  // This layout now assumes the user is authenticated and onboarding is complete,
  // because the root page (app/page.tsx) handles routing them here.
  console.log('[ServerDashboardLayout] Rendering...');
  
  return (
    <ClientDashboardLayout>{children}</ClientDashboardLayout>
  );
}
