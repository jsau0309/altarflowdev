import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { address, email, phone, website } = body;

    // Update church details and increment onboarding step
    const church = await prisma.church.update({
      where: { clerkOrgId: orgId },
      data: {
        address,
        email,
        phone,
        website,
        onboardingStep: 4, // Move to next step
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, church });
  } catch (error) {
    console.error('Error updating church details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}