import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { language, theme } = body;

    // Update church settings and increment onboarding step
    const church = await prisma.church.update({
      where: { clerkOrgId: orgId },
      data: {
        settingsJson: {
          language,
          theme,
        },
        onboardingStep: 5, // Move to next step
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, church });
  } catch (error) {
    logger.error('Error updating preferences:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}