import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { logger } from '@/lib/logger';

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
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number is required.' }, { status: 400 });
    }

    if (!verifyServiceSid) {
      logger.error('Twilio Verify Service SID is not configured.', { operation: 'api.error' });
      return NextResponse.json({ success: false, error: 'Twilio configuration error.' }, { status: 500 });
    }

    // Basic E.164 format validation (you might want a more robust library for this)
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890).' }, { status: 400 });
    }

    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });

    // You might want to check verification.status here, though for sending, a successful API call is often enough.
    // Twilio will return a 201 Created status on successful initiation.
    // console.log('Twilio verification status:', verification.status);

    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });

  } catch (error) {
    logger.error('Error sending OTP:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    // Check for specific Twilio error codes if needed
    // Example: error.code === 20003 (Permission Denied - might be invalid SID/Token)
    // Example: error.code === 60200 (Invalid parameter - often phone number format)
    // Example: error.code === 60203 (Max send attempts reached)
    let errorMessage = 'Failed to send OTP.';
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      if (error.code === 60200) {
        errorMessage = 'Invalid phone number. Please check the format and try again.';
      } else if (typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
