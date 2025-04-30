import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nClientProvider from "@/components/i18n-client-provider"
import { 
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'

// Removed client-side Supabase imports

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Altarflow - Church Management Platform",
  description: "Comprehensive church management platform",
}

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
        <body className={inter.className}>
          {/* REMOVED global simple header */}
          {/* <header style={{...}}>
            <SignedOut>...</SignedOut>
            <SignedIn>...</SignedIn>
          </header> */}
          
          {/* Providers and children */}
          <I18nClientProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
              {children}
            </ThemeProvider>
          </I18nClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

