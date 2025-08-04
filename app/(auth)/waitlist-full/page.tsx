'use client';

import { Widget } from '@typeform/embed-react';
import { DotPattern } from '@/components/ui/dot-pattern';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'isomorphic-dompurify';
import { ErrorBoundary } from '@/components/error-boundary';

export default function WaitlistFullPage() {
  const { t } = useTranslation('auth');

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
        <span className="text-sm font-medium">{t('waitlist.backToHome')}</span>
      </Link>
      
      {/* Left Panel - Why Join */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 w-full max-w-lg">
          <div className="space-y-8">
            {/* Main heading */}
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('waitlist.badge')}
              </div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                {t('waitlist.title')}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {t('waitlist.subtitle')}
              </p>
            </div>
            
            {/* Join Today & Unlock */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('waitlist.joinToday')}</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{t('waitlist.benefit1.title')}</h3>
                    <p className="text-gray-600 mt-1">{t('waitlist.benefit1.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{t('waitlist.benefit2.title')}</h3>
                    <p className="text-gray-600 mt-1">{t('waitlist.benefit2.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{t('waitlist.benefit3.title')}</h3>
                    <p className="text-gray-600 mt-1">{t('waitlist.benefit3.description')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgency message */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-700 font-medium pt-6">
                {t('waitlist.urgency')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Waitlist Form */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl space-y-6">
          {/* Call to action title */}
          <div className="text-center mt-6 lg:mt-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('waitlist.callToAction')}
            </h2>
          </div>
          
          {/* Mobile Context - Only shown on small screens */}
          <div className="block lg:hidden bg-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('waitlist.mobileContext.title')}</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('waitlist.mobileContext.benefit1')) }} />
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('waitlist.mobileContext.benefit2')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('waitlist.mobileContext.benefit3')}</span>
              </li>
            </ul>
            <p className="text-xs text-gray-600 italic">{t('waitlist.mobileContext.instruction')}</p>
          </div>
          
          {/* Typeform Widget */}
          <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <ErrorBoundary
              fallback={({ reset }) => (
                <div className="flex items-center justify-center h-[650px] p-8">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Unable to load form</h3>
                    <p className="text-gray-600 max-w-md">
                      We're having trouble loading the waitlist form. Please try again or email us at support@altarflow.com
                    </p>
                    <button
                      onClick={reset}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            >
              <Widget 
                id={process.env.NEXT_PUBLIC_TYPEFORM_ID || 'aTN8vvz5'}
                style={{ width: '100%', height: '650px' }}
                className="typeform-widget"
                hideHeaders={true}
                hideFooter={true}
                opacity={100}
                onSubmit={() => {
                  // You can add analytics or tracking here
                }}
              />
            </ErrorBoundary>
          </div>
          
          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {t('waitlist.footer')}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-700 transition-colors">
                {t('common:footer.privacy')}
              </Link>
              <span className="text-gray-400">•</span>
              <Link href="/terms-of-service" className="text-gray-500 hover:text-gray-700 transition-colors">
                {t('common:footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}