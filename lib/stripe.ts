import Stripe from 'stripe';
import { logger } from '@/lib/logger';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  logger.warn('STRIPE_WEBHOOK_SECRET is not set - webhook verification will fail', { operation: 'stripe.init.missing_webhook_secret' });
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API version not in Stripe types yet
  apiVersion: '2025-07-30.basil' as any,
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
