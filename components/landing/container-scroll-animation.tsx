"use client"
import React, { useRef } from "react"
import { useScroll, useTransform, motion } from "framer-motion"

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode
  children: React.ReactNode
}) => {
  const containerRef = useRef<any>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
  })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1]
  }

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  
  // Use same animation range for both mobile and desktop for consistency
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div className="h-[60rem] sm:h-[65rem] md:h-[70rem] lg:h-[80rem] flex items-center justify-center relative p-2 md:p-20 overflow-hidden" ref={containerRef}>
      <div
        className="py-10 md:py-40 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  )
}

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  )
}

export const Card = ({
  rotate,
  scale,
  translate,
  children,
}: {
  rotate: any
  scale: any
  translate: any
  children: React.ReactNode
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        translateY: translate,
      }}
      className="max-w-5xl -mt-12 mx-auto h-[18rem] sm:h-[22rem] md:h-[28rem] lg:h-[32rem] w-full border-2 sm:border-3 md:border-4 border-[#6C6C6C] p-2 sm:p-3 md:p-4 bg-[#222222] rounded-[20px] md:rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full rounded-lg md:rounded-xl overflow-hidden">
        {children}
      </div>
    </motion.div>
  )
}
