"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"; // <-- Add this import
// Remove imports related to old header/sidebar structure
// import { useTheme } from "next-themes"
// import { Menu, Moon, Sun } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { useTranslation } from 'react-i18next';
// import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
// import { Button } from "@/components/ui/button"
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { LanguageToggle } from "@/components/language-toggle"

// Import necessary components from the new enhanced sidebar 
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, // Example, adjust based on what's needed directly here
  SidebarInset // Use SidebarInset as the main content wrapper
} from "@/components/layout/enhanced-sidebar"

// Import the new header component
import DashboardHeader from "@/components/layout/dashboard-header"

// Keep cn if still needed, otherwise remove
import { cn } from "@/lib/utils"
import CrispChat from '@/components/crisp-chat';

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuth(); // <-- Get orgId from Clerk
  // Remove state logic previously lifted here
  // const { setTheme, theme } = useTheme() // Moved to DashboardHeader
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Now managed by SidebarProvider
  // const toggleSidebarCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed); // Managed by SidebarProvider

  // Keep mount logic if needed for other reasons, or remove if only for theme
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Store orgId (churchId) in localStorage when available
  useEffect(() => {
    if (orgId && typeof window !== 'undefined') {
      localStorage.setItem("churchId", orgId);
      // churchId stored in localStorage
    } else if (typeof window !== 'undefined') {
      // Optional: Clear churchId if orgId is not available (e.g., user logs out of org)
      // localStorage.removeItem("churchId");
      // orgId not available, churchId potentially cleared from localStorage
    }
  }, [orgId]);

  // Basic skeleton can remain similar for initial load feel
  if (!isMounted) {
    return (
        <div className="flex min-h-screen">
             {/* Simplified skeleton - Adjust as needed */}
             <div className="w-20 border-r bg-muted/40 p-4"></div> 
             <div className="flex-1 p-4 md:p-6">Loading...</div> 
        </div>
    );
  }
  
  // Return new structure using SidebarProvider and components
  return (
      <SidebarProvider> {/* Wrap with the provider */} 
        <Sidebar> {/* Render the Sidebar component */} 
          {/* Sidebar Content will be defined within enhanced-sidebar.tsx 
              Example structure (will be adapted in Step 7):
          <SidebarHeader>Logo</SidebarHeader>
          <SidebarContent>Nav Links</SidebarContent>
          <SidebarFooter>Sign Out</SidebarFooter> 
          */}
        </Sidebar>
        <SidebarInset> {/* Use SidebarInset for the main content area */} 
          <DashboardHeader /> {/* Place the new header here */} 
          {children} {/* Render page content without wrapper - will add to individual pages */}
        </SidebarInset>
        <CrispChat />
      </SidebarProvider>
  );
} 