"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useScroll, useTransform, motion, useInView, AnimatePresence } from "framer-motion"
import { GradientText } from "@/components/ui/gradient-text"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

interface TimelineEntry {
  title: string
  content: React.ReactNode
  features?: Array<{
    icon: React.ReactNode
    title: string
    description: string
  }>
}

export const MobileResponsiveTimeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const { t } = useTranslation('landing')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (ref.current && !isMobile) {
      const rect = ref.current.getBoundingClientRect()
      setHeight(rect.height)
    }
  }, [ref, isMobile])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  return (
    <div className="w-full bg-gradient-to-b from-white via-blue-50/30 to-white font-sans md:px-10" ref={containerRef}>
      {/* Enhanced Header Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto"
        >
          <GradientText
            colors={["#3B82F6", "#1D4ED8", "#60A5FA", "#3B82F6"]}
            animationSpeed={6}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6"
          >
            {t('features.title')}
          </GradientText>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('features.subtitle')}
          </p>
        </motion.div>
      </div>

      {/* Mobile: Clean Card Layout */}
      {isMobile ? (
        <div className="max-w-7xl mx-auto pb-20 px-4 space-y-6">
          {data.map((item, index) => (
            <MobileAccordionCard key={index} item={item} index={index} />
          ))}
        </div>
      ) : (
        /* Desktop: Enhanced Timeline */
        <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
          {data.map((item, index) => (
            <DesktopTimelineItem key={index} item={item} index={index} />
          ))}

          {/* Enhanced Timeline Line */}
          <div
            style={{
              height: height + "px",
            }}
            className="absolute md:left-8 left-8 top-0 overflow-hidden w-[3px] bg-gradient-to-b from-transparent via-gray-200 to-transparent rounded-full"
          >
            <motion.div
              style={{
                height: heightTransform,
                opacity: opacityTransform,
              }}
              className="absolute inset-x-0 top-0 w-[3px] bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] rounded-full shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Mobile Accordion Card Component
const MobileAccordionCard = ({ item, index }: { item: any; index: number }) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(itemRef, { once: true, margin: "-20px" })
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null)

  const toggleFeature = (featureIndex: number) => {
    setExpandedFeature(expandedFeature === featureIndex ? null : featureIndex)
  }

  return (
    <motion.div
      ref={itemRef}
      initial={{ y: 8 }}
      animate={isInView ? { y: 0 } : { y: 8 }}
      transition={{ duration: 0.4, delay: index * 0.02, ease: "easeOut" }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
    >
      {/* Category Title */}
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{item.title}</h3>

      {/* Features List */}
      <div className="space-y-3">
        {item.features?.map((feature: any, featureIndex: number) => (
          <div key={featureIndex} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Feature Header - Clickable */}
            <button
              onClick={() => toggleFeature(featureIndex)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white shadow-lg shadow-blue-500/25">
                  {feature.icon}
                </div>
                <span className="font-semibold text-gray-900 text-left">{feature.title}</span>
              </div>
              <motion.div
                animate={{ rotate: expandedFeature === featureIndex ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </motion.div>
            </button>

            {/* Feature Description - Expandable */}
            <AnimatePresence>
              {expandedFeature === featureIndex && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Desktop Timeline Item - Keep unchanged
const DesktopTimelineItem = ({ item, index }: { item: any; index: number }) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(itemRef, { once: true, margin: "-100px" })

  // Alternating background colors
  const bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50/50"

  return (
    <motion.div
      ref={itemRef}
      initial={{ x: -8 }}
      animate={isInView ? { x: 0 } : { x: -8 }}
      transition={{ duration: 0.4, delay: index * 0.02, ease: "easeOut" }}
      className={`flex justify-start pt-10 md:pt-20 md:gap-10 ${bgColor} rounded-2xl mb-8 p-6 md:p-8`}
    >
      <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
        {/* Enhanced Timeline Dot */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={isInView ? { scale: 1 } : { scale: 0.9 }}
          transition={{ duration: 0.3, delay: index * 0.02 + 0.05, ease: "easeOut" }}
          className="h-12 absolute left-3 md:left-3 w-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center shadow-lg border-4 border-white"
        >
          <div className="h-4 w-4 rounded-full bg-white" />
        </motion.div>

        {/* Enhanced Section Title */}
        <h3 className="hidden md:block text-2xl md:pl-20 md:text-4xl font-bold text-gray-800 leading-tight drop-shadow-sm">
          <span className="text-gray-900 drop-shadow-sm">{item.title}</span>
        </h3>
      </div>

      <div className="relative pl-20 pr-4 md:pl-4 w-full">
        <h3 className="md:hidden block text-2xl mb-6 text-left font-bold text-gray-900 drop-shadow-sm">{item.title}</h3>

        <div>{item.content}</div>
      </div>
    </motion.div>
  )
}
