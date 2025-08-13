"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

export const AnimatedTitle = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  
  const rotatingWords = [
    'Forms',
    'Newsletters',
    'Donations',
    'Expenses',
    'Reports'
  ]

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 2000)

    return () => clearInterval(wordInterval)
  }, [rotatingWords.length])

  return (
    <div className="space-y-4 md:space-y-6 px-4">
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-center text-white leading-tight">
        <span className="block">The Complete Church</span>
        <span className="block">Management Suite</span>
      </h1>

      <div className="flex justify-center items-center h-12 md:h-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWordIndex}
            initial={{ opacity: 0, y: 20, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -20, rotateX: 90 }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1e3a8a] text-center"
          >
            {rotatingWords[currentWordIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex items-center justify-center">
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-[700px] mx-auto text-center leading-relaxed">
          Run your ministry smarter, engage your congregation deeper, and grow your impact — all from one place.
        </p>
      </div>
    </div>
  )
}
