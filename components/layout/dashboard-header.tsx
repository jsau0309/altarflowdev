"use client"

import type React from "react"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// Import the new sidebar trigger 
import { SidebarTrigger } from "@/components/layout/enhanced-sidebar" 
// Remove import for old Sidebar if no longer needed for mobile Sheet
// import { Sidebar } from "@/components/layout/sidebar"
import { LanguageToggle } from "@/components/language-toggle"

export function DashboardHeader() {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation(['layout', 'common']); 

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background px-4 md:px-6">
       <div className="flex items-center gap-2"> 
         {/* Mobile menu Sheet - The enhanced sidebar handles mobile view now, so this can likely be removed */}
         {/* <Sheet> 
           <SheetTrigger asChild>
             <Button variant="ghost" size="icon" className="md:hidden"> 
               <Menu className="h-5 w-5" />
               <span className="sr-only">{t('toggleMenu', 'Toggle Menu')}</span>
             </Button>
           </SheetTrigger>
           <SheetContent side="left" className="p-0 w-64"> 
             <Sidebar isCollapsed={false} toggleSidebar={() => {}} /> 
           </SheetContent>
         </Sheet> */} 
         {/* Add the new SidebarTrigger for desktop - Increase size */}
         <SidebarTrigger className="hidden md:flex h-14 w-14" /> {/* Increased size */} 
       </div>

       {/* Right side: Controls */}
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
         <OrganizationSwitcher hidePersonal={true} />
         <UserButton afterSignOutUrl="/" />
       </div>
    </header>
  );
}

export default DashboardHeader; 