"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ForgotPasswordForm() {
  const { t } = useTranslation('auth')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API request
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 1500)
  }

  if (isSubmitted) {
    return (
      <Alert>
        <AlertDescription>
          {t('auth:forgotPasswordForm.successMessage', 'If an account exists for {email}, you will receive an email with instructions on how to reset your password.', { email })}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth:forgotPasswordForm.emailLabel', 'Email')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('auth:forgotPasswordForm.emailPlaceholder', 'name@example.com')}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth:forgotPasswordForm.sendingButton', 'Sending reset link...')}
          </>
        ) : (
          t('auth:forgotPasswordForm.sendButton', 'Send reset link')
        )}
      </Button>
    </form>
  )
}
