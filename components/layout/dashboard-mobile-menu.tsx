"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, LayoutDashboard, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function DashboardMobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation('layout')

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleNavClick = (href: string) => {
    setIsOpen(false)
    // Small delay to ensure menu closes before navigating
    setTimeout(() => {
      router.push(href)
    }, 300)
  }

  const menuItems = [
    {
      href: "/dashboard",
      label: t('sidebar.dashboard', 'Dashboard'),
      icon: LayoutDashboard,
    },
    {
      href: "/settings",
      label: t('sidebar.settings', 'Settings'),
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        className="md:hidden relative z-[100]"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[90] bg-black md:hidden"
              onClick={toggleMenu}
            />
            
            {/* Menu content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-[95] w-72 bg-white dark:bg-gray-900 shadow-xl md:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Menu</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMenu}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Navigation Links */}
                <div className="flex-1 p-4 space-y-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                      >
                        <button
                          onClick={() => handleNavClick(item.href)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    AltarFlow © {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}