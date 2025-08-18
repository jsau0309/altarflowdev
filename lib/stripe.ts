import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set in environment variables. Webhook verification will fail.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil' as any, // Required API version - using 'as any' until Stripe types are updated
  typescript: true,
  appInfo: {
    name: 'AltarFlow', // Your application name
    version: '1.0.0', // Your application version
  },
});

// Helper function to get the base URL for webhooks
export function getBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Helper to construct webhook endpoint URL
export function getWebhookUrl() {
  return `${getBaseUrl()}/api/webhooks/stripe`;
}
