import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from 'geist/font/sans'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nClientProvider from "@/components/i18n-client-provider";
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeErrorBoundary } from '@/components/providers/theme-error-boundary'
import { LoadingProvider } from '@/contexts/loading-context'
import { ClerkThemeProvider } from '@/components/providers/clerk-theme-provider'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { SentryProvider } from '@/components/providers/sentry-provider'
import { StructuredData } from '@/components/seo/structured-data'

// Removed client-side Supabase imports

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com'),
  title: {
    default: 'AltarFlow - Church Management Platform',
    template: '%s | AltarFlow'
  },
  description: 'Bilingual church management platform for managing donations, expenses, members, and communications.',
  keywords: [
    'church management software',
    'donation tracking',
    'church administration',
    'expense management',
    'member management',
    'software para iglesias',
    'gestión de iglesias'
  ],
  authors: [{ name: 'AltarFlow Team' }],
  creator: 'AltarFlow',
  publisher: 'AltarFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome',
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
      },
      {
        rel: 'android-chrome',
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
      },
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: false,
    follow: false,
  },
}


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff', // White theme color for browser UI
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  // Removed client-side Supabase setup logic

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        {/* Comment block removed */}
      </head>
      <body className={GeistSans.className}>
        <ThemeErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <ClerkThemeProvider>
              <I18nClientProvider>
                <LoadingProvider>
                  <SentryProvider>
                    <PostHogProvider>
                      <ErrorBoundary>
                        {children}
                      </ErrorBoundary>
                    </PostHogProvider>
                    <Toaster richColors position="bottom-right" />
                  </SentryProvider>
                </LoadingProvider>
              </I18nClientProvider>
            </ClerkThemeProvider>
          </ThemeProvider>
        </ThemeErrorBoundary>
      </body>
    </html>
  )
}
