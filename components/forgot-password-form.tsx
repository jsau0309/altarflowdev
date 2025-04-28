"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const { t } = useTranslation('auth')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email. Please try again.');
      } else {
        setMessage(data.message || 'Password reset email sent. Please check your inbox.');
        // Optionally clear the form or disable the button further
        // e.currentTarget.reset(); // Clear form on success
      }
    } catch (err) {
      console.error("Forgot password fetch error:", err)
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded-md">
          {message}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth:forgotPasswordForm.emailLabel', 'Email')}</Label>
        <Input
          name="email"
          id="email"
          type="email"
          placeholder={t('auth:forgotPasswordForm.emailPlaceholder', 'name@example.com')}
          required
          autoComplete="email"
          disabled={!!message} // Disable input after success message
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !!message}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth:forgotPasswordForm.sendingButton', 'Sending...')}
          </>
        ) : (
          t('auth:forgotPasswordForm.sendButton', 'Send Reset Link')
        )}
      </Button>
    </form>
  )
}
