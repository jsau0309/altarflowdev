"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { DonationFormData } from "./donation-form";
import { useTranslation } from 'react-i18next';
import { PlaceKit } from '@placekit/autocomplete-react';
import '@placekit/autocomplete-js/dist/placekit-autocomplete.css'; // Import PlaceKit CSS

interface DonationInfoProps {
  formData: DonationFormData
  updateFormData: (data: Partial<DonationFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function DonationInfo({ formData, updateFormData, onNext, onBack }: DonationInfoProps) {
  const { t } = useTranslation(['donations', 'members', 'common']);
  const placekitApiKey = process.env.NEXT_PUBLIC_PLACEKIT_API_KEY || "";
  console.log('PlaceKit API Key in DonationInfo:', placekitApiKey);
  const [placekitInputValue, setPlacekitInputValue] = useState(formData.address || '');

  // Sync local input value if formData.address changes from an external source (e.g., initial load or after picking an address)
  useEffect(() => {
    if (formData.address !== placekitInputValue) {
      console.log(`useEffect (formData.address changed): setting placekitInputValue from '${placekitInputValue}' to '${formData.address || ''}'`);
      setPlacekitInputValue(formData.address || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address]); // ONLY depend on formData.address

  const handlePlaceKitInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event && event.target ? event.target.value : '';
    console.log(`handlePlaceKitInputChange: typed value is '${newValue}', current placekitInputValue is '${placekitInputValue}'`);

    setPlacekitInputValue(newValue); // Update local state for immediate visual feedback

    const formDataUpdate: Partial<DonationFormData> = { address: newValue };

    // If user is typing (and thus potentially invalidating a previously picked structured address),
    // clear the structured parts.
    if (formData.street || formData.city || formData.state || formData.zipCode || formData.country) {
      formDataUpdate.street = '';
      formDataUpdate.city = '';
      formDataUpdate.state = '';
      formDataUpdate.zipCode = '';
      formDataUpdate.country = '';
    }
    console.log('handlePlaceKitInputChange calling updateFormData with:', formDataUpdate);
    updateFormData(formDataUpdate); // Update parent state
  };

  const handleAddressPick = (value: string, item: any, index?: number) => {
    console.log('PlaceKit onPick value (input content):', value);
    console.log('PlaceKit onPick item:', item);
    const pickedAddress = {
      address: value, // Use the full string from PlaceKit's input
      street: (`${item.street?.number || ''} ${item.street?.suffix || ''}`).trim() || item.name || '', // Construct street from parts
      city: item.city || '',
      state: item.administrative_level_1 || item.state || '',
      zipCode: item.zip_code || item.postcode || '',
      country: item.country_code?.toUpperCase() || item.country?.toUpperCase() || '',
    };
    updateFormData(pickedAddress); // This will change formData.address
    // The useEffect listening to formData.address will now update placekitInputValue.
    // No need to call setPlacekitInputValue(value) directly here.
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">$</div>
        <div className="text-4xl font-bold text-center text-gray-900 dark:text-white">{formData.amount}</div>
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
          {placekitApiKey ? (
            <PlaceKit
              apiKey={placekitApiKey}
              value={placekitInputValue} // Controlled component: value prop
              onChange={handlePlaceKitInputChange} // Controlled component: onChange prop
              onPick={handleAddressPick}
              options={{
                countries: ['US', 'CA'] // Optional: Restrict to US and Canada, adjust as needed
                // types: ['address'] // Temporarily removed to resolve lint error
              }}
            />  
          ) : (
            <Input
              id="address-fallback"
              value={formData.address || ""}
              onChange={(e) => updateFormData({ address: e.target.value, street: e.target.value })} // Basic fallback
              placeholder={t('members:addressPlaceholder', 'Address (API key missing)')}
              disabled
            />
          )}
          {/* Hidden inputs to ensure formData still has values for city, state, etc., if needed for validation or display elsewhere */}
          {/* Or, you can add separate visible, read-only inputs for these if you want the user to see them after selection */}
          {/* For now, they are just in the state */}
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
