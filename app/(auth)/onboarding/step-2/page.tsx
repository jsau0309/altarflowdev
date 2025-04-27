"use client"

import type React from "react"
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { z } from 'zod';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { useTranslation } from 'react-i18next'
import { Loader2 } from "lucide-react"

import { completeOnboardingAction, type OnboardingFormState } from '../actions';

const initialState: OnboardingFormState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('continue', 'Continue')}
    </Button>
  );
}

export default function ChurchDetailsStep() {
  const { data, updateData, prevStep } = useOnboarding()
  const { t } = useTranslation()

  const [state, formAction] = useFormState(completeOnboardingAction, initialState);

  const getFieldError = (fieldName: string): string | undefined => {
    return state.errors?.find((err: z.ZodIssue) => err.path.includes(fieldName))?.message;
  };

  return (
    <div>
      <Stepper />

      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step2.title', 'Tell us about your church')}</h2>
        <p className="text-gray-600 mb-8">{t('onboarding.step2.subtitle', 'This information will be used throughout your Altarflow account.')}</p>

        {!state.success && state.message && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="churchName">{t('settings.churchName', 'Church Name')}</Label>
            <Input
              id="churchName"
              name="churchName"
              value={data.churchName}
              onChange={(e) => updateData({ churchName: e.target.value })}
              placeholder={t('onboarding.step2.churchNamePlaceholder', 'First Baptist Church')}
              className={getFieldError('churchName') ? "border-red-500" : ""}
              aria-invalid={!!getFieldError('churchName')}
              aria-describedby={getFieldError('churchName') ? "churchName-error" : undefined}
            />
            {getFieldError('churchName') && <p id="churchName-error" className="text-sm text-red-500">{getFieldError('churchName')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('settings.churchAddress', 'Address')}</Label>
            <Input
              id="address"
              name="address"
              value={data.address}
              onChange={(e) => updateData({ address: e.target.value })}
              placeholder={t('onboarding.step2.addressPlaceholder', 'Start typing to search for an address...')}
              className={getFieldError('address') ? "border-red-500" : ""}
              aria-invalid={!!getFieldError('address')}
              aria-describedby={getFieldError('address') ? "address-error" : undefined}
            />
            {getFieldError('address') && <p id="address-error" className="text-sm text-red-500">{getFieldError('address')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('settings.churchPhone', 'Phone Number')}</Label>
              <Input
                id="phone"
                name="phone"
                value={data.phone}
                onChange={(e) => updateData({ phone: e.target.value })}
                placeholder={t('onboarding.step2.phonePlaceholder', '(555) 123-4567')}
                className={getFieldError('phone') ? "border-red-500" : ""}
                aria-invalid={!!getFieldError('phone')}
                aria-describedby={getFieldError('phone') ? "phone-error" : undefined}
              />
              {getFieldError('phone') && <p id="phone-error" className="text-sm text-red-500">{getFieldError('phone')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.churchEmail', 'Email Address')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={data.email}
                onChange={(e) => updateData({ email: e.target.value })}
                placeholder={t('onboarding.step2.emailPlaceholder', 'hello@yourchurch.org')}
                className={getFieldError('email') ? "border-red-500" : ""}
                aria-invalid={!!getFieldError('email')}
                aria-describedby={getFieldError('email') ? "email-error" : undefined}
              />
              {getFieldError('email') && <p id="email-error" className="text-sm text-red-500">{getFieldError('email')}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{t('settings.churchWebsite', 'Website')} ({t('optional', 'Optional')})</Label>
            <Input
              id="website"
              name="website"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              placeholder={t('onboarding.step2.websitePlaceholder', 'https://www.yourchurch.org')}
              className={getFieldError('website') ? "border-red-500" : ""}
              aria-invalid={!!getFieldError('website')}
              aria-describedby={getFieldError('website') ? "website-error" : undefined}
            />
            {getFieldError('website') && <p id="website-error" className="text-sm text-red-500">{getFieldError('website')}</p>}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={prevStep} disabled={useFormStatus().pending}>
              {t('back', 'Back')}
            </Button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}
