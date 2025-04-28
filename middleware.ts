import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// Standard Supabase SSR middleware
export async function middleware(request: NextRequest) {
  // Create the response object to be potentially modified
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // --- Debug: Log incoming cookies ---
  // console.log("Middleware received cookies:", request.cookies.getAll());
  // --- End Debug ---

  // Log the variables BEFORE creating the client
  // console.log("Middleware SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  // console.log("Middleware ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "Missing or Empty"); // Log existence, not the key itself

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Updated 'set' handler based on Supabase examples
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        // Updated 'remove' handler based on Supabase examples
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session - use getUser() as it includes session refresh
  await supabase.auth.getUser()

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
