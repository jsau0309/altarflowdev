"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { t } = useTranslation(['donations', 'common']);
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [totalWithFees, setTotalWithFees] = useState<number>(0);

  const isFundSelected = !!formData.donationTypeId;
  const isAmountValid = (Number.parseFloat(amount) || 0) > 0;
  const canProceed = isFundSelected && isAmountValid;

  const oneTimeText = t('donations:types.oneTime', 'One Time');
  const recurringText = t('donations:types.recurring', 'Recurring');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Double-check conditions, though button should be disabled
    if (!canProceed) {
      console.warn('Attempted to submit with invalid form data. Fund selected:', isFundSelected, 'Amount valid:', isAmountValid);
      return; 
    }
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

  useEffect(() => {
    const numericAmount = Number.parseFloat(amount) || 0; // This is in dollars
    const STRIPE_PERCENTAGE_FEE_RATE = 0.029;
    const STRIPE_FIXED_FEE_CENTS = 30; // Fixed fee in cents

    if (numericAmount > 0 && formData.coverFees) {
      const baseAmountInCents = Math.round(numericAmount * 100); // Convert to cents, ensure integer

      // Mimic backend gross-up calculation
      const finalAmountForStripeInCents = Math.ceil((baseAmountInCents + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_PERCENTAGE_FEE_RATE));
      
      const finalTotalDisplay = finalAmountForStripeInCents / 100; // Convert back to dollars for display
      const calculatedDisplayFee = (finalAmountForStripeInCents - baseAmountInCents) / 100; // Fee in dollars

      setCalculatedFee(calculatedDisplayFee);
      setTotalWithFees(finalTotalDisplay);
    } else {
      setCalculatedFee(0);
      setTotalWithFees(numericAmount > 0 ? numericAmount : 0); // Ensure totalWithFees is 0 if amount is 0 or fees not covered
    }
  }, [amount, formData.coverFees]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="items-top flex space-x-2">
        <Checkbox 
          id="coverFees"
          checked={!!formData.coverFees}
          onCheckedChange={(checked) => {
            updateFormData({ coverFees: checked === true });
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="coverFees"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('donations:donationDetails.coverFeesLabel', "I'd like to help cover the processing fees.")}
          </label>
          {formData.coverFees && calculatedFee > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('donations:donationDetails.processingFee', 'Processing Fee:')} ${calculatedFee.toFixed(2)}<br />
              {t('donations:donationDetails.totalDonation', 'Total Donation:')} ${totalWithFees.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!canProceed}>
        {t('common:next', 'Next')}
      </Button>
    </form>
  );
}
