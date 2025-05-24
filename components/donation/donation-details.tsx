"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Label } from "@/components/ui/label"
import type { DonationFormData } from "./donation-form"
import { useTranslation } from 'react-i18next'
import { DonationType } from "@prisma/client"; // Added import

interface DonationDetailsProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onNext: () => void;
  donationTypes: DonationType[]; // Added new prop
}

export default function DonationDetails({ formData, updateFormData, onNext, donationTypes }: DonationDetailsProps) { // Destructure donationTypes
  const [amount, setAmount] = useState<string>(formData.amount === 0 ? "" : (formData.amount?.toString() || ""));
  const { t } = useTranslation(['donations', /* 'campaigns', */ 'common']); // 'campaigns' might be less relevant now, or adjust namespace

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFormData({ amount: Number.parseFloat(amount) || 0 });
    onNext();
  };

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    const parts = sanitizedValue.split(".");
    const formattedValue = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitizedValue;
    setAmount(formattedValue);
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  // REMOVED handleCampaignChange function

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
              <select
                id="frequency"
                value={formData.frequency}
                onChange={(e) => updateFormData({ frequency: e.target.value as any })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="weekly">{t('donations:frequencies.weekly', 'Weekly')}</option>
                <option value="monthly">{t('donations:frequencies.monthly', 'Monthly')}</option>
                <option value="quarterly">{t('donations:frequencies.quarterly', 'Quarterly')}</option>
                <option value="annually">{t('donations:frequencies.annually', 'Annually')}</option>
              </select>
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

      {/* REPLACED the old campaign Select with this new one for Donation Types */}
      <div className="space-y-2">
        <Label htmlFor="donationTypeSelect">{t('donations:donationDetails.selectFundLabel', 'Select a Fund')}</Label>
        <select
          id="donationTypeSelect"
          value={formData.donationTypeId}
          onChange={(e) => {
            const selectedId = e.target.value;
            const selectedDonationType = donationTypes.find(dt => dt.id === selectedId);
            updateFormData({
              donationTypeId: selectedId,
              donationTypeName: selectedDonationType ? selectedDonationType.name : undefined
            });
          }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{/* Intentionally empty for no visible placeholder text */}</option>
          {donationTypes.map((type) => {
            // Generate a key from the fund name (e.g., "General Fund" -> "general_fund")
            const fundKey = type.name.toLowerCase().replace(/\s+/g, '_');
            return (
              <option key={type.id} value={type.id}>
                {t(`donations:funds.${fundKey}`, type.name) /* Translate, fallback to original name */}
              </option>
            );
          })}
          {donationTypes.length === 0 && (
            <option value="no-types" disabled>
              {t('donations:donationDetails.noFundsAvailable', 'No funds available')}
            </option>
          )}
        </select>
      </div>

      <Button type="submit" className="w-full">
        {t('common:next', 'Next')}
      </Button>
    </form>
  );
}
