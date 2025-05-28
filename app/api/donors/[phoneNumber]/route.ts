import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateDonorParams {
  params: {
    phoneNumber: string;
  };
}

export async function PUT(request: NextRequest, { params }: UpdateDonorParams) {
  try {
    const { phoneNumber: encodedPhoneNumber } = params;
    // The phoneNumber from the route is URL-encoded (e.g., + becomes %2B)
    // We need to decode it to get the actual E.164 formatted number.
    const phoneNumber = decodeURIComponent(encodedPhoneNumber);

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      addressLine1,
      addressCity,
      addressState,
      addressPostalCode,
      addressCountry,
    } = body;

    // Basic E.164 format validation for the path parameter
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format in URL.' }, { status: 400 });
    }

    // Construct the data object with only the fields that are provided in the body
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email; // Consider email format validation
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressCity !== undefined) updateData.addressCity = addressCity;
    if (addressState !== undefined) updateData.addressState = addressState;
    if (addressPostalCode !== undefined) updateData.addressPostalCode = addressPostalCode;
    if (addressCountry !== undefined) updateData.addressCountry = addressCountry;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields provided for update.' }, { status: 400 });
    }

    const updatedDonor = await prisma.donor.update({
      where: { phoneNumber },
      data: updateData,
    });

    return NextResponse.json({ success: true, donor: updatedDonor });

  } catch (error: any) {
    console.error('Error updating donor:', error);
    if (error.code === 'P2025') { // Prisma error code for 'Record to update not found.'
      return NextResponse.json({ success: false, error: 'Donor not found.' }, { status: 404 });
    }
    // Potentially handle other Prisma errors like P2002 if email were made unique and an update conflicts
    return NextResponse.json({ success: false, error: 'Failed to update donor.' }, { status: 500 });
  }
}
