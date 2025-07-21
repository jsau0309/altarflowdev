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

// Define invitation acceptance route
const isInvitationRoute = createRouteMatcher([
  '/invitation-pending',
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

  // Allow invitation pending route
  if (isInvitationRoute(req)) {
    return NextResponse.next()
  }

  // If user has no organization and not on onboarding, check for invitations
  if (!orgId && !isOnboardingRoute(req)) {
    // Redirect to invitation-pending page which will handle the logic
    return NextResponse.redirect(new URL('/invitation-pending', req.url))
  }

  // Allow all onboarding routes to proceed
  if (isOnboardingRoute(req)) {
    return NextResponse.next()
  }

  // For now, we'll handle onboarding checks in the individual pages
  // This avoids the middleware trying to make fetch requests
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