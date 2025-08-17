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
      
      {/* Full Width Content */}
      <div className="relative flex flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t('waitlist.badge')}
            </div>
            
            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              {t('waitlist.title')}
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('waitlist.subtitle')}
            </p>
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
                      We&apos;re having trouble loading the waitlist form. Please try again or email us at support@altarflow.com
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