"use client"

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useLoading } from '@/contexts/loading-context'
import { usePathname } from 'next/navigation'

export function useAuthLoading() {
  const { isSignedIn, isLoaded } = useUser()
  const { showLoader, hideLoader } = useLoading()
  const pathname = usePathname()
  const hasShownLoader = useRef(false)

  useEffect(() => {
    console.log('Auth Loading Hook:', { isLoaded, isSignedIn, pathname })
    
    // Show loader when navigating to dashboard after sign in
    if (isLoaded && isSignedIn && pathname.startsWith('/dashboard') && !hasShownLoader.current) {
      // Check for various signs of a new sign-in
      const urlParams = new URLSearchParams(window.location.search)
      const referrer = document.referrer
      
      console.log('Checking for new sign-in:', {
        urlParams: urlParams.toString(),
        referrer,
        hasClerkStatus: urlParams.has('__clerk_status'),
        hasClerkSession: urlParams.has('__clerk_created_session'),
        referrerIncludesSignin: referrer.includes('/signin')
      })
      
      const isNewSignIn = urlParams.has('from') && urlParams.get('from') === 'signin' ||
                         urlParams.has('__clerk_status') || 
                         urlParams.has('__clerk_created_session') ||
                         referrer.includes('/signin') ||
                         referrer.includes('clerk.') ||
                         // Check sessionStorage for sign-in flag
                         sessionStorage.getItem('justSignedIn') === 'true'
      
      if (isNewSignIn || !sessionStorage.getItem('dashboardLoaded')) {
        console.log('Showing loader for new sign-in')
        hasShownLoader.current = true
        showLoader()
        
        // Clear the sign-in flag
        sessionStorage.removeItem('justSignedIn')
        sessionStorage.setItem('dashboardLoaded', 'true')
        
        // Hide loader after dashboard content loads
        setTimeout(() => {
          hideLoader()
        }, 3500)
      }
    }
  }, [isLoaded, isSignedIn, pathname, showLoader, hideLoader])
}