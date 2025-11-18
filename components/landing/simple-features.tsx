"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  DollarSign, 
  FileText, 
  BarChart3, 
  Users, 
  Mail, 
  Brain,
  X
} from "lucide-react"
import { useTranslation } from "react-i18next"

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  screenshot?: string
  color: string
}

export const SimpleFeatures = () => {
  const { t } = useTranslation('landing')
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  const features: Feature[] = [
    {
      id: "donations",
      icon: <DollarSign className="h-6 w-6" />,
      title: "Donation Management",
      description: "Track online and offline giving, link donors to members, and keep a full history of every contribution.",
      screenshot: "/dashboard-screenshots/donations.png",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "expenses",
      icon: <FileText className="h-6 w-6" />,
      title: "Expense Tracking",
      description: "Log all church expenses, attach receipts, and let OCR scan details automatically for faster entry.",
      screenshot: "/dashboard-screenshots/expenses.png",
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "reports",
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Financial Reports",
      description: "Generate in-depth financial reports, filter by date, and export as PDF or CSV for meetings or compliance.",
      screenshot: "/dashboard-screenshots/reports.png",
      color: "from-green-500 to-green-600"
    },
    {
      id: "members",
      icon: <Users className="h-6 w-6" />,
      title: "Member Directory",
      description: "Maintain a comprehensive member database with contact details, giving history, and engagement tracking.",
      screenshot: "/dashboard-screenshots/members.png",
      color: "from-orange-500 to-orange-600"
    },
    {
      id: "communications",
      icon: <Mail className="h-6 w-6" />,
      title: "Email Campaigns",
      description: "Design beautiful newsletters with our visual editor, schedule messages, and track engagement metrics.",
      screenshot: "/dashboard-screenshots/communications.png",
      color: "from-pink-500 to-pink-600"
    },
    {
      id: "ai",
      icon: <Brain className="h-6 w-6" />,
      title: "AI Insights",
      description: "Get AI-powered monthly summaries, predictive analytics, and intelligent recommendations for growth.",
      screenshot: "/dashboard-screenshots/ai-insights.png",
      color: "from-indigo-500 to-indigo-600"
    }
  ]

  return (
    <section id="features" className="py-20 md:py-32 bg-white">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
            The Smarter Way to Run Your Church
          </h2>
          <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
            Altarflow centralizes your ministry&apos;s operations, making it easier to manage, measure, and grow — all in one place.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedFeature(feature)}
              className="relative group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                {/* Gradient accent on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white mb-4`}>
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-xs text-gray-400">Click to explore →</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Modal */}
        <AnimatePresence>
          {selectedFeature && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedFeature(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Modal content */}
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${selectedFeature.color} text-white`}>
                      {selectedFeature.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedFeature.title}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {selectedFeature.description}
                      </p>
                    </div>
                  </div>

                  {/* Screenshot */}
                  {selectedFeature.screenshot && (
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img 
                        src={selectedFeature.screenshot} 
                        alt={selectedFeature.title}
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}