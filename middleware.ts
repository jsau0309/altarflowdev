import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/signin(.*)',
  '/signup(.*)',
  '/api/webhooks(.*)',
  '/api/clerk-webhook(.*)',
  '/api/public(.*)',
  '/(.*)/nfc-landing(.*)',
  '/',
])

// Define onboarding routes
const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)',
])

// Define routes that require completed onboarding
const requiresOnboarding = createRouteMatcher([
  '/dashboard(.*)',
  '/members(.*)', 
  '/donations(.*)',
  '/funds(.*)',
  '/reports(.*)',
  '/expenses(.*)',
  '/banking(.*)',
  '/settings(.*)',
])

// Define protected API routes (that need onboarding)
const isProtectedApiRoute = createRouteMatcher([
  '/api/members(.*)',
  '/api/donations(.*)',
  '/api/funds(.*)',
  '/api/reports(.*)',
  '/api/expenses(.*)',
  '/api/banking(.*)',
  '/api/settings/church-details(.*)',
  '/api/settings/preferences(.*)',
  '/api/settings/complete-onboarding(.*)',
  '/api/settings/general(.*)',
  '/api/settings/landing(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Skip checks for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  const { userId, orgId } = await auth()

  // Not authenticated - Clerk will handle redirect
  if (!userId) {
    return NextResponse.next()
  }

  // If user has no organization and not on onboarding, redirect to onboarding
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding/welcome', req.url))
  }

  // If user has organization and tries to access protected routes
  if (orgId && (requiresOnboarding(req) || isProtectedApiRoute(req))) {
    try {
      // Check onboarding status in database
      const response = await fetch(new URL('/api/settings/onboarding-status', req.url), {
        headers: {
          'x-clerk-org-id': orgId,
          'x-clerk-user-id': userId,
        },
      })

      if (response.ok) {
        const { onboardingCompleted, onboardingStep } = await response.json()
        
        // If onboarding not completed
        if (!onboardingCompleted) {
          // For API routes, return 403 Forbidden
          if (isProtectedApiRoute(req)) {
            return NextResponse.json(
              { error: 'Onboarding not completed' },
              { status: 403 }
            )
          }
          // For regular routes, redirect to current step
          return NextResponse.redirect(new URL(`/onboarding/step-${onboardingStep}`, req.url))
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}