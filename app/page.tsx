"use client"

import type React from "react"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { usePostHog } from "@/hooks/use-posthog"
import CircularText from "@/components/ui/circular-text"
import NextLink from "next/link"
import { HeroTitle } from "@/components/landing/hero-content"
import { TabbedFeatures } from "@/components/landing/tabbed-features"
import { MobileFeatures } from "@/components/landing/mobile-features"
import { AltarflowFooter } from "@/components/landing/simple-footer"
import { MobileMenu } from "@/components/landing/mobile-menu"
import { CTABackgroundPaths } from "@/components/landing/floating-paths"
import { motion } from "framer-motion"



export default function LandingPage() {
  const router = useRouter()
  const { trackEvent } = usePostHog()

  // Send a test event to verify PostHog installation
  useEffect(() => {
    trackEvent('landing_page_viewed', { 
      page: 'home',
      timestamp: new Date().toISOString()
    })
  }, [trackEvent])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 w-full bg-transparent">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            <img src="/altarflow-logo-white.svg" alt="Altarflow" className="w-[191px] h-[45px]" />
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              <NextLink
                href="#features"
                className="text-sm font-medium text-white hover:text-white/80 hover:bg-white/10 px-4 py-2 rounded-full transition-all"
              >
                Features
              </NextLink>
            </nav>

            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                className="hidden md:inline-flex text-white hover:text-white/80 hover:bg-white/10 rounded-full"
                onClick={() => router.push('/signin')}
              >
                Sign In
              </Button>
              <Button 
                className="hidden md:inline-flex bg-white text-[#3B82F6] hover:bg-white/90 px-6 py-2 font-semibold rounded-full"
                onClick={() => {
                  trackEvent('get_started_clicked', { 
                    location: 'header',
                    timestamp: new Date().toISOString()
                  })
                  router.push('/waitlist-full')
                }}
              >
                Get Started
              </Button>
              <MobileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#3B82F6] via-[#60A5FA] to-white">
        {/* Primary Gradient Overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/20 via-transparent to-transparent" />
        
        {/* Radial Gradient for Center Glow */}
        <div className="absolute inset-0 bg-radial-gradient" style={{
          background: 'radial-gradient(ellipse at top center, rgba(59, 130, 246, 0.15), transparent 50%)'
        }} />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        
        {/* Content */}
        <div className="relative">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <HeroTitle />
            
            {/* Dashboard Preview - Sharp and Clean (Responsive) */}
            <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-[68rem] mx-auto px-4 sm:px-6 lg:px-4">
              <div className="relative">
                {/* Subtle shadow underneath for depth */}
                <div className="absolute -inset-2 sm:-inset-4 translate-y-4 sm:translate-y-8 bg-gradient-to-b from-[#3B82F6]/8 to-transparent blur-2xl sm:blur-3xl -z-10"></div>
                
                {/* Dashboard container - crisp and clear */}
                <div className="relative rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl bg-white">
                  {/* Dashboard image - optimized for sharpness */}
                  <img 
                    src="/features/altarflow-dashboard-hero.png" 
                    alt="Altarflow Dashboard" 
                    className="w-full h-auto object-cover object-top"
                    style={{
                      imageRendering: "-webkit-optimize-contrast",
                      WebkitFontSmoothing: "antialiased",
                    }}
                  />
                  
                  {/* Bottom fade - responsive heights */}
                  <div className="absolute inset-x-0 bottom-0 h-[25%] sm:h-[22%] md:h-[20%] bg-gradient-to-t from-white/90 via-white/40 to-transparent pointer-events-none"></div>
                  
                  {/* Very soft blur layer at the bottom - responsive */}
                  <div className="absolute inset-x-0 bottom-0 h-[22%] sm:h-[20%] md:h-[18%] backdrop-blur-[0.5px] bg-gradient-to-t from-white/25 to-transparent pointer-events-none"></div>
                  
                  {/* Very subtle vignette for depth - no blur */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.02] pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - Tabbed Interface */}
      <TabbedFeatures />

      {/* Mobile Features Section */}
      <MobileFeatures />

      {/* Final CTA Section - Optimized Animated Gradient */}
      <section className="relative py-20 md:py-32 text-white overflow-hidden">
        {/* Animated Gradient Background - Only animate on desktop for performance */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#1E40AF] md:animate-gradient bg-[length:400%_400%]"></div>

        {/* Animated Paths Background - Hidden on mobile for performance */}
        <div className="hidden md:block">
          <CTABackgroundPaths />
        </div>

        {/* Content */}
        <div className="container px-4 md:px-6 text-center relative z-10">
          <div className="space-y-8 max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            >
              Ready to Transform Your Church Operations?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-blue-100"
            >
              Join the first churches to unlock smarter ministry operations, more intelligent insights, and simpler management with Altarflow&apos;s complete platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-6 rounded-full"
                onClick={() => router.push('/book-demo')}
              >
                Book Your Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#3B82F6] bg-transparent rounded-full"
                onClick={() => router.push('/waitlist-full')}
              >
                Join the Waitlist
              </Button>
            </motion.div>
            {/* Circular Text - Hidden on mobile for performance */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="hidden md:flex justify-center items-center"
            >
              <CircularText
                text="• THE FUTURE OF CHURCH MANAGEMENT • COMING SOON "
                spinDuration={25}
                className="text-blue-200 text-lg font-semibold"
                size={280}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <AltarflowFooter />
    </div>
  )
}