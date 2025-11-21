import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get church onboarding status
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
      }
    })

    if (!church) {
      // Church not found, might be a race condition with webhook
      return NextResponse.json({ 
        onboardingCompleted: false,
        onboardingStep: 1 
      })
    }

    return NextResponse.json({
      onboardingCompleted: church.onboardingCompleted,
      onboardingStep: church.onboardingStep,
    })

  } catch (error) {
    logger.error('Error checking onboarding status', {
      operation: 'api.settings.onboarding_status_error'
    }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}