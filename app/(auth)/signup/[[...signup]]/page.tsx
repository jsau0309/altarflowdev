'use client';

import { SignUp } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
import { DotPattern } from '@/components/ui/dot-pattern';
import Link from 'next/link';

export default function SignUpPage() {
  const { t } = useTranslation(['common', 'auth']);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gray-50">
      {/* Dot Pattern Background */}
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className="fill-blue-500/20"
      />
      
      {/* Back to Home Button */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 19l-7-7m0 0l7-7m-7 7h18" 
          />
        </svg>
        <span className="text-sm font-medium">{t('auth:signup.backToHome')}</span>
      </Link>
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 w-full max-w-lg">
          <div className="space-y-8">
            {/* Main heading */}
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                {t('auth:welcomeToAltarFlow', 'Welcome to AltarFlow')}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {t('auth:signUpBenefit', 'Join thousands of churches managing their operations efficiently with our all-in-one platform.')}
              </p>
            </div>
            
            {/* Benefits with icons */}
            <div className="space-y-6 pt-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{t('auth:benefit1Title', 'Track donations')}</h3>
                  <p className="text-gray-600 mt-1">{t('auth:benefit1Desc', 'Generate receipts and financial reports automatically')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{t('auth:benefit2Title', 'Manage members')}</h3>
                  <p className="text-gray-600 mt-1">{t('auth:benefit2Desc', 'Keep member information organized and accessible')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{t('auth:benefit3Title', 'AI insights')}</h3>
                  <p className="text-gray-600 mt-1">{t('auth:benefit3Desc', 'Get intelligent summaries of your church data')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Sign Up Form */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <SignUp 
            routing="path" 
            path="/signup"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white rounded-2xl shadow-xl p-8 border border-gray-100",
                logoImage: "h-12 w-auto",
                headerTitle: "hidden",
                headerSubtitle: "text-gray-600 mt-2",
                formButtonPrimary: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-all duration-200",
                formFieldInput: "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                formFieldLabel: "text-gray-700 font-medium",
                socialButtonsBlockButton: "border-gray-300 hover:border-gray-400 transition-colors",
                socialButtonsBlockButtonText: "font-medium",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-500 text-sm",
                footerActionLink: "text-blue-500 hover:text-blue-600 font-medium",
                identityPreviewText: "text-gray-600",
                identityPreviewEditButton: "text-blue-500 hover:text-blue-600"
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
                logoImageUrl: "/images/Altarflow.svg",
                logoPlacement: "inside"
              },
              variables: {
                borderRadius: "0.75rem",
                colorPrimary: "#3B82F6",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
