/**
 * Handles deprecated webhook POST requests by returning a 410 Gone response with instructions to use the new consolidated webhook endpoint.
 *
 * This endpoint no longer processes any webhook events and exists only to inform clients of its deprecation.
 * @returns An HTTP response with status 410 and a JSON payload indicating deprecation and the new endpoint location.
 */

export async function POST() {
  console.warn('[Deprecated Webhook] Request received at /api/webhooks/route - this endpoint is deprecated');
  return new Response(
    JSON.stringify({ 
      error: 'This webhook endpoint is deprecated', 
      message: 'Please use /api/webhooks/stripe instead',
      status: 'gone'
    }), 
    { 
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}