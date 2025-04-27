"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError(t('auth:resetPasswordForm.passwordMismatch', 'Passwords do not match.'));
      setIsLoading(false)
      return;
    }

    if (!password) {
      setError(t('auth:resetPasswordForm.passwordRequired', 'Password is required.'));
      setIsLoading(false)
      return;
    }

    try {
      // Supabase handles the user context from the session automatically
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || t('auth:resetPasswordForm.updateFailed', 'Failed to update password. Please try again.'));
      } else {
        setMessage(t('auth:resetPasswordForm.updateSuccess', 'Password updated successfully! Redirecting to login...'));
        // Redirect to signin after a short delay
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      }
    } catch (err) {
      console.error("Reset password update error:", err)
      setError(t('auth:resetPasswordForm.unexpectedError', 'An unexpected error occurred.'));
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
      {/* Only show form if no success message */}
      {!message && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth:resetPasswordForm.newPasswordLabel', 'New Password')}</Label>
            <div className="relative">
              <Input
                name="password"
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('auth:signUpForm.hidePassword', 'Hide password') : t('auth:signUpForm.showPassword', 'Show password')}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth:resetPasswordForm.confirmPasswordLabel', 'Confirm New Password')}</Label>
            <div className="relative">
              <Input
                name="confirmPassword"
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
               <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? t('auth:signUpForm.hidePassword', 'Hide password') : t('auth:signUpForm.showPassword', 'Show password')}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth:resetPasswordForm.updatingButton', 'Updating Password...')}
              </>
            ) : (
              t('auth:resetPasswordForm.updateButton', 'Update Password')
            )}
          </Button>
        </>
      )}
    </form>
  )
} 