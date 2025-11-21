import posthog from 'posthog-js'
import { PostHog } from 'posthog-js'

let posthogClient: PostHog | null = null

export function initPostHog(): PostHog | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (!posthogClient) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (!apiKey) {
      console.warn('PostHog API key not found. Analytics will not be tracked.')
      return null
    }

    posthogClient = posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
    })
  }

  return posthogClient
}

export function getPostHog(): PostHog | null {
  return posthogClient
}