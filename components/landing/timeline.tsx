"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useScroll, useTransform, motion, useInView } from "framer-motion"
import { GradientText } from "@/components/ui/gradient-text"

interface TimelineEntry {
  title: string
  content: React.ReactNode
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setHeight(rect.height)
    }
  }, [ref])

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
            The Smarter Way to Run Your Church
          </GradientText>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Altarflow centralizes your ministry's operations, making it easier to manage, measure, and grow — all in one
            place.
          </p>
        </motion.div>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <TimelineItem key={index} item={item} index={index} />
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
    </div>
  )
}

const TimelineItem = ({ item, index }: { item: any; index: number }) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(itemRef, { once: true, margin: "-100px" })

  // Alternating background colors
  const bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50/50"

  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0, x: -50 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`flex justify-start pt-10 md:pt-20 md:gap-10 ${bgColor} rounded-2xl mb-8 p-6 md:p-8`}
    >
      <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
        {/* Enhanced Timeline Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
          className="h-12 absolute left-3 md:left-3 w-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center shadow-lg border-4 border-white"
        >
          <div className="h-4 w-4 rounded-full bg-white" />
        </motion.div>

        {/* Enhanced Section Title */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
          className="hidden md:block text-2xl md:pl-20 md:text-4xl font-bold text-gray-800 leading-tight drop-shadow-sm"
        >
          <span className="text-gray-900 drop-shadow-sm">{item.title}</span>
        </motion.h3>
      </div>

      <div className="relative pl-20 pr-4 md:pl-4 w-full">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
          className="md:hidden block text-2xl mb-6 text-left font-bold text-gray-900 drop-shadow-sm"
        >
          {item.title}
        </motion.h3>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
        >
          {item.content}
        </motion.div>
      </div>
    </motion.div>
  )
}
