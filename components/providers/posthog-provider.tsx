'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { initPostHog, getPostHog } from '@/lib/posthog/client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { userId, orgId } = useAuth()
  const { user } = useUser()

  // Initialize PostHog
  useEffect(() => {
    initPostHog()
  }, [])

  // Track page views
  useEffect(() => {
    const posthog = getPostHog()
    if (pathname && posthog) {
      let url = window.location.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  // Identify user when logged in
  useEffect(() => {
    const posthog = getPostHog()
    if (posthog) {
      if (userId) {
        // Identify the user
        posthog.identify(userId, {
          email: user?.primaryEmailAddress?.emailAddress,
          firstName: user?.firstName,
          lastName: user?.lastName,
          churchId: orgId,
        })
      } else {
        // Reset when user logs out
        posthog.reset()
      }
    }
  }, [userId, user, orgId])

  return <>{children}</>
}