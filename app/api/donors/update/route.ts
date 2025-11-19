import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema for donor update
const donorUpdateSchema = z.object({
  donorId: z.string().cuid('Invalid donor ID format'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  addressLine1: z.string().max(255, 'Address line 1 too long').optional().nullable(),
  addressLine2: z.string().max(255, 'Address line 2 too long').optional().nullable(),
  city: z.string().max(100, 'City name too long').optional().nullable(),
  state: z.string().max(50, 'State name too long').optional().nullable(),
  postalCode: z.string().max(20, 'Postal code too long').optional().nullable(),
  country: z.string().max(2, 'Country code too long').optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = donorUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const {
      donorId,
      firstName,
      lastName,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    } = validationResult.data;

    // Check if donor exists before updating
    const existingDonor = await prisma.donor.findUnique({
      where: { id: donorId },
    });

    if (!existingDonor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found.' },
        { status: 404 }
      );
    }

    // Security: Verify donor phone is verified before allowing update
    // This prevents unauthorized updates to donor records
    if (!existingDonor.isPhoneVerified) {
      return NextResponse.json(
        { success: false, error: 'Donor phone must be verified before updating information.' },
        { status: 403 }
      );
    }

    // Update donor record with full information
    const updatedDonor = await prisma.donor.update({
      where: { id: donorId },
      data: {
        firstName,
        lastName,
        email,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      donorData: updatedDonor,
    });
  } catch (error) {
    console.error('[API] Error updating donor:', error);

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update donor information. Please try again.'
      },
      { status: 500 }
    );
  }
}
