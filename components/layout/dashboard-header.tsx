"use client"

import type React from "react"
import { useTranslation } from 'react-i18next';
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
// Import the new sidebar trigger 
import { SidebarTrigger } from "@/components/layout/enhanced-sidebar" 
// Remove import for old Sidebar if no longer needed for mobile Sheet
/**
 * Renders the sticky header bar for the dashboard, including sidebar controls and user account actions.
 *
 * The header displays a sidebar trigger on the left (visible on medium and larger screens) and, on the right, an organization switcher with customized appearance and a user account button.
 */
export function DashboardHeader() {
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