// app/page.tsx (Server Component)
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

// This page now acts as the main entry router based on auth/onboarding state
export default async function RootPage() {
  console.log('[RootPage] Running check...');
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (!sessionError && session?.user) {
    // User is authenticated, check profile
    console.log(`[RootPage] User ${session.user.id} is authenticated. Checking profile...`);
    try {
      const userProfile = await prisma.profile.findUnique({
        where: { id: session.user.id },
        select: { onboardingComplete: true },
      });

      if (userProfile?.onboardingComplete) {
        console.log('[RootPage] Onboarding complete. Redirecting to /dashboard.');
        redirect('/dashboard');
      } else {
        // Profile exists but onboarding not complete, or profile doesn't exist yet (edge case)
        console.log(`[RootPage] Onboarding incomplete (Profile found: ${!!userProfile}). Redirecting to /onboarding/step-1.`);
        redirect('/onboarding/step-1');
      }
    } catch (dbError) {
      console.error(`[RootPage] Error fetching profile for user ${session.user.id}:`, dbError);
      // Fallback: Redirect to login or show error page?
      // For now, let's allow rendering the basic page content.
    }
  }

  // User is not authenticated, render landing page content
  console.log('[RootPage] User not authenticated. Rendering landing page content.');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Altarflow</h1>
      <p className="text-lg text-muted-foreground">
        Please log in or sign up to continue.
      </p>
      {/* TODO: Add actual landing page content and links to /login, /signup */}
    </main>
  );
}
