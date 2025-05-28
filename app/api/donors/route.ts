import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      addressLine1,
      addressCity,
      addressState,
      addressPostalCode,
      addressCountry,
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number is required.' }, { status: 400 });
    }

    // Basic E.164 format validation for phoneNumber
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890).' }, { status: 400 });
    }

    // Optional: Add more validation for other fields if necessary

    const newDonor = await prisma.donor.create({
      data: {
        phoneNumber,
        firstName,
        lastName,
        email,
        addressLine1,
        addressCity,
        addressState,
        addressPostalCode,
        addressCountry,
      },
    });

    return NextResponse.json({ success: true, donor: newDonor }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating donor:', error);
    // Check for specific Prisma errors, e.g., unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
      return NextResponse.json({ success: false, error: 'A donor with this phone number already exists.' }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ success: false, error: 'Failed to create donor.' }, { status: 500 });
  }
}
