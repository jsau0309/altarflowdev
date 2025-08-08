import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Check Twilio configuration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    console.error('Twilio environment variables are not fully configured.');
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

    // Validate churchId for new donor creation
    if (!churchId) {
      return NextResponse.json({ success: false, error: 'Church ID is required.' }, { status: 400 });
    }

    if (!verifyServiceSid) {
      console.error('Twilio Verify Service SID is not configured.');
      return NextResponse.json({ success: false, error: 'Twilio configuration error.' }, { status: 500 });
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code: code });

    if (verificationCheck.status === 'approved') {
      // OTP is valid, check if donor exists for this church
      const existingDonor = await prisma.donor.findFirst({
        where: { 
          phone: phoneNumber,
          churchId: churchId 
        },
      });

      if (existingDonor) {
        return NextResponse.json({
          success: true,
          isExistingDonor: true,
          donorData: existingDonor, // Changed key to donorData for consistency with frontend
        });
      } else {
        // New donor: Create a donor record with the phone number and churchId
        const newDonor = await prisma.donor.create({
          data: {
            phone: phoneNumber,
            churchId: churchId,
            isPhoneVerified: true, // Phone is verified through OTP
            // Other fields can be populated later or have defaults
          },
        });
        return NextResponse.json({
          success: true,
          isExistingDonor: false,
          donorData: newDonor, // Return the newly created donor's data (including ID)
        });
      }
    } else {
      // OTP is invalid or another issue occurred
      return NextResponse.json({ success: false, error: 'Invalid OTP or verification failed. Status: ' + verificationCheck.status }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error checking OTP:', error);
    let errorMessage = 'Failed to check OTP.';
    if (error.code === 60202 || error.message?.includes('VerificationCheck was not found')) { // 60202 is often 'No pending verification found'
        errorMessage = 'Invalid or expired OTP. Please try sending a new one.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
