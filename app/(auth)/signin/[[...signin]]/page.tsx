'use client';

// import { SignInForm } from "@/components/sign-in-form"
import { SignIn } from '@clerk/nextjs';
import { Building2 } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
  const { t } = useTranslation(['common', 'auth', 'dashboard']);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">{t('appName')}</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard:welcomeMessage')}</h1>
          <p className="text-muted-foreground mt-2">{t('auth:loginButton')}</p>
        </div>

        {/* <SignInForm /> */ }
        <SignIn routing="path" path="/signin" afterSignInUrl="/dashboard" />
      </div>
    </div>
  )
}
