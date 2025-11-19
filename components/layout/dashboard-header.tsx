"use client"

import type React from "react"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

// Import the new sidebar trigger
import { SidebarTrigger } from "@/components/layout/enhanced-sidebar"
// Import the mobile menu
import { DashboardMobileMenu } from "@/components/layout/dashboard-mobile-menu"
export function DashboardHeader() { 

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background px-4 md:px-6">
       <div className="flex items-center gap-2"> 
         {/* Mobile menu for Dashboard and Settings */}
         <DashboardMobileMenu />
         {/* Desktop sidebar trigger */}
         <SidebarTrigger className="hidden md:flex h-14 w-14" />
       </div>

       {/* Right side: Controls */}
       <div className="flex items-center gap-4"> 
         <OrganizationSwitcher 
           hidePersonal={true}
           afterCreateOrganizationUrl="/dashboard"
           appearance={{
             elements: {
               organizationSwitcherTrigger: "px-3",
               organizationPreviewAvatarBox: "size-6",
               // Hide the create organization button for MVP
               organizationSwitcherPopoverActionButton__createOrganization: "hidden",
               organizationSwitcherPopoverActions__createOrganization: "hidden",
             },
           }}
         />
         <UserButton />
       </div>
    </header>
  );
}

export default DashboardHeader; 