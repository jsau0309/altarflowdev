"use client"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"
import { motion } from "framer-motion"
import { GradientText } from "@/components/ui/gradient-text"

export function DemoVideoSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-6 mb-16"
        >
          <GradientText
            colors={["#3B82F6", "#1D4ED8", "#60A5FA", "#3B82F6"]}
            animationSpeed={6}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            See Altarflow in Action
          </GradientText>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Watch how Altarflow transforms church operations with our comprehensive back-office platform
          </p>
        </motion.div>

        {/* Enhanced Video Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-12"
        >
          <div className="relative group">
            {/* Video Container with Enhanced Styling */}
            <div className="relative aspect-video bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
              {/* Subtle Pattern Overlay */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              
              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center space-y-6">
                  {/* Enhanced Play Button */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 cursor-pointer group-hover:bg-white/30 transition-all duration-300"
                  >
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </motion.div>
                  
                  {/* Enhanced Text */}
                  <div className="space-y-3">
                    <h3 className="text-2xl md:text-3xl font-bold">Demo Video Coming Soon</h3>
                    <p className="text-blue-100 text-lg max-w-md mx-auto leading-relaxed">
                      Get an exclusive preview of Altarflow&apos;s powerful features
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
            </div>

            {/* Floating Elements for Visual Interest */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#3B82F6] rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-[#60A5FA] rounded-full opacity-15 animate-pulse delay-1000"></div>
          </div>
        </motion.div>

        {/* Enhanced CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center space-y-6"
        >
          <div className="space-y-4">
            <h4 className="text-xl md:text-2xl font-semibold text-gray-900">
              Ready to see what Altarflow can do for your church?
            </h4>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join our early access program and be among the first to experience the future of church management.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-[#3B82F6] hover:bg-[#2563EB] shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
            >
              Request Early Access
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 border-2 border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all duration-300 rounded-xl bg-transparent"
            >
              Book a Demo Call
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 border-t border-gray-200 mt-12">
            <p className="text-sm text-gray-500 mb-4">Trusted by forward-thinking churches</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Coming Soon
              </div>
              <div className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Early Access
              </div>
              <div className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Beta Program
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Also add a default export as backup
export default DemoVideoSection
