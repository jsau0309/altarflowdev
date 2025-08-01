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

// Removed client-side Supabase imports

export const metadata: Metadata = {
  title: "Altarflow - Church Management Platform",
  description: "Comprehensive church management platform",
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
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              <Toaster richColors position="bottom-right" />
            </I18nClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
