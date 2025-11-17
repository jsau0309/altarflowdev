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
  const [currentLanguage, setCurrentLanguage] = useState<string>('en')

  // Prevent hydration mismatch by only applying theme after mount
  useEffect(() => {
    setMounted(true)
    // Set initial language from i18n
    const detectedLang = i18n.language || i18n.resolvedLanguage || 'en'
    setCurrentLanguage(detectedLang)
  }, [i18n])

  // Listen to language changes and reload page to ensure Clerk components update
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      // Only reload if the language actually changed (not initial mount)
      if (mounted && currentLanguage !== lng) {
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
      setCurrentLanguage(lng)
    }

    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n, mounted, currentLanguage])

  const isDark = mounted && resolvedTheme === 'dark'

  // Select Clerk localization based on current language
  // i18n.language returns 'en' or 'es'
  const clerkLocalization = currentLanguage === 'es' ? esES : enUS

  return (
    <ClerkProvider
      key={currentLanguage} // Force remount when language changes
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
