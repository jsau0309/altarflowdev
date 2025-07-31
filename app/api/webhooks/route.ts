/**
 * @deprecated This webhook endpoint has been replaced by /api/webhooks/stripe
 * 
 * The old implementation used Supabase admin functions that no longer exist.
 * The new consolidated webhook at /api/webhooks/stripe handles both:
 * - Platform subscriptions (with email quota updates)
 * - Church donation payments (via Stripe Connect)
 * 
 * Please update your Stripe webhook configuration to use:
 * https://yourdomain.com/api/webhooks/stripe
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