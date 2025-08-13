"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleNavClick = (href: string) => {
    setIsOpen(false)
    // Small delay to ensure menu closes before scrolling
    setTimeout(() => {
      if (href.startsWith("#")) {
        const element = document.querySelector(href)
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      } else {
        window.location.href = href
      }
    }, 300)
  }

  const handleGetStarted = () => {
    setIsOpen(false)
    setTimeout(() => {
      router.push('/waitlist-full')
    }, 300)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        className="md:hidden relative z-[100]"
        aria-label="Toggle menu"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] md:hidden"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#f8fafc",
              width: "100vw",
              height: "100vh",
            }}
          >
            <div className="flex flex-col h-full pt-24 px-8 pb-8 w-full">
              {/* Navigation Links */}
              <div className="flex-1 space-y-8">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <button
                    onClick={() => handleNavClick("#features")}
                    className="block w-full text-left text-2xl font-semibold text-gray-900 hover:text-[#3B82F6] transition-colors py-4 border-b border-gray-200"
                  >
                    Features
                  </button>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setTimeout(() => router.push('/signin'), 300)
                    }}
                    className="block w-full text-left text-2xl font-semibold text-gray-900 hover:text-[#3B82F6] transition-colors py-4"
                  >
                    Sign In
                  </button>
                </motion.div>
              </div>

              {/* Get Started Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="pt-8 border-t border-gray-200"
              >
                <Button
                  onClick={handleGetStarted}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xl py-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  Get Started
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}