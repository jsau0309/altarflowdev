"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun } from "lucide-react"
import Link from "next/link"
// Removed usePathname as it's not used

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// Updated import path for Sidebar
import { Sidebar } from "@/components/layout/sidebar"

// Rename function to RootLayout or similar convention for file-based layouts
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    // Return null or a basic skeleton to avoid layout shift
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
                {/* Basic header skeleton */}
                <div className="flex items-center gap-2"><div>Loading...</div></div>
                <div className="flex items-center gap-4"><div></div></div>
            </header>
            <div className="flex flex-1">
                {/* Basic sidebar skeleton */}
                <div className="hidden border-r md:block w-64 bg-muted"></div>
                <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              {/* Ensure Sidebar is rendered here */}
              <Sidebar />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            {/* Altarflow logo SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-600"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Altarflow</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Placeholder address - replace with dynamic data later */}
          <div className="text-sm text-muted-foreground hidden md:block">Church Address Placeholder</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Placeholder User button - replace with Clerk UserButton later */}
          <Button variant="ghost" size="icon" className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
            <span className="flex h-9 w-9 items-center justify-center">U</span>
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden border-r md:block">
          {/* Ensure Sidebar is rendered here */}
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
} 