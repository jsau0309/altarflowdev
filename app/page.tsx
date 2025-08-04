"use client"

import type React from "react"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import CircularText from "@/components/ui/circular-text"
import {
  Users,
  BarChart3,
  DollarSign,
  FileText,
  Mail,
  Calendar,
  CreditCard,
  UserPlus,
  Brain,
  MessageCircle,
  Globe,
  Settings,
  Link,
} from "lucide-react"
import NextLink from "next/link"
import { ContainerScroll } from "@/components/landing/container-scroll-animation"
import { HeroTitle, HeroContent } from "@/components/landing/hero-content"
import { MobileResponsiveTimeline } from "@/components/landing/mobile-responsive-timeline"
import { AltarflowFooter } from "@/components/landing/simple-footer"
import { MobileMenu } from "@/components/landing/mobile-menu"
import { LanguageSwitcher } from "@/components/landing/language-switcher"
import { InfiniteSlider } from "@/components/landing/infinite-slider"
import { CTABackgroundPaths } from "@/components/landing/floating-paths"
import { motion } from "framer-motion"

// Enhanced Feature Card Component - For Desktop Only
const EnhancedFeatureCard = ({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) => {
  return (
    <motion.div
      initial={{ y: 4 }}
      whileInView={{ y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: "-150px" }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: "easeOut" } }}
      className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
    >
      <div className={`flex items-center space-x-3 mb-4`}>
        <div className="p-3 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-300">
          {icon}
        </div>
        <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#3B82F6] transition-colors duration-300">
          {title}
        </h4>
      </div>
      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
        {description}
      </p>
    </motion.div>
  )
}

// Feature Slider Card Component
const FeatureSliderCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) => {
  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white">{icon}</div>
        <h4 className="font-semibold text-lg text-gray-900">{title}</h4>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}



