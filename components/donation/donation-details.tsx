"use client"


import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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

export default function DonationDetails({ formData, updateFormData, onNext, donationTypes }: DonationDetailsProps) { // Destructure donationTypes
  // Helper to convert amount to slider position (defined before state)
  const amountToSliderInit = (amount: number): number => {
    if (amount <= 100) {
      return (amount - 5) / 95 * 20; // $5-$100 maps to 0-20
    } else if (amount <= 300) {
      return 20 + (amount - 100) / 200 * 40; // $100-$300 maps to 20-60
    } else {
      return 60 + (amount - 300) / 700 * 40; // $300-$1000 maps to 60-100
    }
  };

  const [amount, setAmount] = useState<string>(formData.amount === 0 ? "10" : (formData.amount?.toString() || "10"));
  const initialAmount = formData.amount === 0 ? 10 : formData.amount || 10;
  const [sliderValue, setSliderValue] = useState<number[]>([amountToSliderInit(initialAmount)]);
  const { t } = useTranslation(['donations', 'common']);
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [totalWithFees, setTotalWithFees] = useState<number>(0);
  // Track if slider is currently being updated to prevent sync loop
  const isSliderUpdating = useRef(false);
  // Track current slider value to avoid reading from state in useEffect
  const sliderValueRef = useRef<number[]>([amountToSliderInit(initialAmount)]);

  const isFundOrCampaignSelected = !!formData.donationTypeId;
  const isAmountValid = (Number.parseFloat(amount) || 0) > 0;
  const canProceed = isFundOrCampaignSelected && isAmountValid;


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Double-check conditions, though button should be disabled
    if (!canProceed) {
      console.warn('Attempted to submit with invalid form data', { operation: 'ui.donation.validation_failed', isFundOrCampaignSelected, isAmountValid });
      return;
    }
    updateFormData({ amount: Number.parseFloat(amount) || 0 });
    onNext();
  };

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    const parts = sanitizedValue.split(".");
    const formattedValue = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitizedValue;
    
    // Update slider to match manual input (clamped between 5-1000)
    // Use isNaN check instead of || to properly handle 0 values
    const parsedValue = Number.parseFloat(formattedValue);
    const numericValue = isNaN(parsedValue) ? 10 : parsedValue;
    const clampedValue = Math.min(Math.max(numericValue, 5), 1000);
    
    // Set amount state to clamped value to enforce $5-$1000 range
    setAmount(clampedValue.toString());
    
    const sliderPos = amountToSlider(clampedValue);
    setSliderValue([sliderPos]);
    sliderValueRef.current = [sliderPos];
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    const sliderPos = amountToSlider(quickAmount);
    setSliderValue([sliderPos]);
    sliderValueRef.current = [sliderPos];
  };

  // Convert linear slider value (0-100) to actual dollar amount with variable steps
  const sliderToAmount = (sliderPosition: number): number => {
    // Define ranges with different step sizes
    if (sliderPosition <= 20) {
      // $5 to $100: Fine control ($5 steps)
      return 5 + (sliderPosition / 20) * 95; // 0-20 maps to $5-$100
    } else if (sliderPosition <= 60) {
      // $100 to $300: Medium steps
      return 100 + ((sliderPosition - 20) / 40) * 200; // 20-60 maps to $100-$300
    } else {
      // $300 to $1000: Large steps ($50)
      return 300 + ((sliderPosition - 60) / 40) * 700; // 60-100 maps to $300-$1000
    }
  };

  // Convert dollar amount to slider position (0-100)
  const amountToSlider = (amount: number): number => {
    if (amount <= 100) {
      return (amount - 5) / 95 * 20; // $5-$100 maps to 0-20
    } else if (amount <= 300) {
      return 20 + (amount - 100) / 200 * 40; // $100-$300 maps to 20-60
    } else {
      return 60 + (amount - 300) / 700 * 40; // $300-$1000 maps to 60-100
    }
  };

  const handleSliderChange = (value: number[]) => {
    isSliderUpdating.current = true;
    const sliderPos = value[0];
    const actualAmount = sliderToAmount(sliderPos);

    // Round to appropriate step based on range
    let roundedAmount: number;
    if (actualAmount <= 100) {
      roundedAmount = Math.round(actualAmount / 5) * 5; // $5 steps
    } else if (actualAmount <= 300) {
      roundedAmount = Math.round(actualAmount / 10) * 10; // $10 steps
    } else {
      roundedAmount = Math.round(actualAmount / 50) * 50; // $50 steps
    }

    // Clamp rounded amount to valid range
    roundedAmount = Math.min(Math.max(roundedAmount, 5), 1000);

    // Calculate the correct slider position from the rounded amount BEFORE updating state
    // This ensures perfect synchronization - the slider position always matches the displayed amount
    const syncedSliderPos = amountToSlider(roundedAmount);
    
    // Update both amount and slider value together to maintain synchronization
    // The slider position must match the rounded amount exactly
    setAmount(roundedAmount.toString());
    setSliderValue([syncedSliderPos]);
    sliderValueRef.current = [syncedSliderPos];
    
    // Reset flag after state updates complete
    setTimeout(() => {
      isSliderUpdating.current = false;
    }, 0);
  };

  // Sync slider position with amount when amount changes (e.g., from manual input)
  // Skip sync when slider is updating to prevent feedback loop
  useEffect(() => {
    if (!isSliderUpdating.current) {
      const numericAmount = Number.parseFloat(amount) || 0;
      const clampedAmount = Math.min(Math.max(numericAmount, 5), 1000);
      const expectedSliderPos = amountToSlider(clampedAmount);
      
      // Only update slider if it's out of sync (more than 0.1 difference to avoid unnecessary updates)
      const currentSliderPos = sliderValueRef.current[0];
      if (Math.abs(currentSliderPos - expectedSliderPos) > 0.1) {
        setSliderValue([expectedSliderPos]);
        sliderValueRef.current = [expectedSliderPos];
      }
    }
  }, [amount]); // Only depend on amount, not sliderValue to avoid loop

  useEffect(() => {
    const numericAmount = Number.parseFloat(amount) || 0; // This is in dollars
    const STRIPE_PERCENTAGE_FEE_RATE = 0.029;
    const STRIPE_FIXED_FEE_CENTS = 30; // Fixed fee in cents
    const PLATFORM_FEE_RATE = 0.01; // 1% platform fee

    if (numericAmount > 0 && formData.coverFees) {
      const baseAmountInCents = Math.round(numericAmount * 100); // Convert to cents, ensure integer

      // Correct gross-up calculation: combine both percentage fees in the divisor
      // Formula: final_amount = (base_amount + fixed_fee) / (1 - stripe_rate - platform_rate)
      // This ensures church receives exactly the base amount after ALL fees are deducted
      const finalAmountForStripeInCents = Math.ceil(
        (baseAmountInCents + STRIPE_FIXED_FEE_CENTS) /
        (1 - STRIPE_PERCENTAGE_FEE_RATE - PLATFORM_FEE_RATE)
      );

      const finalTotalDisplay = finalAmountForStripeInCents / 100; // Convert back to dollars for display
      const calculatedDisplayFee = (finalAmountForStripeInCents - baseAmountInCents) / 100; // Combined fee in dollars

      setCalculatedFee(calculatedDisplayFee);
      setTotalWithFees(finalTotalDisplay);
    } else {
      setCalculatedFee(0);
      setTotalWithFees(numericAmount > 0 ? numericAmount : 0); // Ensure totalWithFees is 0 if amount is 0 or fees not covered
    }
  }, [amount, formData.coverFees]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-center gap-4 text-gray-900">
        <div className="text-2xl font-medium w-8 text-right">$</div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="text-center text-4xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-32"
          placeholder="10"
        />
        <div className="text-2xl font-medium w-16 text-left">{t('common:currency.usd', 'USD')}</div>
      </div>

      {/* Slider for amount adjustment */}
      <div className="space-y-2 px-2">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={0}
          max={100}
          step={0.1}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>$5</span>
          <span>$1,000</span>
        </div>
      </div>

      <div className="text-sm text-center text-gray-500">
        {t('donations:donationDetails.amountPrompt', 'Adjust the slider, enter an amount, or make a quick selection below')}
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
