"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"
import type { DonationFormData } from "./donation-form"
import { useTranslation } from 'react-i18next'
import { DonationType } from "@prisma/client"; // Added import

// Serialized version for client components (goalAmount as string)
type SerializedDonationType = Omit<DonationType, 'goalAmount'> & {
  goalAmount: string | null;
};

interface DonationDetailsProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onNext: () => void;
  donationTypes: SerializedDonationType[]; // All donation types including campaigns
  churchSlug: string; // Keeping for potential future use
}

export default function DonationDetails({ formData, updateFormData, onNext, donationTypes, churchSlug }: DonationDetailsProps) { // Destructure donationTypes
  const [amount, setAmount] = useState<string>(formData.amount === 0 ? "" : (formData.amount?.toString() || ""));
  const { t } = useTranslation(['donations', 'common']);
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [totalWithFees, setTotalWithFees] = useState<number>(0);

  const isFundOrCampaignSelected = !!formData.donationTypeId;
  const isAmountValid = (Number.parseFloat(amount) || 0) > 0;
  const canProceed = isFundOrCampaignSelected && isAmountValid;


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Double-check conditions, though button should be disabled
    if (!canProceed) {
      console.warn('Attempted to submit with invalid form data. Fund/Campaign selected:', isFundOrCampaignSelected, 'Amount valid:', isAmountValid);
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
      <div className="flex items-center justify-between text-gray-900">
        <div className="text-2xl font-medium">$</div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-full text-center text-4xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="0"
        />
        <div className="text-2xl font-medium">{t('common:currency.usd', 'USD')}</div>
      </div>

      <div className="text-sm text-center text-gray-500">
        {t('donations:donationDetails.amountPrompt', 'Enter an amount or make a quick selection below')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button type="button" variant="outline" className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900" onClick={() => handleQuickAmount(50)}>
          $50
        </Button>
        <Button type="button" variant="outline" className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900" onClick={() => handleQuickAmount(100)}>
          $100
        </Button>
        <Button type="button" variant="outline" className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900" onClick={() => handleQuickAmount(500)}>
          $500
        </Button>
        <Button type="button" variant="outline" className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900" onClick={() => handleQuickAmount(1000)}>
          $1,000
        </Button>
      </div>

      {/* Donation Type Selection (includes both system types and campaigns) */}
      <div className="space-y-2">
        <Label htmlFor="donationTypeSelect" className="text-gray-900">{t('donations:donationDetails.selectFundLabel', 'Select a Fund')}</Label>
        <select
          id="donationTypeSelect"
          value={formData.donationTypeId || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            if (selectedValue) {
              const selectedDonationType = donationTypes.find(dt => dt.id === selectedValue);
              updateFormData({
                donationTypeId: selectedValue,
                donationTypeName: selectedDonationType ? selectedDonationType.name : undefined,
                donationTypeIsCampaign: selectedDonationType?.isCampaign || false,
              });
            } else {
              updateFormData({
                donationTypeId: '',
                donationTypeName: undefined,
                donationTypeIsCampaign: undefined,
              });
            }
          }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {t('donations:donationDetails.selectFundPlaceholder', '-- Choose Fund --')}
          </option>

          {donationTypes.length > 0 ? (
            donationTypes.map((type) => {
              const fundKey = type.name.toLowerCase().replace(/\s+/g, '_');
              return (
                <option key={type.id} value={type.id}>
                  {t(`donations:funds.${fundKey}`, type.name)}
                </option>
              );
            })
          ) : (
            <option value="no-options" disabled>
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
            className="text-sm font-medium text-gray-900 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('donations:donationDetails.coverFeesLabel', "I'd like to help cover the processing fees.")}
          </label>
          {formData.coverFees && calculatedFee > 0 && (
            <p className="text-sm text-gray-600">
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
