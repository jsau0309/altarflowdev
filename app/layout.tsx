import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from 'geist/font/sans'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nClientProvider from "@/components/i18n-client-provider";
import { Toaster } from 'sonner';
import { 
  ClerkProvider
} from '@clerk/nextjs'
import { ErrorBoundary } from '@/components/error-boundary'
import { LoadingProvider } from '@/contexts/loading-context'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { SentryProvider } from '@/components/providers/sentry-provider'
import { StructuredData } from '@/components/seo/structured-data'

// Removed client-side Supabase imports

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com'),
  title: {
    default: 'AltarFlow - Modern Church Management Software',
    template: '%s | AltarFlow'
  },
  description: 'Streamline your church operations with AltarFlow. Complete bilingual church management platform to manage donations, track expenses, organize members, and send communications - all in one powerful platform. Try free for 30 days.',
  keywords: [
    'church management software',
    'church administration software', 
    'donation tracking system',
    'church expense management',
    'church member database',
    'church email campaigns',
    'software para iglesias',
    'gestión de iglesias',
    'administración de iglesias',
    'donaciones iglesia',
    'bilingual church software',
    'bilingual church management',
    'church CRM',
    'church accounting software',
    'online church donations',
    'church communication platform',
    'ministry management software'
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
  alternates: {
    canonical: 'https://altarflow.com',
    languages: {
      'en-US': 'https://altarflow.com',
      'es-US': 'https://altarflow.com/es',
    },
  },
  openGraph: {
    title: 'AltarFlow - Modern Church Management Software',
    description: 'Streamline your church operations with AltarFlow. Complete bilingual church management platform with donation tracking, expense management, member database, and email campaigns. Built for churches of all sizes and languages.',
    url: 'https://altarflow.com',
    siteName: 'AltarFlow',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AltarFlow - Church Management Platform',
      }
    ],
    locale: 'en_US',
    alternateLocale: 'es_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AltarFlow - Church Management Software',
    description: 'Complete bilingual church management platform. Manage donations, expenses, members & communications all in one place.',
    site: '@altarflow',
    creator: '@altarflow',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
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
    <ClerkProvider
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none",
        }
      }}
      signInUrl="/signin"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/after-signup"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <StructuredData />
          {/* Comment block removed */}
        </head>
        <body className={GeistSans.className}>
          {/* REMOVED global simple header */}
          {/* <header style={{...}}>
            <SignedOut>...</SignedOut>
            <SignedIn>...</SignedIn>
          </header> */}
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
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
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
