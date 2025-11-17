'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { esES, enUS } from '@clerk/localizations'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import type React from 'react'
import { useEffect, useState } from 'react'

interface ClerkThemeProviderProps {
  children: React.ReactNode
}

/**
 * Wrapper component that safely uses the theme context
 * Must be rendered inside ThemeProvider and I18nClientProvider
 */
function ClerkThemeWrapper({ children }: ClerkThemeProviderProps) {
  const { resolvedTheme } = useTheme()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('en')

  // Prevent hydration mismatch by only applying theme after mount
  useEffect(() => {
    setMounted(true)
    setCurrentLanguage(i18n.language)
  }, [])

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng)
    }

    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  const isDark = mounted && resolvedTheme === 'dark'

  // Select Clerk localization based on current language
  // i18n.language returns 'en' or 'es', so we check if it starts with 'es'
  const clerkLocalization = currentLanguage.startsWith('es') ? esES : enUS

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
      }}
      localization={clerkLocalization}
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
