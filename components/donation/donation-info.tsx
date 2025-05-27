"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { DonationFormData } from "./donation-form";
import { useTranslation } from 'react-i18next';

interface DonationInfoProps {
  formData: DonationFormData
  updateFormData: (data: Partial<DonationFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function DonationInfo({ formData, updateFormData, onNext, onBack }: DonationInfoProps) {
  const { t } = useTranslation(['donations', 'members', 'common']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  // Calculate display amount based on formData
  const baseAmount = formData.amount || 0;
  let displayAmount = baseAmount;
  if (formData.coverFees && baseAmount > 0) {
    const fee = (baseAmount * 0.029) + 0.30;
    displayAmount = baseAmount + fee;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">$</div>
        <div className="text-4xl font-bold text-center text-gray-900 dark:text-white">{displayAmount.toFixed(2)}</div>
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">{t('common:currency.usd', 'USD')}</div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('members:firstName', 'First Name')}</Label>
            <Input
              id="firstName"
              value={formData.firstName || ""}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              required={!formData.isAnonymous}
              disabled={formData.isAnonymous}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t('members:lastName', 'Last Name')}</Label>
            <Input
              id="lastName"
              value={formData.lastName || ""}
              onChange={(e) => updateFormData({ lastName: e.target.value })}
              required={!formData.isAnonymous}
              disabled={formData.isAnonymous}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="anonymous"
            checked={formData.isAnonymous || false}
            onCheckedChange={(checked) => updateFormData({ isAnonymous: !!checked })}
          />
          <Label htmlFor="anonymous" className="text-sm font-normal">
            {t('donations:donationInfo.anonymousLabel', 'Donate anonymously')}
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('members:email', 'Email')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => updateFormData({ email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('members:phone', 'Phone')}</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => updateFormData({ phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('members:address', 'Address')}</Label>
          <Input
            id="address"
            value={formData.address || ""}
            onChange={(e) => updateFormData({ address: e.target.value })}
            placeholder={t('members:streetAddressPlaceholder', 'Street address')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city">{t('members:city', 'City')}</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => updateFormData({ city: e.target.value })}
              placeholder={t('members:cityPlaceholder', 'City')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">{t('members:state', 'State / Province')}</Label>
            <Input
              id="state"
              value={formData.state || ""}
              onChange={(e) => updateFormData({ state: e.target.value })}
              placeholder={t('members:statePlaceholder', 'State / Province')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">{t('members:zipCode', 'Zip / Postal Code')}</Label>
            <Input
              id="zipCode"
              value={formData.zipCode || ""}
              onChange={(e) => updateFormData({ zipCode: e.target.value })}
              placeholder={t('members:zipCodePlaceholder', 'Zip / Postal Code')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">{t('members:country', 'Country')}</Label>
          <Input
            id="country"
            value={formData.country || ""}
            onChange={(e) => updateFormData({ country: e.target.value })}
            placeholder={t('members:countryPlaceholder', 'Country')}
          />
        </div>
      </div>

      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          {t('common:back', 'Back')}
        </Button>
        <Button type="submit" className="flex-1">
          {t('common:next', 'Next')}
        </Button>
      </div>
    </form>
  )
}
