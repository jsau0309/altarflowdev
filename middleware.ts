import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/api/donations/initiate(.*)',
  '/api/webhooks/stripe(.*)',
  // Add any other routes that should be publicly accessible, e.g.:
  // '/sign-in(.*)',
  // '/sign-up(.*)',
  // '/public-page',
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    // If the route is public, allow the request to proceed.
    // No explicit action is needed from Clerk to protect it.
    return; 
  }
  // For any other route not matched by isPublicRoute,
  // Clerk's default behavior will be to protect it.
  // No explicit auth().protect() call is needed here.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
