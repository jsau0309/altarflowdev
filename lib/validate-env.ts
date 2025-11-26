/**
 * Environment variable validation for production
 * This ensures all required env vars are present at startup
 *
 * Note: This runs during bootstrap before logger is available.
 */

/* eslint-disable no-console */

interface RequiredEnvVars {
  // Database
  DATABASE_URL: string;
  DIRECT_URL: string;
  
  // Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Email
  RESEND_API_KEY: string;
  
  // Storage
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  
  // Application
  NEXT_PUBLIC_APP_URL: string;
  
  // Optional but recommended for production
  SENTRY_DSN?: string;
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  
  // SMS (Twilio)
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  
  // AI
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Cron
  CRON_SECRET?: string;
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

/**
 * Validates that all required environment variables are present
 * Call this at application startup
 */
export function validateEnvironment(): void {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];

  const missingVars: string[] = [];
  const emptyVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (value === undefined) {
      missingVars.push(varName);
    } else if (value.trim() === '') {
      emptyVars.push(varName);
    }
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    const productionVars: (keyof RequiredEnvVars)[] = [
      'SENTRY_DSN',
      'CRON_SECRET',
    ];

    for (const varName of productionVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      }
    }
  }

  // Build error message
  const errors: string[] = [];
  
  if (missingVars.length > 0) {
    errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  if (emptyVars.length > 0) {
    errors.push(`Empty environment variables: ${emptyVars.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new EnvironmentError(
      `Environment validation failed:\n${errors.join('\n')}\n\n` +
      `Please ensure all required environment variables are set in your .env file or deployment configuration.`
    );
  }

  // Validate format of certain env vars
  validateFormats();

  console.log('Environment variables validated successfully');
}

/**
 * Validates the format of certain environment variables
 */
function validateFormats(): void {
  const formatErrors: string[] = [];

  // Validate URLs
  const urlVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const varName of urlVars) {
    const value = process.env[varName];
    if (value) {
      try {
        new URL(value);
      } catch {
        formatErrors.push(`${varName} is not a valid URL: ${value}`);
      }
    }
  }

  // Validate Stripe keys format
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    formatErrors.push('STRIPE_SECRET_KEY should start with "sk_"');
  }

  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    formatErrors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with "pk_"');
  }

  // Validate Clerk keys format
  if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
    formatErrors.push('CLERK_SECRET_KEY should start with "sk_"');
  }

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
    formatErrors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with "pk_"');
  }

  if (formatErrors.length > 0) {
    throw new EnvironmentError(
      `Environment variable format validation failed:\n${formatErrors.join('\n')}`
    );
  }
}

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: keyof RequiredEnvVars): string {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    throw new EnvironmentError(
      `Required environment variable ${key} is not set or is empty`
    );
  }
  
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

// Export type for use in other files
export type { RequiredEnvVars };