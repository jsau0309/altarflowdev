"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useTranslation } from 'react-i18next'

export const BoxLoader: React.FC = () => {
  const { t } = useTranslation('common');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative flex flex-col items-center justify-center gap-20">
        {/* Box loader animation - now using the official component structure */}
        <div className="relative">
          <style jsx>{`
            .boxes {
              width: 100px;
              height: 100px;
              position: relative;
              transform-style: preserve-3d;
              transform: rotateX(-30deg) rotateY(-45deg) scale(1.4);
            }

            .box {
              width: 50px;
              height: 50px;
              position: absolute;
              transform-style: preserve-3d;
              animation-duration: 1.6s;
              animation-timing-function: ease-in-out;
              animation-iteration-count: infinite;
            }

            .face {
              width: 50px;
              height: 50px;
              position: absolute;
            }

            .face-front {
              transform: translateZ(25px);
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              box-shadow: 0 5px 20px rgba(59, 130, 246, 0.4);
            }

            .face-back {
              transform: rotateY(180deg) translateZ(25px);
              background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
            }

            .face-right {
              transform: rotateY(90deg) translateZ(25px);
              background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            }

            .face-left {
              transform: rotateY(-90deg) translateZ(25px);
              background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
            }

            .face-top {
              transform: rotateX(90deg) translateZ(25px);
              background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
            }

            .face-bottom {
              transform: rotateX(-90deg) translateZ(25px);
              background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
            }

            .box-1 {
              animation-name: box1;
            }

            .box-2 {
              animation-name: box2;
            }

            .box-3 {
              animation-name: box3;
            }

            .box-4 {
              animation-name: box4;
            }

            @keyframes box1 {
              0%,
              50% {
                transform: translate(100%, 0);
              }
              100% {
                transform: translate(200%, 0);
              }
            }

            @keyframes box2 {
              0% {
                transform: translate(0, 100%);
              }
              50% {
                transform: translate(0, 0);
              }
              100% {
                transform: translate(100%, 0);
              }
            }

            @keyframes box3 {
              0%,
              50% {
                transform: translate(100%, 100%);
              }
              100% {
                transform: translate(0, 100%);
              }
            }

            @keyframes box4 {
              0% {
                transform: translate(200%, 0);
              }
              50% {
                transform: translate(200%, 100%);
              }
              100% {
                transform: translate(100%, 100%);
              }
            }
          `}</style>
          
          <div className="boxes">
            <div className="box box-1">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-2">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-3">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-4">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
          </div>
        </div>

        {/* Loading text */}
        <motion.div 
          className="text-center space-y-8 ml-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('loading.preparingTools', 'Preparing your church management tools')}
          </motion.p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#3B82F6' }}
                animate={{ 
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default BoxLoader
