"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function SignInForm() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate authentication delay
    setTimeout(() => {
      // During UI development, we'll skip setting cookies
      setIsLoading(false)
      router.push("/dashboard")
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth:signInForm.emailLabel', 'Email')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('auth:signInForm.emailPlaceholder', 'name@example.com')}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth:signInForm.passwordLabel', 'Password')}</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            {t('auth:signInForm.forgotPasswordLink', 'Forgot password?')}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={t('auth:signInForm.passwordPlaceholder', '••••••••')}
            required
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? t('auth:signInForm.hidePassword', 'Hide password') : t('auth:signInForm.showPassword', 'Show password')}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="sr-only">{showPassword ? t('auth:signInForm.hidePassword', 'Hide password') : t('auth:signInForm.showPassword', 'Show password')}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="remember" />
        <Label
          htmlFor="remember"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t('auth:signInForm.rememberMeLabel', 'Remember me')}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth:signInForm.signingInButton', 'Signing in...')}
          </>
        ) : (
          t('auth:signInForm.signInButton', 'Sign in')
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('auth:signInForm.orContinueWith', 'Or continue with')}</span>
        </div>
      </div>

      <Button variant="outline" type="button" className="w-full">
        {t('auth:signInForm.googleButton', 'Google')}
      </Button>
    </form>
  )
}
