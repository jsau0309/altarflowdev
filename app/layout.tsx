import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nClientProvider from "@/components/i18n-client-provider"

// Removed client-side Supabase imports
import SupabaseListener from "@/components/supabase-listener"; // Import the new client component

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Remove Google Maps Script */}
        {/* 
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        /> 
        */}
      </head>
      <body className={inter.className}>
        {/* Render the listener early inside body */}
        <SupabaseListener /> 
        <I18nClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </I18nClientProvider>
      </body>
    </html>
  )
}

