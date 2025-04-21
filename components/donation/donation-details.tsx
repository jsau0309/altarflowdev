"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { DonationFormData } from "./donation-form"
import { useTranslation } from 'react-i18next'

interface DonationDetailsProps {
  formData: DonationFormData
  updateFormData: (data: Partial<DonationFormData>) => void
  onNext: () => void
}

export default function DonationDetails({ formData, updateFormData, onNext }: DonationDetailsProps) {
  const [amount, setAmount] = useState<string>(formData.amount?.toString() || "")
  const { t } = useTranslation(['donations', 'campaigns', 'common'])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFormData({ amount: Number.parseFloat(amount) || 0 })
    onNext()
  }

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, "")
    const parts = sanitizedValue.split(".")
    const formattedValue = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitizedValue
    setAmount(formattedValue)
  }

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString())
  }

  const handleCampaignChange = (value: string) => {
    const campaignName = value === "tithe" ? t('campaigns:campaign.tithe', 'Tithe') : t('campaigns:campaign.general', 'General Offering')
    updateFormData({ campaignId: value, campaignName })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs
        defaultValue="one-time"
        value={formData.donationType}
        onValueChange={(value) => updateFormData({ donationType: value as "one-time" | "recurring" })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="one-time">{t('donations:donations.types.oneTime', 'One Time')}</TabsTrigger>
          <TabsTrigger value="recurring">{t('donations:donations.types.recurring', 'Recurring')}</TabsTrigger>
        </TabsList>
        <TabsContent value="one-time" className="pt-4">
          {/* One-time donation options */}
        </TabsContent>
        <TabsContent value="recurring" className="pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">{t('donations:frequency', 'Frequency')}</Label>
              <Select
                value={formData.frequency || "monthly"}
                onValueChange={(value) => updateFormData({ frequency: value as any })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder={t('common:selectFrequency', 'Select frequency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('donations:frequencies.weekly', 'Weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('donations:frequencies.monthly', 'Monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('donations:frequencies.quarterly', 'Quarterly')}</SelectItem>
                  <SelectItem value="annually">{t('donations:frequencies.annually', 'Annually')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between">
        <div className="text-2xl font-medium">$</div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-full text-center text-4xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="0"
        />
        <div className="text-2xl font-medium">{t('common:currency.usd', 'USD')}</div>
      </div>

      <div className="text-sm text-center text-gray-500 dark:text-gray-400">
        {t('donations:donationDetails.amountPrompt', 'Enter an amount or make a quick selection below')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button type="button" variant="outline" onClick={() => handleQuickAmount(50)}>
          $50
        </Button>
        <Button type="button" variant="outline" onClick={() => handleQuickAmount(100)}>
          $100
        </Button>
        <Button type="button" variant="outline" onClick={() => handleQuickAmount(500)}>
          $500
        </Button>
        <Button type="button" variant="outline" onClick={() => handleQuickAmount(1000)}>
          $1,000
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign">{t('donations:donationDetails.selectCampaignLabel', 'Select a campaign')}</Label>
        <Select value={formData.campaignId || "tithe"} onValueChange={handleCampaignChange}>
          <SelectTrigger id="campaign">
            <SelectValue placeholder={t('donations:donationDetails.selectCampaignPlaceholder', 'Select a campaign')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tithe">{t('campaigns:campaign.tithe', 'Tithe')}</SelectItem>
            <SelectItem value="general">{t('campaigns:campaign.general', 'General Offering')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        {t('common:next', 'Next')}
      </Button>
    </form>
  )
}
