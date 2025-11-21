import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Use shared prisma client
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      addressLine1,
      city,        // Renamed from addressCity
      state,       // Renamed from addressState
      postalCode,  // Renamed from addressPostalCode
      country,     // Renamed from addressCountry
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number is required.' }, { status: 400 });
    }

    // Basic E.164 format validation for phoneNumber
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890).' }, { status: 400 });
    }

    const donorData = {
      firstName,
      lastName,
      email: email || null, // Ensure email is null if empty
      addressLine1,
      city,
      state,
      postalCode,
      country,
      isPhoneVerified: true, // Phone is verified in this flow
      // phoneNumber will be used in the where clause for upsert
    };

    // Debug logging removed: donor upsert operation details

    const donor = await prisma.donor.upsert({
      where: { phone: phoneNumber }, // Correct: Use 'phone' for the where clause
      update: donorData,
      create: {
        phone: phoneNumber, // Correct: Use 'phone' for the create clause
        ...donorData,
        updatedAt: new Date(),
      },
    });

    // Debug logging removed: donor upsert result

    return NextResponse.json({ success: true, donor: donor }, { status: donor ? 200 : 201 }); // 200 if updated, 201 if created

  } catch (error) {
    logger.error('Error creating/updating donor:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    // P2002 can still occur if email is unique and conflicts during an update where phoneNumber didn't match an existing record.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        let conflictField = 'unknown';
        if ('meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta) {
          const target = error.meta.target;
          if (Array.isArray(target)) {
            if (target.includes('phone')) conflictField = 'phone number';
            else if (target.includes('email')) conflictField = 'email address';
          }
        }
      return NextResponse.json({ success: false, error: `A donor with this ${conflictField} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create or update donor.' }, { status: 500 });
  }
}