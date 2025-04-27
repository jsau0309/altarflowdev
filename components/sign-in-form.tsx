"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function SignInForm() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          setError(data.error || 'Login failed. Please check your credentials.');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } catch (err) {
        console.error("Login fetch error:", err);
        setError('An unexpected error occurred during login.');
      } finally {
        setIsLoading(false);
      }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        console.error("Google Sign-In Error:", error.message);
        setError(error.message || 'Failed to initiate Google Sign-In.');
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google Sign-In Exception:", err);
      setError('An unexpected error occurred initiating Google Sign-In.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth:signInForm.emailLabel', 'Email')}</Label>
        <Input
          name="email"
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
            name="password"
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

      <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
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

      <Button 
        variant="outline" 
        type="button" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={isLoading || isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
          </>
        )}
        {t('auth:signInForm.googleButton', 'Google')}
      </Button>
    </form>
  )
}
