"use client"

import { motion } from "framer-motion"
import { CreditCard, Heart, Users } from "lucide-react"

export const MobileFeatures = () => {
  return (
    <section className="py-16 md:py-32 bg-gray-50">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12 md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            <span className="block">The Power of Your Church,</span>
            <span className="block bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
              in the Palm of Your Hand
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
            From tracking generosity to sending updates, every Altarflow feature is built to go with you. Whether you&apos;re at church, home, or traveling, your ministry&apos;s mission is always just a tap away.
          </p>
        </div>

        {/* Mobile Donations Section */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 lg:mb-32">
          {/* Description - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-1"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/10 backdrop-blur-sm text-[#3B82F6] border border-[#3B82F6]/30 px-4 py-2 text-sm font-medium">
                <Heart className="h-4 w-4" />
                <span>Mobile Donations</span>
              </div>
              
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Inspire Generosity in a Digital World
              </h3>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                Passing the plate isn&apos;t the only way to give anymore. In today&apos;s digital world, most contributions happen on a phone and Altarflow makes it easier than ever. Whether in service, at home, or traveling, your congregation can give in seconds, fueling your church&apos;s mission and impact.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">One-Tap Giving</p>
                    <p className="text-gray-600">Quick, secure donations with saved payment methods — making generosity as simple as sending a text.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Recurring Donations</p>
                    <p className="text-gray-600">Encourage ongoing support with automatic weekly or monthly gifts that help your ministry plan ahead and grow.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Instant Receipts</p>
                    <p className="text-gray-600">Every gift is followed by an immediate thank-you and tax receipt, building trust and showing gratitude for every act of generosity.</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Mobile Mockup - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-2 flex justify-center"
          >
            <div className="relative">
              {/* Mockup Image (already includes phone frame) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/features/donate-mockup.png" 
                alt="Mobile Donations Interface"
                className="w-full h-auto max-w-[480px] sm:max-w-[560px] md:max-w-[640px] lg:max-w-[720px]"
              />
              
              {/* Floating badges */}
              <motion.div 
                className="absolute left-8 top-1/4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Giving</span>
              </motion.div>
              
              <motion.div 
                className="absolute right-8 bottom-1/3 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <CreditCard className="h-4 w-4 text-[#3B82F6]" />
                <span className="text-sm font-medium">Secure</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Connect Card Section */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Mobile Mockup - Left Side on desktop, bottom on mobile */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 flex justify-center"
          >
            <div className="relative">
              {/* Mockup Image (already includes phone frame) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/features/connect-mockup.png" 
                alt="Connect Card Interface"
                className="w-full h-auto max-w-[480px] sm:max-w-[560px] md:max-w-[640px] lg:max-w-[720px]"
              />
              
              {/* Floating badges */}
              <motion.div 
                className="absolute left-8 top-1/4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Users className="h-4 w-4 text-[#3B82F6]" />
                <span className="text-sm font-medium">New Visitor</span>
              </motion.div>
              
              <motion.div 
                className="absolute right-8 bottom-1/3 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Member</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Description - Right Side on desktop, top on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/10 backdrop-blur-sm text-[#3B82F6] border border-[#3B82F6]/30 px-4 py-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                <span>Digital Connect Card</span>
              </div>
              
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Turn Every Visit into a Lasting Connection
              </h3>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                First-time guests aren&apos;t just visitors — they&apos;re potential members of your church family. In today&apos;s digital world, paper cards get lost, but digital connections last. Altarflow makes it simple for visitors to share their info, receive a warm welcome, and feel part of your mission from day one.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">QR Code Check-In</p>
                    <p className="text-gray-600">Seamless, contact-free check-in that instantly captures visitor information so no one slips through the cracks.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Automated Follow-Up</p>
                    <p className="text-gray-600">Send personalized welcome emails automatically, helping guests feel seen, valued, and invited back.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-green-100 p-1">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Prayer Requests</p>
                    <p className="text-gray-600">Collect and organize prayer needs digitally so your team can respond quickly and show genuine care.</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}