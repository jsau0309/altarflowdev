import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';

/**
 * Get a configured Stripe instance with proper error handling
 * This ensures we never crash due to missing environment variables
 */
export function getStripeInstance(): Stripe {
  const apiKey = serverEnv.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error('Stripe API key is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  
  return new Stripe(apiKey, {
    apiVersion: '2025-07-30.basil' as any,
    typescript: true,
    maxNetworkRetries: 2,
    appInfo: {
      name: 'AltarFlow',
      version: '1.0.0',
    },
  });
}

/**
 * Get Stripe webhook secret with proper error handling
 */
export function getStripeWebhookSecret(): string {
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;
  
  if (!secret) {
    throw new Error('Stripe webhook secret is not configured. Please set STRIPE_WEBHOOK_SECRET environment variable.');
  }
  
  return secret;
}