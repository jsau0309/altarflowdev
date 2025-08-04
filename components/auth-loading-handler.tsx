"use client"

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useLoading } from '@/contexts/loading-context'
import { usePathname, useRouter } from 'next/navigation'

export function AuthLoadingHandler() {
  const { isSignedIn, isLoaded } = useAuth()
  const { showLoader } = useLoading()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Show loader when user just signed in and is being redirected to dashboard
    if (isLoaded && isSignedIn && pathname === '/signin') {
      showLoader()
      // Clerk will handle the redirect to dashboard
    }
  }, [isLoaded, isSignedIn, pathname, showLoader])

  return null
}