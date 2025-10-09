'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import type React from 'react'
import { useEffect, useState } from 'react'

interface ClerkThemeProviderProps {
  children: React.ReactNode
}

/**
 * Wrapper component that safely uses the theme context
 * Must be rendered inside ThemeProvider
 */
function ClerkThemeWrapper({ children }: ClerkThemeProviderProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only applying theme after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
      }}
      signInUrl="/signin"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/after-signup"
    >
      {children}
    </ClerkProvider>
  )
}

/**
 * ClerkThemeProvider - Wraps ClerkProvider with theme support
 * IMPORTANT: This component must be used INSIDE ThemeProvider
 */
export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  return <ClerkThemeWrapper>{children}</ClerkThemeWrapper>
}
