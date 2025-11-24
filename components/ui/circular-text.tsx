"use client"

import { useEffect, useState } from "react"
import { motion, useAnimation } from "framer-motion"

const getRotationTransition = (duration: number, from: number, loop = true) => ({
  from: from,
  to: from + 360,
  ease: "linear",
  duration: duration,
  type: "tween",
  repeat: loop ? Number.POSITIVE_INFINITY : 0,
})

const _getTransition = (duration: number, from: number) => ({
  rotate: getRotationTransition(duration, from),
  scale: {
    type: "spring",
    damping: 20,
    stiffness: 300,
  },
})

interface CircularTextProps {
  text: string
  spinDuration?: number
  className?: string
  size?: number
}

const CircularText = ({ text, spinDuration = 20, className = "", size = 280 }: CircularTextProps) => {
  const letters = Array.from(text)
  const controls = useAnimation()
  const [currentRotation, setCurrentRotation] = useState(0)

  useEffect(() => {
    // Start continuous rotation immediately
    controls.start({
      rotate: [0, 360],
      transition: {
        duration: spinDuration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "loop",
      },
    })
  }, [spinDuration, controls])

  // Calculate radius based on size
  const radius = (size - 60) / 2

  return (
    <motion.div
      initial={{ rotate: 0 }}
      className={`mx-auto rounded-full font-bold text-center origin-center relative pointer-events-none ${className}`}
      animate={controls}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {letters.map((letter, i) => {
        // Calculate angle for each letter with even distribution
        const angle = (360 / letters.length) * i - 90 // Start from top
        const radian = (angle * Math.PI) / 180

        // Position each letter
        const x = radius * Math.cos(radian)
        const y = radius * Math.sin(radian)

        return (
          <span
            key={i}
            className="absolute text-base font-semibold transition-all duration-500 ease-linear select-none"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
              WebkitTransform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
            }}
          >
            {letter}
          </span>
        )
      })}
    </motion.div>
  )
}

export default CircularText
