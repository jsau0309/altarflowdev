import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from 'geist/font/sans'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nClientProvider from "@/components/i18n-client-provider";
import { Toaster } from 'sonner';
import { 
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import { ErrorBoundary } from '@/components/error-boundary'
import { LoadingProvider } from '@/contexts/loading-context'

// Removed client-side Supabase imports

export const metadata: Metadata = {
  title: "Altarflow - All-in-One Church Management Platform",
  description: "Transform your church operations with Altarflow. Manage donations, expenses, members, and communications in one powerful bilingual platform built for Hispanic churches.",
  keywords: ["church management", "church software", "donation tracking", "church administration", "iglesia", "gestión iglesia"],
  authors: [{ name: "Altarflow" }],
  creator: "Altarflow",
  openGraph: {
    title: "Altarflow - All-in-One Church Management Platform",
    description: "Transform your church operations with Altarflow. Manage donations, expenses, members, and communications in one powerful bilingual platform.",
    url: 'https://altarflow.com',
    siteName: 'Altarflow',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Altarflow - Church Management Platform',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altarflow - All-in-One Church Management Platform',
    description: 'Transform your church operations with Altarflow. Manage donations, expenses, members, and communications in one powerful bilingual platform.',
    images: ['/og-image.png'],
    creator: '@altarflow',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  // Removed client-side Supabase setup logic

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
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
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
                <Toaster richColors position="bottom-right" />
              </LoadingProvider>
            </I18nClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
