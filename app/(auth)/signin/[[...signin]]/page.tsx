'use client';

import { SignIn } from '@clerk/nextjs';
import Image from "next/image";
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
  const { t } = useTranslation(['common', 'auth', 'dashboard']);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <Image
            src="/images/Altarflow.svg"
            alt="AltarFlow Logo"
            width={200}
            height={60}
            className="mb-8"
          />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('dashboard:welcomeMessage', 'Welcome back')}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {t('auth:signInSubtitle', 'Manage your church with ease. Access donations, members, and reports all in one place.')}
          </p>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center">
            <Image
              src="/images/Altarflow.svg"
              alt="AltarFlow Logo"
              width={150}
              height={45}
            />
          </div>

          <SignIn 
            routing="path" 
            path="/signin"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                formFieldInput: "border-gray-300 dark:border-gray-600",
                socialButtonsBlockButton: "border-gray-300 dark:border-gray-600",
                footerActionLink: "text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              },
              layout: {
                socialButtonsPlacement: "bottom",
                socialButtonsVariant: "blockButton"
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
