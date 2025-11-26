/**
 * Extended Stripe types for API features not yet in TypeScript definitions
 * These types handle settings.emails which is valid in the API but not in @stripe/stripe-js types
 */

import type Stripe from 'stripe';

/**
 * Extended Connect account settings including email configuration
 * The emails.customer.enabled setting is valid in the API but not in TypeScript definitions
 */
interface ExtendedAccountSettings {
  payments?: {
    statement_descriptor?: string;
    statement_descriptor_kana?: string;
    statement_descriptor_kanji?: string;
  };
  payouts?: Stripe.AccountCreateParams['settings'] extends { payouts?: infer P } ? P : never;
  branding?: Stripe.AccountCreateParams['settings'] extends { branding?: infer B } ? B : never;
  card_issuing?: Stripe.AccountCreateParams['settings'] extends { card_issuing?: infer C } ? C : never;
  treasury?: Stripe.AccountCreateParams['settings'] extends { treasury?: infer T } ? T : never;
  /** Email settings - valid in API but not in TypeScript definitions */
  emails?: {
    customer?: {
      enabled: boolean;
    };
  };
}

/**
 * Extended params for Stripe Connect account creation
 * Includes settings.emails which is valid in the API
 */
export interface StripeConnectAccountCreateParams extends Omit<Stripe.AccountCreateParams, 'settings'> {
  settings?: ExtendedAccountSettings;
}

/**
 * Extended params for Stripe Connect account update
 * Includes settings.emails which is valid in the API
 */
export interface StripeConnectAccountUpdateParams extends Omit<Stripe.AccountUpdateParams, 'settings'> {
  settings?: ExtendedAccountSettings;
}

/**
 * Type for Stripe API version that may not be in types yet
 * Used when we need to specify a newer API version
 */
export type StripeApiVersion = string;

/**
 * Extended Stripe options with API version override
 */
export interface ExtendedStripeOptions extends Omit<Stripe.StripeConfig, 'apiVersion'> {
  apiVersion?: StripeApiVersion;
}
