import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    // Get org ID from headers (set by middleware)
    const orgId = req.headers.get('x-clerk-org-id')
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 })
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
    console.error('Error checking onboarding status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}