"use client"

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useLoading } from '@/contexts/loading-context'
import { usePathname } from 'next/navigation'
import { safeStorage } from '@/lib/safe-storage'

export function useAuthLoading() {
  const { isSignedIn, isLoaded } = useUser()
  const { showLoader } = useLoading()
  const pathname = usePathname()
  const hasShownLoader = useRef(false)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    // Only run on dashboard route
    if (!pathname.startsWith('/dashboard')) {
      return
    }

    // Skip if already shown loader in this session
    if (hasShownLoader.current) {
      return
    }

    // Only check for sign-in transition on first load
    if (isLoaded && isSignedIn && isFirstLoad.current) {
      isFirstLoad.current = false
      
      // Check for various signs of a new sign-in
      const urlParams = new URLSearchParams(window.location.search)
      const referrer = document.referrer
      
      const isNewSignIn = urlParams.has('__clerk_status') || 
                         urlParams.has('__clerk_created_session') ||
                         referrer.includes('/signin') ||
                         referrer.includes('clerk.') ||
                         safeStorage.getItem('justSignedIn', 'sessionStorage') === 'true'
      
      // Only show loader for actual sign-in transitions, not page refreshes
      if (isNewSignIn) {
        hasShownLoader.current = true
        showLoader()
        
        // Clear the sign-in flag
        safeStorage.removeItem('justSignedIn', 'sessionStorage')
      }
    }
  }, [isLoaded, isSignedIn, pathname, showLoader])
}