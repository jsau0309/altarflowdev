import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in cookies
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return token;
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_NAME);
  return token?.value || null;
}

/**
 * Verify CSRF token from request headers
 */
export async function verifyCSRFToken(request: Request): Promise<boolean> {
  // Skip CSRF check for GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    console.error('CSRF token missing from headers');
    return false;
  }

  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    console.error('CSRF token missing from cookies');
    return false;
  }

  const isValid = headerToken === cookieToken;
  if (!isValid) {
    console.error('CSRF token mismatch');
  }

  return isValid;
}

/**
 * Middleware to check CSRF token
 */
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Skip CSRF check for webhooks (they have their own signature verification)
  if (request.url.includes('/api/webhooks/')) {
    return null;
  }

  // Skip for public API endpoints that don't modify state
  if (request.url.includes('/api/public/')) {
    return null;
  }

  const isValid = await verifyCSRFToken(request);
  if (!isValid && request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}