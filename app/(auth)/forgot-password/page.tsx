'use client';

import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next'

export default function ForgotPasswordPage() {
  const { t } = useTranslation(['common', 'auth']);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{t('appName')}</span>
        </div>
        <h1 className="text-2xl font-bold text-center">{t('auth:forgotPassword')}</h1>
        <p className="text-muted-foreground text-center">
          {t('auth:resetPasswordInstructions')}
        </p>
        <ForgotPasswordForm />

        <div className="mt-8 text-center text-sm text-muted-foreground">
            {t('auth:rememberPasswordPrompt', 'Remember your password?')}
            <Link href="/signin" className="font-medium text-primary hover:underline">
                {t('auth:backToSignIn', 'Back to sign in')}
            </Link>
        </div>
      </div>
    </div>
  )
}
