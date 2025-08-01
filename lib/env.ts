import { z } from 'zod';

/**
 * Server-side environment variables schema
 * These are validated at runtime to ensure all required env vars are present
 */
const serverEnvSchema = z.object({
  // Database
  // DATABASE_URL is handled by Prisma from prisma/.env
  
  // Authentication (Clerk)
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),
  CLERK_BILLING_WEBHOOK_SECRET: z.string().optional(),
  
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  
  // Email Service
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().min(1).default('AltarFlow <hello@altarflow.com>'),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_BOUNCE_THRESHOLD: z.string().transform(Number).pipe(z.number().min(1)).default('5'),
  HARD_BOUNCE_UNSUBSCRIBE: z.string().transform(val => val === 'true').default('true'),
  
  // Payment Processing
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_SECRET_KEY_LIVE: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  
  // SMS Service (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  
  // AI Service
  OPENAI_API_KEY: z.string().optional(),
  
  // Receipt Scanning
  MINDEE_API_KEY: z.string().optional(),
  
  // Cron Jobs
  CRON_SECRET: z.string().optional(),
  
  // Development/Testing
  ENABLE_TEST_MODE: z.string().transform(val => val === 'true').default('false'),
  SKIP_WEBHOOK_VERIFICATION: z.string().transform(val => val === 'true').default('false'),
  
  // Runtime Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_URL: z.string().optional(),
  PORT: z.string().optional().default('3000'),
});

/**
 * Client-side environment variables schema
 * These are prefixed with NEXT_PUBLIC_ and exposed to the browser
 */
const clientEnvSchema = z.object({
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
  
  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/invitation-pending'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE: z.string().optional(),
  NEXT_PUBLIC_STRIPE_MONTHLY_LINK: z.string().optional(),
  NEXT_PUBLIC_STRIPE_ANNUAL_LINK: z.string().optional(),
  
  // Third-party Services
  NEXT_PUBLIC_CRISP_WEBSITE_ID: z.string().optional(),
  NEXT_PUBLIC_TOPOL_API_KEY: z.string().optional(),
});

/**
 * Validates server environment variables
 * This should be called early in the application lifecycle
 */
export function validateServerEnv() {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment variables. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Validates client environment variables
 */
export function validateClientEnv() {
  try {
    return clientEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid client environment variables:');
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid client environment variables. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Get validated environment variables with type safety
 * Use this instead of process.env to ensure all required vars are present
 */
export const serverEnv = process.env.SKIP_ENV_VALIDATION === '1' 
  ? (process.env as unknown as ServerEnv)
  : validateServerEnv();

export const clientEnv = process.env.SKIP_ENV_VALIDATION === '1'
  ? (process.env as unknown as ClientEnv)  
  : validateClientEnv();

/**
 * Combined env object for convenience
 * Server-side only - includes both server and client vars
 */
export const env = {
  ...serverEnv,
  ...clientEnv,
} as const;

// Type exports for use throughout the app
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = typeof env;

/**
 * Safe environment variable getter
 * Use this when you need to access env vars that might not be validated
 * or when running in contexts where validation might be skipped
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}