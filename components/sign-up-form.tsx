"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function SignUpForm() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate registration delay
    setTimeout(() => {
      // During UI development, we'll skip setting cookies
      setIsLoading(false)
      router.push("/dashboard")
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t('auth:signUpForm.firstNameLabel', 'First name')}</Label>
          <Input id="firstName" placeholder={t('auth:signUpForm.firstNamePlaceholder', 'John')} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t('auth:signUpForm.lastNameLabel', 'Last name')}</Label>
          <Input id="lastName" placeholder={t('auth:signUpForm.lastNamePlaceholder', 'Doe')} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="churchName">{t('auth:signUpForm.churchNameLabel', 'Church name')}</Label>
        <Input
          id="churchName"
          placeholder={t('auth:signUpForm.churchNamePlaceholder', 'Faith Community Church')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth:signUpForm.emailLabel', 'Email')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('auth:signUpForm.emailPlaceholder', 'name@example.com')}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth:signUpForm.passwordLabel', 'Password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={t('auth:signUpForm.passwordPlaceholder', '••••••••')}
            required
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? t('auth:signUpForm.hidePassword', 'Hide password') : t('auth:signUpForm.showPassword', 'Show password')}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="sr-only">{showPassword ? t('auth:signUpForm.hidePassword', 'Hide password') : t('auth:signUpForm.showPassword', 'Show password')}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="terms" required />
        <Label
          htmlFor="terms"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t('auth:signUpForm.termsAgree', 'I agree to the')}{" "}
          <a href="/terms" className="text-primary hover:underline">
            {t('auth:signUpForm.termsLink', 'terms of service')}
          </a>{" "}
          {t('auth:signUpForm.termsAnd', 'and')}{" "}
          <a href="/privacy" className="text-primary hover:underline">
            {t('auth:signUpForm.privacyLink', 'privacy policy')}
          </a>
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth:signUpForm.creatingAccountButton', 'Creating account...')}
          </>
        ) : (
          t('auth:signUpForm.createAccountButton', 'Create account')
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('auth:signUpForm.orContinueWith', 'Or continue with')}</span>
        </div>
      </div>

      <Button variant="outline" type="button" className="w-full">
        {t('auth:signUpForm.googleButton', 'Google')}
      </Button>
    </form>
  )
}
