import { z } from 'zod';

// Email validation schema using Zod
const emailSchema = z.string().email();

// More comprehensive email validation regex
// This regex follows RFC 5322 standard for email validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  reason?: string;
}

/**
 * Validates a single email address
 */
export function validateEmail(email: string): EmailValidationResult {
  // Check if email is empty or undefined
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      email: email || '',
      reason: 'Email address is required',
    };
  }

  // Trim whitespace
  const trimmedEmail = email.trim().toLowerCase();

  // Check length constraints
  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Email address is too long (max 254 characters)',
    };
  }

  // Check basic format using Zod
  try {
    emailSchema.parse(trimmedEmail);
  } catch {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Invalid email format',
    };
  }

  // Additional validation using regex
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Invalid email format',
    };
  }

  // Check for common invalid patterns
  const [localPart, domain] = trimmedEmail.split('@');
  
  // Local part checks
  if (localPart.length > 64) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Local part too long (max 64 characters before @)',
    };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Email cannot start or end with a dot',
    };
  }

  if (localPart.includes('..')) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Email cannot contain consecutive dots',
    };
  }

  // Domain checks
  if (!domain || domain.length < 3) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Invalid domain',
    };
  }

  // Check for valid TLD
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      email: trimmedEmail,
      reason: 'Invalid top-level domain',
    };
  }

  return {
    isValid: true,
    email: trimmedEmail,
  };
}

/**
 * Validates multiple email addresses and returns valid and invalid lists
 */
export function validateEmailBatch(emails: string[]): {
  valid: string[];
  invalid: EmailValidationResult[];
} {
  const valid: string[] = [];
  const invalid: EmailValidationResult[] = [];

  for (const email of emails) {
    const result = validateEmail(email);
    if (result.isValid) {
      valid.push(result.email);
    } else {
      invalid.push(result);
    }
  }

  return { valid, invalid };
}