'use client';

import { DotPattern } from '@/components/ui/dot-pattern';
import Link from 'next/link';
import Script from 'next/script';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/error-boundary';

export default function BookDemoPage() {
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
        <span className="text-sm font-medium">{t('bookDemo.backToHome')}</span>
      </Link>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('bookDemo.badge')}
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {t('bookDemo.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('bookDemo.subtitle')}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-16 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('bookDemo.whatToExpect')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t('bookDemo.benefit1.title')}</h3>
                <p className="text-gray-600">{t('bookDemo.benefit1.description')}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t('bookDemo.benefit2.title')}</h3>
                <p className="text-gray-600">{t('bookDemo.benefit2.description')}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t('bookDemo.benefit3.title')}</h3>
                <p className="text-gray-600">{t('bookDemo.benefit3.description')}</p>
              </div>
            </div>
          </div>

          {/* Calendly Widget */}
          <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            <ErrorBoundary
              fallback={({ reset }) => (
                <div className="flex items-center justify-center h-[700px] p-8">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Unable to load calendar</h3>
                    <p className="text-gray-600 max-w-md">
                      We&apos;re having trouble loading the booking calendar. Please try again or email us at support@altarflow.com to schedule a demo.
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
              <div 
                className="calendly-inline-widget rounded-xl overflow-hidden" 
                data-url={`https://${process.env.NEXT_PUBLIC_CALENDLY_URL || 'calendly.com/altarflow/altarflow-demo'}?hide_event_type_details=1`}
                style={{ minWidth: '320px', height: '700px' }}
              />
            </ErrorBoundary>
          </div>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {t('bookDemo.cantFindTime')} <a href="mailto:support@altarflow.com" className="text-blue-600 hover:text-blue-700 font-medium">{t('bookDemo.emailUs')}</a> {t('bookDemo.scheduleCustom')}
            </p>
          </div>
        </div>
      </div>

      {/* Load Calendly Widget Script */}
      <Script 
        src="https://assets.calendly.com/assets/external/widget.js" 
        async
      />
      
      {/* Custom Calendly Styles */}
      <style jsx global>{`
        .calendly-inline-widget {
          background: transparent !important;
        }
        
        .calendly-inline-widget iframe {
          border-radius: 0.75rem !important;
        }
      `}</style>
    </div>
  );
}