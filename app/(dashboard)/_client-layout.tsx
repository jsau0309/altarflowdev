"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sidebar } from "@/components/layout/sidebar"
import { LanguageToggle } from "@/components/language-toggle"

// Renamed function from original layout
export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)
  const { t } = useTranslation('layout');

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Render basic skeleton until mounted to avoid layout shift/hydration errors
  if (!isMounted) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2"><div>{t('common:loading', 'Loading...')}</div></div>
                <div className="flex items-center gap-4"><div></div></div>
            </header>
            <div className="flex flex-1">
                <div className="hidden border-r md:block w-64 bg-muted/40 p-4"></div> 
                <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
  }

  // Render full layout once mounted
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('toggleMenu', 'Toggle Menu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            {/* Altarflow logo SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{t('common:appName', 'Altarflow')}</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span className="sr-only">{t('toggleTheme', 'Toggle theme')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>{t('themeToggle.light', 'Light')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>{t('themeToggle.dark', 'Dark')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <OrganizationSwitcher 
             hidePersonal={true}
          />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden border-r bg-muted/40 md:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
} 