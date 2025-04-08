import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import I18nProvider from "@/components/i18n-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Altarflow - Church Management Platform",
  description: "Comprehensive church management platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}

