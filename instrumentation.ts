/**
 * Next.js Instrumentation
 * This file runs before the Next.js server starts
 * Perfect place for environment validation and other initialization
 */

export async function register() {
  // Validate environment variables before starting the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env-check');
  }
}