import { z } from 'zod';

// Stripe Connect validation schemas
export const createConnectAccountSchema = z.object({
  churchId: z.string().uuid('Invalid church ID format'),
  email: z.string().email('Invalid email format'),
  country: z.string().length(2).regex(/^[A-Z]{2}$/, 'Country must be 2-letter ISO code (e.g., US)')
});

export const stripeAccountIdSchema = z.string().regex(/^acct_[a-zA-Z0-9]+$/, 'Invalid Stripe account ID format');

// Donation validation schemas
export const donationAmountSchema = z.number()
  .int('Amount must be an integer (in cents)')
  .positive('Amount must be positive')
  .max(99999999, 'Amount exceeds maximum allowed'); // $999,999.99 max

export const donorPhoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const donorEmailSchema = z.string().email('Invalid email format').optional();

export const createDonationSchema = z.object({
  idempotencyKey: z.string().uuid('Invalid idempotency key'),
  churchId: z.string().uuid('Invalid church ID'),
  donationTypeId: z.string().trim().min(1, 'Donation type ID required'),
  baseAmount: donationAmountSchema,
  currency: z.string().length(3).toLowerCase().default('usd'),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  donorEmail: donorEmailSchema,
  phone: donorPhoneSchema.optional(),
  addressLine2: z.string().max(200).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  address: z.object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(2).optional(),
  }).optional(),
  isAnonymous: z.boolean().default(false),
  coverFees: z.boolean().optional(),
  donorId: z.string().uuid().optional(),
});

// OTP validation schemas
export const otpCheckSchema = z.object({
  phoneNumber: donorPhoneSchema,
  code: z.string().regex(/^\d{4,6}$/, 'OTP must be 4-6 digits'),
  churchId: z.string().uuid('Invalid church ID')
});

// Webhook validation
export const webhookEventIdSchema = z.string().regex(/^evt_[a-zA-Z0-9]+$/, 'Invalid event ID');

// Helper function to validate and sanitize input
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    throw error;
  }
}

// Sanitize error messages for production
export function sanitizeErrorMessage(error: unknown, isDevelopment: boolean = false): string {
  if (isDevelopment && error instanceof Error) {
    return error.message;
  }
  
  // Generic messages for production
  if (error instanceof z.ZodError) {
    return 'Invalid request data';
  }
  
  if (error instanceof Error) {
    // Don't expose internal error details in production
    if (error.message.includes('Stripe')) {
      return 'Payment processing error';
    }
    if (error.message.includes('Database') || error.message.includes('Prisma')) {
      return 'Database operation failed';
    }
    if (error.message.includes('Church not found')) {
      return 'Organization not found';
    }
  }
  
  return 'An error occurred processing your request';
}