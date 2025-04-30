// app/page.tsx (Server Component)
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button"; // Assuming you use shadcn Button
import Link from "next/link";

// Removed imports for prisma, redirect, auth

// This page now just renders the public landing content
export default async function RootPage() {
  console.log('[RootPage] Rendering public landing page.');

  // Removed all auth checks and redirect logic
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Altarflow</h1>
      
      <SignedOut>
        <p className="text-lg text-muted-foreground mb-6">
          Please log in or sign up to continue.
        </p>
        <div className="flex gap-4">
          <SignInButton mode="modal">
             <Button variant="outline">Log In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
             <Button>Sign Up</Button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
         <p className="text-lg text-muted-foreground mb-6">
           You are signed in.
         </p>
         <Link href="/dashboard">
             <Button>Go to Dashboard</Button>
         </Link>
      </SignedIn>

      {/* TODO: Add actual landing page content */}
    </main>
  );
}
