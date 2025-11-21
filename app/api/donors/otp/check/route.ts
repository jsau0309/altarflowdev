import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/db';
import { rateLimitByIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// SECURITY: Rate limit OTP verification to prevent brute force attacks
// Allow 5 attempts per 5 minutes PER PHONE NUMBER (not per IP)
const otpCheckLimiter = rateLimitByIdentifier({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts
});

export async function POST(request: NextRequest) {
  // Check Twilio configuration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    logger.error('Twilio environment variables are not fully configured.', { operation: 'api.error' });
    return NextResponse.json(
      { error: 'SMS service is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  // Initialize Twilio client only after validation
  const client = twilio(accountSid, authToken);
  try {
    const body = await request.json();
    const { phoneNumber, code, churchId } = body;

    if (!phoneNumber || !code) {
      return NextResponse.json({ success: false, error: 'Phone number and OTP code are required.' }, { status: 400 });
    }

    // SECURITY: Apply rate limiting per phone number to prevent brute force
    // Normalize phone number to prevent bypasses via formatting variations
    const normalizedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    const rateLimitResult = await otpCheckLimiter(normalizedPhone);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Too many verification attempts for this phone number. Please try again later.',
        resetTime: rateLimitResult.resetTime
      }, { status: 429 });
    }

    // Validate churchId for new donor creation
    if (!churchId) {
      return NextResponse.json({ success: false, error: 'Church ID is required.' }, { status: 400 });
    }

    if (!verifyServiceSid) {
      logger.error('Twilio Verify Service SID is not configured.', { operation: 'api.error' });
      return NextResponse.json({ success: false, error: 'Twilio configuration error.' }, { status: 500 });
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code: code });

    if (verificationCheck.status === 'approved') {
      // OTP is valid, check if donor exists globally (not per church)
      const existingDonor = await prisma.donor.findUnique({
        where: { 
          phone: phoneNumber
        },
      });

      if (existingDonor) {
        // Donor exists globally - they might be donating to a new church
        // Update their verification status if needed
        if (!existingDonor.isPhoneVerified) {
          await prisma.donor.update({
            where: { id: existingDonor.id },
            data: { isPhoneVerified: true }
          });
        }
        
        return NextResponse.json({
          success: true,
          isExistingDonor: true,
          donorData: existingDonor,
        });
      } else {
        // New donor: Create a donor record with the phone number
        // Note: We're NOT setting churchId here since donors are global
        const newDonor = await prisma.donor.create({
          data: {
            phone: phoneNumber,
            isPhoneVerified: true, // Phone is verified through OTP
            updatedAt: new Date(),
            // churchId is intentionally not set - donors are global
          },
        });
        return NextResponse.json({
          success: true,
          isExistingDonor: false,
          donorData: newDonor,
        });
      }
    } else {
      // OTP is invalid or another issue occurred
      return NextResponse.json({ success: false, error: 'Invalid OTP or verification failed. Status: ' + verificationCheck.status }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error checking OTP:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    let errorMessage = 'Failed to check OTP.';
    // Twilio errors have code and message properties
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      if (error.code === 60202 || (typeof error.message === 'string' && error.message.includes('VerificationCheck was not found'))) {
        errorMessage = 'Invalid or expired OTP. Please try sending a new one.';
      } else if (typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
