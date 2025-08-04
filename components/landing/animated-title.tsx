"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

export const AnimatedTitle = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const { t } = useTranslation('landing')
  
  const rotatingWords = [
    t('hero.rotatingWords.forms'),
    t('hero.rotatingWords.newsletters'),
    t('hero.rotatingWords.donations'),
    t('hero.rotatingWords.expenses'),
    t('hero.rotatingWords.reports')
  ]

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 2000)

    return () => clearInterval(wordInterval)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-center">
        {t('hero.title')}
      </h1>

      <div className="flex justify-center items-center h-16">
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
            className="text-3xl sm:text-4xl md:text-5xl font-medium text-[#3B82F6] text-center"
          >
            {rotatingWords[currentWordIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex items-center justify-center">
        <p className="text-xl text-gray-600 max-w-[700px] mx-auto text-center">
          {t('hero.description')}
        </p>
      </div>
    </div>
  )
}
