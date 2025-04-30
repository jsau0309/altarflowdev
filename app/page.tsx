// app/page.tsx (Server Component)

// Removed imports for prisma, redirect, auth

// This page now just renders the public landing content
export default async function RootPage() {
  console.log('[RootPage] Rendering public landing page.');

  // Removed all auth checks and redirect logic
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Altarflow</h1>
      <p className="text-lg text-muted-foreground">
        Please log in or sign up to continue.
      </p>
      {/* TODO: Add actual landing page content and links to /signin, /signup */}
    </main>
  );
}
