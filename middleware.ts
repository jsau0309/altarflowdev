import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// Standard Supabase SSR middleware
export async function middleware(request: NextRequest) {
  // Create the response object ONCE
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // --- Debug: Log incoming cookies ---
  console.log("Middleware received cookies:", request.cookies.getAll());
  // --- End Debug ---

  // Log the variables BEFORE creating the client
  console.log("Middleware SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Middleware ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "Missing or Empty"); // Log existence, not the key itself

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie directly on the response created at the beginning
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Delete cookie directly from the response created at the beginning
          response.cookies.delete({
            name,
            ...options,
          }) // Use delete for removal
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession()

  // Optional Route Protection can be added here later
  // ...

  return response
}

// Matcher config remains the same
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
