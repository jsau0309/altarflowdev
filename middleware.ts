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
  '/unsubscribe(.*)',
  '/api/communication/unsubscribe(.*)',
  '/api/communication/resubscribe(.*)',
  '/',
  '/waitlist-full',
  '/book-demo',
  '/privacy-policy',
  '/terms-of-service',
])

// Define onboarding routes
const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)',
])

// Define invitation acceptance route
const isInvitationRoute = createRouteMatcher([
  '/invitation-pending',
  '/after-signup',
])


export default clerkMiddleware(async (auth, req) => {
  // Check for signup page access without invitation
  if (req.nextUrl.pathname === '/signup') {
    const hasInvitation = req.nextUrl.searchParams.has('__clerk_ticket');
    
    // If no invitation ticket, redirect to waitlist
    if (!hasInvitation) {
      return NextResponse.redirect(new URL('/waitlist-full', req.url));
    }
  }
  
  // Skip checks for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  const { userId, orgId, sessionClaims } = await auth()

  // Not authenticated - Clerk will handle redirect
  if (!userId) {
    return NextResponse.next()
  }

  // Allow invitation pending route
  if (isInvitationRoute(req)) {
    return NextResponse.next()
  }

  // Check if this is a fresh sign-in (coming from Clerk's sign-in flow)
  // Exclude Stripe billing portal from being treated as sign-in
  const referer = req.headers.get('referer') || '';
  const isFromStripe = referer.includes('billing.stripe.com') || referer.includes('checkout.stripe.com');
  const isFromSignIn = !isFromStripe && (
                      referer.includes('/signin') || 
                      referer.includes('clerk.') ||
                      req.nextUrl.searchParams.has('__clerk_status')
                      )
  const isFromSignUp = referer.includes('/signup') || req.nextUrl.searchParams.has('__clerk_status')

  // If user has no organization and not on onboarding
  if (!orgId && !isOnboardingRoute(req)) {
    
    // If coming from signup, check the path they're trying to access
    if (req.nextUrl.pathname === '/invitation-pending') {
      // They're trying to go to invitation-pending, let them
      return NextResponse.next()
    }
    
    // Default: redirect to onboarding for church creation
    // The invitation-pending page will handle checking for pending invitations
    return NextResponse.redirect(new URL('/onboarding/step-1', req.url))
  }

  // If user HAS an organization and just signed up (invited member case)
  if (orgId && isFromSignUp && !isOnboardingRoute(req) && !req.nextUrl.pathname.startsWith('/dashboard')) {
    // They just accepted an invitation and joined an existing org
    // Send them to dashboard - the dashboard will check if church onboarding is complete
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Allow all other routes to proceed
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