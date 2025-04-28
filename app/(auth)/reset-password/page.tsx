'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'

// Wrapper component to access searchParams within Suspense boundary
function ResetPasswordContent() {
  const { t } = useTranslation(['common', 'auth']);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">{t('appName')}</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth:resetPassword.title', 'Reset Your Password')}</h1>
          <p className="text-muted-foreground mt-2">{t('auth:resetPassword.subtitle', 'Enter your new password below.')}</p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="text-center text-destructive">
            <p>{t('auth:resetPassword.missingToken', 'Password reset token is missing or invalid.')}</p>
            <Link href="/forgot-password" className="text-sm underline mt-2 inline-block">
              {t('auth:resetPassword.requestAgain', 'Request a new reset link')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component uses Suspense
export default function ResetPasswordPage() {
  // Wrap the content in Suspense because useSearchParams() needs it
  // when used in a page rendered by the server initially.
  return (
    <Suspense fallback={<div>Loading...</div>}> 
      <ResetPasswordContent />
    </Suspense>
  );
} 