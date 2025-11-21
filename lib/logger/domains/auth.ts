/**
 * Authentication Domain Logger
 *
 * Specialized logger for authentication and authorization events.
 *
 * @example
 * ```typescript
 * import { authLogger } from '@/lib/logger/domains/auth';
 *
 * authLogger.loginSuccess({
 *   userId: 'user_123',
 *   orgId: 'org_123',
 *   method: 'clerk',
 *   ipAddress: '192.168.1.1'
 * });
 *
 * authLogger.accessDenied({
 *   userId: 'user_123',
 *   orgId: 'org_123',
 *   resource: 'donations',
 *   action: 'delete'
 * });
 * ```
 */

import { logger, LogContext } from '../index';

export type AuthMethod = 'clerk' | 'otp' | 'magic-link' | 'api-key' | 'webhook-signature';

export interface AuthLogContext extends LogContext {
  userId?: string;
  orgId?: string;
  churchId?: string;
  email?: string;
  emailDomain?: string; // Store domain instead of full email for privacy
  method?: AuthMethod;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  role?: string;
}

export const authLogger = {
  /**
   * Log successful login
   */
  loginSuccess: (context: AuthLogContext) => {
    logger.info('User logged in successfully', {
      operation: 'auth.login.success',
      ...context,
    });
  },

  /**
   * Log failed login attempt
   */
  loginFailed: (context: AuthLogContext, error?: Error) => {
    if (error) {
      logger.error('Login attempt failed', {
        operation: 'auth.login.failed',
        ...context,
      }, error);
    } else {
      logger.warn('Login attempt failed', {
        operation: 'auth.login.failed',
        ...context,
      });
    }
  },

  /**
   * Log logout
   */
  logout: (context: AuthLogContext) => {
    logger.info('User logged out', {
      operation: 'auth.logout',
      ...context,
    });
  },

  /**
   * Log session creation
   */
  sessionCreated: (context: AuthLogContext & { sessionId?: string; expiresAt?: string }) => {
    logger.info('Session created', {
      operation: 'auth.session.created',
      ...context,
    });
  },

  /**
   * Log session expiration
   */
  sessionExpired: (context: AuthLogContext & { sessionId?: string }) => {
    logger.info('Session expired', {
      operation: 'auth.session.expired',
      ...context,
    });
  },

  /**
   * Log access denied (authorization failure)
   */
  accessDenied: (context: AuthLogContext) => {
    logger.warn('Access denied', {
      operation: 'auth.access.denied',
      ...context,
    });
  },

  /**
   * Log successful authorization
   */
  accessGranted: (context: AuthLogContext) => {
    logger.debug('Access granted', {
      operation: 'auth.access.granted',
      ...context,
    });
  },

  /**
   * Log password reset request
   */
  passwordResetRequested: (context: AuthLogContext) => {
    logger.info('Password reset requested', {
      operation: 'auth.password_reset.requested',
      ...context,
    });
  },

  /**
   * Log password reset completion
   */
  passwordResetCompleted: (context: AuthLogContext) => {
    logger.info('Password reset completed', {
      operation: 'auth.password_reset.completed',
      ...context,
    });
  },

  /**
   * Log OTP sent
   */
  otpSent: (context: AuthLogContext & { phoneNumber?: string; phoneNumberLast4?: string }) => {
    logger.info('OTP sent', {
      operation: 'auth.otp.sent',
      ...context,
    });
  },

  /**
   * Log OTP verification success
   */
  otpVerified: (context: AuthLogContext) => {
    logger.info('OTP verified successfully', {
      operation: 'auth.otp.verified',
      ...context,
    });
  },

  /**
   * Log OTP verification failure
   */
  otpVerificationFailed: (context: AuthLogContext & { attemptsRemaining?: number }) => {
    logger.warn('OTP verification failed', {
      operation: 'auth.otp.verification_failed',
      ...context,
    });
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity: (context: AuthLogContext & { reason: string }) => {
    logger.error('Suspicious authentication activity detected', {
      operation: 'auth.suspicious_activity',
      ...context,
    });
  },

  /**
   * Log multi-tenant isolation violation attempt
   */
  isolationViolation: (context: AuthLogContext & { attemptedChurchId: string }) => {
    logger.error('Multi-tenant isolation violation attempted', {
      operation: 'auth.isolation_violation',
      ...context,
    });
  },
};
