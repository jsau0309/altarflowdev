import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark onboarding as complete
    const church = await prisma.church.update({
      where: { clerkOrgId: orgId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 6, // Final step
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, church });
  } catch (error) {
    logger.error('Error completing onboarding:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}