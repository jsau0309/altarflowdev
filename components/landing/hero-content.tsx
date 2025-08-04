"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { AnimatedTitle } from "@/components/landing/animated-title"
import { MovingBorderButton } from "@/components/landing/moving-border"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"

export const HeroContent = () => {
  return (
    <>
      {/* Dashboard mockup content */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-blue-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-green-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-purple-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-4/5"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-orange-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-red-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-3/5"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm md:col-span-2">
        <div className="h-6 bg-blue-300 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="h-2 bg-gray-200 rounded w-4/5"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm md:col-span-3 lg:col-span-2">
        <div className="h-8 bg-gradient-to-r from-blue-300 to-purple-300 rounded mb-3"></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="h-4 bg-yellow-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded mb-1"></div>
        <div className="h-2 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm lg:col-span-2">
        <div className="h-6 bg-green-300 rounded mb-3"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded mb-1"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </>
  )
}

export const HeroTitle = () => {
  const { t } = useTranslation('landing')
  const router = useRouter()
  
  return (
    <div className="space-y-8 pb-16">
      <div className="space-y-4">
        <div className="flex justify-center">
          <MovingBorderButton
            borderRadius="1.75rem"
            className="bg-white text-gray-700 border-gray-200 px-4 py-2"
            borderClassName="bg-[radial-gradient(#3B82F6_40%,transparent_60%)] opacity-100"
            duration={2857}
          >
            {t('hero.badge')}
          </MovingBorderButton>
        </div>
        <AnimatedTitle />
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="text-lg px-8 py-6 bg-[#3B82F6] hover:bg-[#2563EB]"
          onClick={() => router.push('/book-demo')}
        >
          {t('hero.bookDemo')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
