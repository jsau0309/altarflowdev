"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { useTranslation } from 'react-i18next'

export default function ChurchDetailsStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors: Record<string, string> = {}
    if (!data.churchName) newErrors.churchName = t('errors.required')
    if (!data.address) newErrors.address = t('errors.required')
    if (!data.phone) newErrors.phone = t('errors.required')
    if (!data.email) newErrors.email = t('errors.required')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    nextStep()
  }

  return (
    <div>
      <Stepper />

      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step2.title', 'Tell us about your church')}</h2>
        <p className="text-gray-600 mb-8">{t('onboarding.step2.subtitle', 'This information will be used throughout your Altarflow account.')}</p>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="churchName">{t('settings.churchName', 'Church Name')}</Label>
            <Input
              id="churchName"
              value={data.churchName}
              onChange={(e) => {
                updateData({ churchName: e.target.value })
                if (errors.churchName) {
                  setErrors({ ...errors, churchName: "" })
                }
              }}
              placeholder={t('onboarding.step2.churchNamePlaceholder', 'First Baptist Church')}
              className={errors.churchName ? "border-red-500" : ""}
            />
            {errors.churchName && <p className="text-sm text-red-500">{errors.churchName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('settings.churchAddress', 'Address')}</Label>
            <Input
              id="address"
              value={data.address}
              onChange={(e) => {
                updateData({ address: e.target.value })
                if (errors.address) {
                  setErrors({ ...errors, address: "" })
                }
              }}
              placeholder={t('onboarding.step2.addressPlaceholder', 'Start typing to search for an address...')}
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('settings.churchPhone', 'Phone Number')}</Label>
              <Input
                id="phone"
                value={data.phone}
                onChange={(e) => {
                  updateData({ phone: e.target.value })
                  if (errors.phone) {
                    setErrors({ ...errors, phone: "" })
                  }
                }}
                placeholder={t('onboarding.step2.phonePlaceholder', '(555) 123-4567')}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.churchEmail', 'Email Address')}</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => {
                  updateData({ email: e.target.value })
                  if (errors.email) {
                    setErrors({ ...errors, email: "" })
                  }
                }}
                placeholder={t('onboarding.step2.emailPlaceholder', 'hello@yourchurch.org')}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{t('settings.churchWebsite', 'Website')} ({t('optional', 'Optional')})</Label>
            <Input
              id="website"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              placeholder={t('onboarding.step2.websitePlaceholder', 'https://www.yourchurch.org')}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={prevStep}>
              {t('back', 'Back')}
            </Button>
            <Button type="submit">{t('continue', 'Continue')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
