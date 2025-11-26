/**
 * Environment validation check
 * This file is imported early to validate all environment variables
 * before the application starts, preventing runtime errors
 *
 * Note: This bootstrap file runs before the logger is available,
 * so we use console directly here. This is intentional.
 */

/* eslint-disable no-console */

import { validateServerEnv, validateClientEnv } from './env';

// Only validate server env on the server side
if (typeof window === 'undefined') {
  // Skip validation during build if SKIP_ENV_VALIDATION is set
  if (process.env.SKIP_ENV_VALIDATION !== '1') {
    console.log('Validating environment variables...');

    try {
      validateServerEnv();
      console.log('Server environment variables validated successfully');
    } catch (error) {
      console.error('Server environment validation failed');
      console.error(error);
      // In production, we want to fail fast
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    try {
      validateClientEnv();
      console.log('Client environment variables validated successfully');
    } catch (error) {
      console.error('Client environment validation failed');
      console.error(error);
      // In production, we want to fail fast
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  } else {
    console.log('Environment validation skipped (SKIP_ENV_VALIDATION=1)');
  }
}
