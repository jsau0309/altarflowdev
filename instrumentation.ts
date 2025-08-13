/**
 * Next.js Instrumentation
 * This file runs before the Next.js server starts
 * Perfect place for environment validation and other initialization
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Initialize Sentry based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables before starting the server
    await import('./lib/env-check');
    
    // Initialize Sentry for Node.js runtime
    await import('./sentry.server.config');
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for Edge runtime
    await import('./sentry.edge.config');
  }
}

// Handle errors from nested React Server Components
export async function onRequestError(
  error: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  Sentry.captureRequestError(error, request, context);
}