'use client';

// import { SignUpForm } from "@/components/sign-up-form"; // <-- Remove old form import
import { SignUp } from '@clerk/nextjs'; // <-- Import Clerk component
import { Building2 } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next'

export default function SignUpPage() {
  const { t } = useTranslation(['common', 'auth']);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">{t('appName')}</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth:createAccount')}</h1>
          <p className="text-muted-foreground mt-2">{t('auth:signUpSubtitle', 'Sign up to start managing your church')}</p>
        </div>

        <SignUp routing="path" path="/signup" afterSignUpUrl="/onboarding/step-1" />
      </div>
    </div>
  )
}
