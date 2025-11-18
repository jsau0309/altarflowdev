"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { AnimatedTitle } from "@/components/landing/animated-title"
import { useRouter } from "next/navigation"

export const HeroContent = () => {
  return (
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/altarflow-dashboard-hd.png" 
      alt="Altarflow Dashboard" 
      className="w-full h-full object-cover object-top rounded-lg"
    />
  )
}

export const HeroTitle = () => {
  const router = useRouter()
  
  return (
    <div className="space-y-6 md:space-y-8 pb-8 md:pb-16 pt-20 md:pt-20">
      <div className="space-y-4 md:space-y-6">
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-md text-white border border-white/30 px-4 md:px-6 py-2.5 md:py-2.5 text-xs md:text-sm font-medium shadow-lg">
            <span className="text-base md:text-lg">🚀</span>
            <span>Coming Soon: All-in-One Church Management</span>
          </div>
        </div>
        <AnimatedTitle />
      </div>

      <div className="flex justify-center px-4">
        <Button 
          size="lg" 
          className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-white text-[#3B82F6] hover:bg-white/90 font-semibold shadow-lg w-full sm:w-auto max-w-xs rounded-full"
          onClick={() => router.push('/book-demo')}
        >
          Book a Demo
          <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
        </Button>
      </div>
    </div>
  )
}
