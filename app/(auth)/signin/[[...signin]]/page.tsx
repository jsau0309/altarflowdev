'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect } from 'react';
import { DotPattern } from '@/components/ui/dot-pattern';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { safeStorage } from '@/lib/safe-storage';

export default function SignInPage() {
  const { t } = useTranslation('auth');

  useEffect(() => {
    // Set a flag when on sign-in page
    safeStorage.setItem('justSignedIn', 'true', 'sessionStorage');
    // Clear dashboard loaded flag
    safeStorage.removeItem('dashboardLoaded', 'sessionStorage');
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50">
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
        <span className="text-sm font-medium">{t('signin.backToHome')}</span>
      </Link>
      
      {/* Centered Sign In Form */}
      <div className="relative z-10 w-full max-w-md px-4">
        <SignIn 
          routing="path" 
          path="/signin"
          forceRedirectUrl="/dashboard?from=signin"
          signUpUrl="/signup"
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
        
        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-600">
            {t('signin.footer')}
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
  )
}