export default function LandingPage() {
  const router = useRouter()
  const { t } = useTranslation('landing')

  const timelineData = [
    {
      title: t('features.financialManagement.title'),
      features: [
        {
          icon: <DollarSign className="h-5 w-5" />,
          title: t('features.financialManagement.donationTracking.title'),
          description: t('features.financialManagement.donationTracking.description'),
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: t('features.financialManagement.expenseManagement.title'),
          description: t('features.financialManagement.expenseManagement.description'),
        },
        {
          icon: <BarChart3 className="h-5 w-5" />,
          title: t('features.financialManagement.reportsInsights.title'),
          description: t('features.financialManagement.reportsInsights.description'),
        },
        {
          icon: <CreditCard className="h-5 w-5" />,
          title: t('features.financialManagement.bankingPayouts.title'),
          description: t('features.financialManagement.bankingPayouts.description'),
        },
      ],
      content: (
        <div>
          <p className="text-gray-700 text-base md:text-lg font-medium mb-8 leading-relaxed">
            {t('features.financialManagement.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EnhancedFeatureCard
              icon={<DollarSign className="h-6 w-6" />}
              title={t('features.financialManagement.donationTracking.title')}
              description={t('features.financialManagement.donationTracking.description')}
              delay={0}
            />
            <EnhancedFeatureCard
              icon={<FileText className="h-6 w-6" />}
              title={t('features.financialManagement.expenseManagement.title')}
              description={t('features.financialManagement.expenseManagement.description')}
              delay={0.05}
            />
            <EnhancedFeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title={t('features.financialManagement.reportsInsights.title')}
              description={t('features.financialManagement.reportsInsights.description')}
              delay={0.1}
            />
            <EnhancedFeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title={t('features.financialManagement.bankingPayouts.title')}
              description={t('features.financialManagement.bankingPayouts.description')}
              delay={0.15}
            />
          </div>
        </div>
      ),
    },
    {
      title: t('features.communicationEngagement.title'),
      features: [
        {
          icon: <Mail className="h-5 w-5" />,
          title: t('features.communicationEngagement.newsletterBuilder.title'),
          description: t('features.communicationEngagement.newsletterBuilder.description'),
        },
        {
          icon: <Calendar className="h-5 w-5" />,
          title: t('features.communicationEngagement.scheduledMessaging.title'),
          description: t('features.communicationEngagement.scheduledMessaging.description'),
        },
        {
          icon: <Users className="h-5 w-5" />,
          title: t('features.communicationEngagement.audienceSegmentation.title'),
          description: t('features.communicationEngagement.audienceSegmentation.description'),
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: t('features.communicationEngagement.mediaDesignTools.title'),
          description: t('features.communicationEngagement.mediaDesignTools.description'),
        },
      ],
      content: (
        <div>
          <p className="text-gray-700 text-base md:text-lg font-medium mb-8 leading-relaxed">
            {t('features.communicationEngagement.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EnhancedFeatureCard
              icon={<Mail className="h-6 w-6" />}
              title={t('features.communicationEngagement.newsletterBuilder.title')}
              description={t('features.communicationEngagement.newsletterBuilder.description')}
              delay={0}
            />
            <EnhancedFeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title={t('features.communicationEngagement.scheduledMessaging.title')}
              description={t('features.communicationEngagement.scheduledMessaging.description')}
              delay={0.05}
            />
            <EnhancedFeatureCard
              icon={<Users className="h-6 w-6" />}
              title={t('features.communicationEngagement.audienceSegmentation.title')}
              description={t('features.communicationEngagement.audienceSegmentation.description')}
              delay={0.2}
            />
            <EnhancedFeatureCard
              icon={<FileText className="h-6 w-6" />}
              title={t('features.communicationEngagement.mediaDesignTools.title')}
              description={t('features.communicationEngagement.mediaDesignTools.description')}
              delay={0.15}
            />
          </div>
        </div>
      ),
    },
    {
      title: t('features.memberCommunityManagement.title'),
      features: [
        {
          icon: <Users className="h-5 w-5" />,
          title: t('features.memberCommunityManagement.memberDirectory.title'),
          description: t('features.memberCommunityManagement.memberDirectory.description'),
        },
        {
          icon: <UserPlus className="h-5 w-5" />,
          title: t('features.memberCommunityManagement.visitorTracking.title'),
          description: t('features.memberCommunityManagement.visitorTracking.description'),
        },
        {
          icon: <Link className="h-5 w-5" />,
          title: t('features.memberCommunityManagement.donorLinking.title'),
          description: t('features.memberCommunityManagement.donorLinking.description'),
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: t('features.memberCommunityManagement.flowsForms.title'),
          description: t('features.memberCommunityManagement.flowsForms.description'),
        },
      ],
      content: (
        <div>
          <p className="text-gray-700 text-base md:text-lg font-medium mb-8 leading-relaxed">
            {t('features.memberCommunityManagement.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EnhancedFeatureCard
              icon={<Users className="h-6 w-6" />}
              title={t('features.memberCommunityManagement.memberDirectory.title')}
              description={t('features.memberCommunityManagement.memberDirectory.description')}
              delay={0}
            />
            <EnhancedFeatureCard
              icon={<UserPlus className="h-6 w-6" />}
              title={t('features.memberCommunityManagement.visitorTracking.title')}
              description={t('features.memberCommunityManagement.visitorTracking.description')}
              delay={0.05}
            />
            <EnhancedFeatureCard
              icon={<Link className="h-6 w-6" />}
              title={t('features.memberCommunityManagement.donorLinking.title')}
              description={t('features.memberCommunityManagement.donorLinking.description')}
              delay={0.1}
            />
            <EnhancedFeatureCard
              icon={<FileText className="h-6 w-6" />}
              title={t('features.memberCommunityManagement.flowsForms.title')}
              description={t('features.memberCommunityManagement.flowsForms.description')}
              delay={0.15}
            />
          </div>
        </div>
      ),
    },
    {
      title: t('features.smartAdministration.title'),
      features: [
        {
          icon: <Brain className="h-5 w-5" />,
          title: t('features.smartAdministration.aiMonthlySummary.title'),
          description: t('features.smartAdministration.aiMonthlySummary.description'),
        },
        {
          icon: <MessageCircle className="h-5 w-5" />,
          title: t('features.smartAdministration.aiQAInsights.title'),
          description: t('features.smartAdministration.aiQAInsights.description'),
        },
        {
          icon: <Globe className="h-5 w-5" />,
          title: t('features.smartAdministration.customizableLandingPage.title'),
          description: t('features.smartAdministration.customizableLandingPage.description'),
        },
        {
          icon: <Settings className="h-5 w-5" />,
          title: t('features.smartAdministration.accountSettingsControl.title'),
          description: t('features.smartAdministration.accountSettingsControl.description'),
        },
      ],
      content: (
        <div>
          <p className="text-gray-700 text-base md:text-lg font-medium mb-8 leading-relaxed">
            {t('features.smartAdministration.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EnhancedFeatureCard
              icon={<Brain className="h-6 w-6" />}
              title={t('features.smartAdministration.aiMonthlySummary.title')}
              description={t('features.smartAdministration.aiMonthlySummary.description')}
              delay={0}
            />
            <EnhancedFeatureCard
              icon={<MessageCircle className="h-6 w-6" />}
              title={t('features.smartAdministration.aiQAInsights.title')}
              description={t('features.smartAdministration.aiQAInsights.description')}
              delay={0.05}
            />
            <EnhancedFeatureCard
              icon={<Globe className="h-6 w-6" />}
              title={t('features.smartAdministration.customizableLandingPage.title')}
              description={t('features.smartAdministration.customizableLandingPage.description')}
              delay={0.1}
            />
            <EnhancedFeatureCard
              icon={<Settings className="h-6 w-6" />}
              title={t('features.smartAdministration.accountSettingsControl.title')}
              description={t('features.smartAdministration.accountSettingsControl.description')}
              delay={0.15}
            />
          </div>
        </div>
      ),
    },
  ]

  // All features for the slider
  const allFeatures = [
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: t('features.financialManagement.donationTracking.title'),
      description: t('features.financialManagement.donationTracking.description'),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: t('features.financialManagement.expenseManagement.title'),
      description: t('features.financialManagement.expenseManagement.description'),
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: t('features.financialManagement.reportsInsights.title'),
      description: t('features.financialManagement.reportsInsights.description'),
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: t('features.financialManagement.bankingPayouts.title'),
      description: t('features.financialManagement.bankingPayouts.description'),
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: t('features.communicationEngagement.newsletterBuilder.title'),
      description: t('features.communicationEngagement.newsletterBuilder.description'),
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: t('features.communicationEngagement.scheduledMessaging.title'),
      description: t('features.communicationEngagement.scheduledMessaging.description'),
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: t('features.communicationEngagement.audienceSegmentation.title'),
      description: t('features.communicationEngagement.audienceSegmentation.description'),
    },
    {
      icon: <UserPlus className="h-5 w-5" />,
      title: t('features.memberCommunityManagement.visitorTracking.title'),
      description: t('features.memberCommunityManagement.visitorTracking.description'),
    },
    { 
      icon: <Link className="h-5 w-5" />, 
      title: t('features.memberCommunityManagement.donorLinking.title'), 
      description: t('features.memberCommunityManagement.donorLinking.description') 
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: t('features.smartAdministration.aiMonthlySummary.title'),
      description: t('features.smartAdministration.aiMonthlySummary.description'),
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: t('features.smartAdministration.aiQAInsights.title'),
      description: t('features.smartAdministration.aiQAInsights.description'),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: t('features.smartAdministration.customizableLandingPage.title'),
      description: t('features.smartAdministration.customizableLandingPage.description'),
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            <img src="/altarflow-logo.svg" alt="Altarflow" className="w-[191px] h-[45px]" />
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              <LanguageSwitcher />
              <NextLink
                href="#features"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t('header.features')}
              </NextLink>
              <NextLink
                href="#demo"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t('header.demo')}
              </NextLink>
            </nav>

            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                className="hidden md:inline-flex text-gray-600 hover:text-gray-900"
                onClick={() => router.push('/signin')}
              >
                {t('header.signIn')}
              </Button>
              <Button 
                className="hidden md:inline-flex bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2"
                onClick={() => router.push('/waitlist-full')}
              >
                {t('header.getStarted')}
              </Button>
              <MobileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white">
        <ContainerScroll titleComponent={<HeroTitle />}>
          <HeroContent />
        </ContainerScroll>
      </div>

      {/* Features Section - Timeline */}
      <section id="features">
        <MobileResponsiveTimeline data={timelineData} />
      </section>

      {/* Demo Video Section - Simple Placeholder */}
      <section id="demo" className="py-20 md:py-32 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {t('demo.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
              {t('demo.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative aspect-video bg-gray-200 rounded-2xl overflow-hidden shadow-2xl">
              {/* Placeholder for demo video */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8]">
                <div className="text-center text-white">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">{t('demo.videoPlaceholder.title')}</h3>
                  <p className="text-blue-100">{t('demo.videoPlaceholder.description')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Infinite Slider */}
          <div className="mb-12">
            <InfiniteSlider gap={24} duration={39} durationOnHover={39} className="py-4">
              {allFeatures.map((feature, index) => (
                <FeatureSliderCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </InfiniteSlider>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="text-xl px-10 py-7 bg-[#3B82F6] hover:bg-[#2563EB]"
              onClick={() => router.push('/waitlist-full')}
            >
              {t('demo.requestAccess')}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Enhanced with Better Gradient + Animated Paths */}
      <section className="relative py-20 md:py-32 text-white overflow-hidden">
        {/* Enhanced Animated Gradient Background - More Visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#3B82F6] via-[#1D4ED8] to-[#1E40AF] animate-gradient bg-[length:400%_400%]"></div>

        {/* Animated Paths Background */}
        <CTABackgroundPaths />

        {/* Content */}
        <div className="container px-4 md:px-6 text-center relative z-10">
          <div className="space-y-8 max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            >
              {t('cta.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-blue-100"
            >
              {t('cta.description')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-6"
                onClick={() => router.push('/book-demo')}
              >
                {t('cta.bookDemo')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#3B82F6] bg-transparent"
                onClick={() => router.push('/waitlist-full')}
              >
                {t('cta.joinWaitlist')}
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="flex justify-center items-center"
            >
              <CircularText
                text={t('cta.circularText')}
                spinDuration={25}
                className="text-blue-200 text-lg font-semibold"
                size={280}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <AltarflowFooter />
    </div>
  )
}