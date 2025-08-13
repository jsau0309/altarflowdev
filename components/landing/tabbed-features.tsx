"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  DollarSign, 
  FileText, 
  BarChart3, 
  Users, 
  Mail, 
  Brain
} from "lucide-react"
import { useTranslation } from "react-i18next"

// Glass Filter Component for liquid glass effect
const GlassFilter = () => {
  return (
    <svg className="hidden">
      <defs>
        <filter
          id="liquid-glass"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.03"
            numOctaves="1"
            seed="2"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="3" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="15"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="0.5" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  screenshot?: string
}

export const TabbedFeatures = () => {
  const { t } = useTranslation('landing')
  const [activeFeature, setActiveFeature] = useState("donations")
  const [isImageExpanded, setIsImageExpanded] = useState(false)

  const features: Feature[] = [
    {
      id: "donations",
      icon: <DollarSign className="h-5 w-5" />,
      title: "Donations",
      description: "Monitor every type of donation, tithes, offerings, campaigns with full donor history and payment method tracking. Build stronger relationships by understanding giving patterns.",
      screenshot: "/features/altarflow-donations.png"
    },
    {
      id: "expenses",
      icon: <FileText className="h-5 w-5" />,
      title: "Expenses",
      description: "Easily log and categorize expenses with built-in receipt scanning. Stay organized, keep accurate records, and maintain financial transparency.",
      screenshot: "/features/altarflow-expenses.png"
    },
    {
      id: "reports",
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Reports",
      description: "Generate detailed, easy-to-read reports that promote accountability and transparency with your congregation, leadership, and board.",
      screenshot: "/features/altarflow-reports.png"
    },
    {
      id: "members",
      icon: <Users className="h-5 w-5" />,
      title: "Members",
      description: "Manage member profiles, track engagement, and follow each person's journey in your ministry; from first visit to active involvement.",
      screenshot: "/features/altarflow-members.png"
    },
    {
      id: "communications",
      icon: <Mail className="h-5 w-5" />,
      title: "Communications",
      description: "Send beautiful newsletters and announcements so your congregation never misses an important event, update, or opportunity to get involved.",
      screenshot: "/features/altarflow-communication.png"
    },
    {
      id: "insights",
      icon: <Brain className="h-5 w-5" />,
      title: "AI Insights",
      description: "Our smart AI engine learns your church's patterns to provide valuable insights, recommend actions, and help you make data-driven decisions.",
      screenshot: "/features/altarflow-ai.png"
    }
  ]

  const activeFeatureData = features.find(f => f.id === activeFeature)

  return (
    <section id="features" className="py-12 pb-8 md:py-32 bg-white">
      <GlassFilter />
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center space-y-6 md:space-y-8 mb-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
            <span className="block">All-in-One Tools to Run</span>
            <span className="block">and Grow Your Church</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-[800px] mx-auto pt-4 pb-4">
            From donations to member care, Altarflow simplifies your ministry's daily operations so you can focus more on people and less on paperwork.
          </p>
        </div>

        {/* Tab Navigation - Glass Badge Style */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 max-w-5xl mx-auto">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className={`
                inline-flex items-center gap-2 rounded-full transition-all duration-300
                ${activeFeature === feature.id 
                  ? 'bg-[#3B82F6]/10 backdrop-blur-md text-[#3B82F6] border border-[#3B82F6]/30 px-4 md:px-5 py-2.5 text-sm font-medium shadow-lg scale-105' 
                  : 'bg-gray-50/80 backdrop-blur-sm text-gray-600 border border-gray-200/50 px-4 md:px-5 py-2.5 text-sm font-medium hover:bg-gray-100/80 hover:border-gray-300/50'
                }
              `}
            >
              {feature.icon}
              <span className="hidden sm:inline">{feature.title}</span>
            </button>
          ))}
        </div>

        {/* Feature Content - with stable height */}
        <div className="max-w-6xl mx-auto min-h-[400px] md:min-h-[600px] relative">
          {activeFeatureData && (
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ 
                duration: 0.25
              }}
              className="space-y-8"
            >
              {/* Screenshot */}
              <div 
                className="relative rounded-xl overflow-hidden shadow-2xl group cursor-pointer"
                onClick={() => setIsImageExpanded(true)}
              >
                <img 
                  src={activeFeatureData.screenshot}
                  alt={activeFeatureData.title}
                  className="w-full h-auto transition-transform duration-500 ease-out group-hover:scale-105"
                />
                {/* Hover overlay with zoom icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                      <svg className="w-6 h-6 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description as footer */}
              <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto">
                {activeFeatureData.description}
              </p>
            </motion.div>
          )}
        </div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {isImageExpanded && activeFeatureData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsImageExpanded(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative max-w-7xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setIsImageExpanded(false)}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Expanded image */}
                <img 
                  src={activeFeatureData.screenshot}
                  alt={activeFeatureData.title}
                  className="w-full h-auto rounded-xl shadow-2xl"
                />
                
                {/* Feature title at bottom */}
                <div className="mt-4 text-center">
                  <h3 className="text-white text-2xl font-semibold">{activeFeatureData.title}</h3>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}