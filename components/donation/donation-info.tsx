"use client"

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInput, { formatPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react'; // Import Check icon
import { DonationFormData, PhoneVerificationStage } from './donation-form'; // Import types
import countryList from 'react-select-country-list';

interface DonationInfoProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  phoneVerificationStage: PhoneVerificationStage;
  setPhoneVerificationStage: (stage: PhoneVerificationStage) => void;
  enteredOtp: string;
  setEnteredOtp: (otp: string) => void;
  isLoadingOtpAction: boolean;
  apiErrorMessage: string | null;
  handleSendOtp: () => Promise<void>;
  handleCheckOtp: () => Promise<void>;
  handleChangePhoneNumber: () => void;
}

export default function DonationInfo({
  formData,
  updateFormData,
  onNext,
  onBack,
  phoneVerificationStage,
  setPhoneVerificationStage,
  enteredOtp,
  setEnteredOtp,
  isLoadingOtpAction,
  apiErrorMessage,
  handleSendOtp,
  handleCheckOtp,
  handleChangePhoneNumber,
}: DonationInfoProps) {
  const { t } = useTranslation(['donations', 'members', 'common']);

  // Get country options from the library
  const countryOptions = useMemo(() => countryList().getData(), []);

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Potentially add final validation here before calling onNext
    onNext();
  };

  const handleAnonymousChange = (checked: boolean) => {
    if (checked) {
      // If checking anonymous, uncheck international and go to PII collection
      updateFormData({ isAnonymous: true, isInternational: false });
      setPhoneVerificationStage('anonymous_selected');
      // Clear phone, OTP, and country fields
      updateFormData({ phone: '', donorCountry: '' });
      setEnteredOtp('');
    } else {
      // If unchecking anonymous, go back to initial phone entry stage
      updateFormData({ isAnonymous: false });
      setPhoneVerificationStage('initial');
    }
  };

  const handleInternationalChange = (checked: boolean) => {
    if (checked) {
      // If checking international, uncheck anonymous and skip phone verification
      updateFormData({ isInternational: true, isAnonymous: false });
      setPhoneVerificationStage('anonymous_selected');
      // Clear phone and OTP related fields
      updateFormData({ phone: '' });
      setEnteredOtp('');
    } else {
      // If unchecking international, go back to initial phone entry stage
      updateFormData({ isInternational: false, donorCountry: '' });
      setPhoneVerificationStage('initial');
    }
  };

  // Calculate display amount based on formData
  const baseAmount = formData.amount || 0;
  let displayAmount = baseAmount;
  if (formData.coverFees && baseAmount > 0) {
    // Use the same gross-up calculation as donation-details.tsx
    const STRIPE_PERCENTAGE_FEE_RATE = 0.029;
    const STRIPE_FIXED_FEE_CENTS = 30; // Fixed fee in cents
    const baseAmountInCents = Math.round(baseAmount * 100); // Convert to cents
    
    // Calculate the grossed-up amount that includes fees
    const finalAmountForStripeInCents = Math.ceil((baseAmountInCents + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_PERCENTAGE_FEE_RATE));
    displayAmount = finalAmountForStripeInCents / 100; // Convert back to dollars
  }

  // Render different views based on phoneVerificationStage
  const renderContent = () => {
    switch (phoneVerificationStage) {
      case 'initial':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone-initial-input" className="text-gray-900">{t('members:phone', 'Phone Number for Verification')}</Label>
              <PhoneInput
                id="phone-initial-input"
                international
                defaultCountry="US"
                value={formData.phone || ""}
                onChange={(value) => updateFormData({ phone: value || '' })}
                placeholder={t('donations:donationInfo.phonePlaceholderE164', 'e.g., +11234567890')}
                disabled={isLoadingOtpAction}
                className="input flex h-10 w-full rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 mt-1">{t('donations:donationInfo.phoneVerificationPrompt', 'We will send a one-time code to this number.')}</p>
            </div>
            <Button onClick={handleSendOtp} disabled={isLoadingOtpAction || !formData.phone} className="w-full">
              {isLoadingOtpAction ? t('donations:donationInfo.sendingOtp', 'Sending OTP...') : t('donations:donationInfo.verifyPhone', 'Verify Phone')}
            </Button>
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous-initial"
                  checked={formData.isAnonymous || false}
                  onCheckedChange={(checked) => handleAnonymousChange(!!checked)}
                />
                <Label htmlFor="anonymous-initial" className="text-sm font-normal text-gray-900">
                  {t('donations:donationInfo.anonymousLabel', 'Donate anonymously')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="international-initial"
                  checked={formData.isInternational || false}
                  onCheckedChange={(checked) => handleInternationalChange(!!checked)}
                />
                <Label htmlFor="international-initial" className="text-sm font-normal text-gray-900">
                  {t('donations:donationInfo.internationalLabel', 'International donor')}
                </Label>
              </div>
            </div>
            {apiErrorMessage && <p className="text-sm text-red-600">{apiErrorMessage}</p>}
          </div>
        );

      case 'otp_sent':
      case 'verifying_otp': // Added to handle this stage explicitly
      case 'otp_failed':
      case 'verification_error':
        return (
          <div className="space-y-4">
            <p className="text-gray-900">{t('donations:donationInfo.otpSentTo', 'An OTP has been sent to:')} {formData.phone}</p>
            <div>
              <Label htmlFor="otpCode" className="text-gray-900">{t('donations:donationInfo.otpCode', 'Verification Code')}</Label>
              <Input
                id="otpCode"
                type="text"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder={t('donations:donationInfo.otpPlaceholder', 'Enter 6-digit code')}
                maxLength={6}
                disabled={isLoadingOtpAction || phoneVerificationStage === 'verifying_otp'}
                className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
              />
            </div>
            <Button
                  onClick={() => {
                    // Debug logging removed: OTP submission
                    handleCheckOtp(); // This calls the prop passed from DonationForm
                  }}
                  disabled={isLoadingOtpAction || enteredOtp.length < 4 || phoneVerificationStage === 'verifying_otp'}
                  className="w-full"
                >
              {isLoadingOtpAction || phoneVerificationStage === 'verifying_otp' ? t('donations:donationInfo.verifyingOtp', 'Verifying...') : t('donations:donationInfo.submitOtp', 'Submit OTP')}
            </Button>
            { (phoneVerificationStage === 'otp_failed' || phoneVerificationStage === 'verification_error') && apiErrorMessage && 
              <p className="text-sm text-red-600">{apiErrorMessage}</p>
            }
            <div className="flex justify-between text-sm">
              <Button variant="link" onClick={handleSendOtp} disabled={isLoadingOtpAction || phoneVerificationStage === 'verifying_otp'}>{t('donations:donationInfo.resendOtp', 'Resend OTP')}</Button>
              <Button variant="link" onClick={handleChangePhoneNumber} disabled={isLoadingOtpAction || phoneVerificationStage === 'verifying_otp'}>{t('donations:donationInfo.changePhoneNumber', 'Change Number')}</Button>
            </div>
          </div>
        );
      
      case 'anonymous_selected':
      case 'verified_existing_donor':
      case 'verified_new_donor':
        return (
          <div className="space-y-4">
            { (phoneVerificationStage === 'verified_existing_donor' || phoneVerificationStage === 'verified_new_donor') && formData.phone && (
              <div className="mb-3 flex justify-center items-center text-center py-2">
                <p className="text-md text-gray-900">
                  {t('donations:donationInfo.youHaveVerified', 'You have verified')} {formData.phone ? formatPhoneNumber(formData.phone) : ''}
                  <Check className="inline h-5 w-5 text-green-500 ml-2" />
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-900">{t('members:firstName', 'First Name')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ""}
                  onChange={(e) => updateFormData({ firstName: e.target.value })}
                  required
                  className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-900">{t('members:lastName', 'Last Name')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={(e) => updateFormData({ lastName: e.target.value })}
                  required
                  className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900">{t('members:email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => updateFormData({ email: e.target.value })}
                required
                className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
              />
            </div>

            { formData.isInternational && (
              <div className="space-y-2">
                <Label htmlFor="donorCountry" className="text-gray-900">{t('members:country', 'Country')} *</Label>
                <select
                  id="donorCountry"
                  value={formData.donorCountry || ""}
                  onChange={(e) => updateFormData({ donorCountry: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                >
                  <option value="">{t('members:selectCountry', 'Select your country')}</option>
                  {countryOptions.map((country: {value: string; label: string}) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            { phoneVerificationStage !== 'anonymous_selected' && !formData.isInternational && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-gray-900">{t('members:address', 'Address (Street)')}</Label>
                  <Input
                    id="street"
                    value={formData.street || ""}
                    onChange={(e) => updateFormData({ street: e.target.value })}
                    placeholder={t('members:streetAddressPlaceholder', 'Street address')}
                    required
                    className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-900">{t('members:city', 'City')}</Label>
                    <Input id="city" value={formData.city || ""} onChange={(e) => updateFormData({ city: e.target.value })} placeholder={t('members:cityPlaceholder', 'City')} required className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-900">{t('members:state', 'State / Province')}</Label>
                    <Input id="state" value={formData.state || ""} onChange={(e) => updateFormData({ state: e.target.value })} placeholder={t('members:statePlaceholder', 'State / Province')} required className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-900">{t('members:zipCode', 'Zip / Postal Code')}</Label>
                    <Input id="zipCode" value={formData.zipCode || ""} onChange={(e) => updateFormData({ zipCode: e.target.value })} placeholder={t('members:zipCodePlaceholder', 'Zip / Postal Code')} required className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-gray-900">{t('members:country', 'Country')}</Label>
                  <Input id="country" value={formData.country || ""} onChange={(e) => updateFormData({ country: e.target.value })} placeholder={t('members:countryPlaceholder', 'Country')} required className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                </div>
              </>
            )}
            
            { phoneVerificationStage === 'anonymous_selected' && (
                <div className="space-y-2 pt-2">
                    {formData.isAnonymous && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="anonymous-selected-view"
                                checked={true}
                                onCheckedChange={(checked) => handleAnonymousChange(!!checked)}
                            />
                            <Label htmlFor="anonymous-selected-view" className="text-sm font-normal text-gray-900">
                                {t('donations:donationInfo.anonymousLabel', 'Donate anonymously')}
                            </Label>
                        </div>
                    )}
                    {formData.isInternational && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="international-selected-view"
                                checked={true}
                                onCheckedChange={(checked) => handleInternationalChange(!!checked)}
                            />
                            <Label htmlFor="international-selected-view" className="text-sm font-normal text-gray-900">
                                {t('donations:donationInfo.internationalLabel', 'International donor')}
                            </Label>
                        </div>
                    )}
                </div>
            )}

            {apiErrorMessage && <p className="text-sm text-red-600">{apiErrorMessage}</p>}
          </div>
        );

      default:
        // This should ideally not be reached if all stages are handled.
        // The 'never' type helps ensure exhaustiveness at compile time.
        const exhaustiveCheck: never = phoneVerificationStage;
        console.warn(`Unexpected phoneVerificationStage: ${exhaustiveCheck}`);
        return <div>{t('common:unexpectedError', 'An unexpected error occurred.')}</div>;
    }
  };

  // Validation for verified donors (phone verified, not anonymous, not international)
  const areNonAnonymousFieldsFilled =
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.email &&
    !!formData.street &&
    !!formData.city &&
    !!formData.state &&
    !!formData.zipCode &&
    !!formData.country;

  // Validation for anonymous donors (firstName, lastName, email required)
  const areAnonymousFieldsFilled =
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.email;

  // Validation for international donors (firstName, lastName, email, country required)
  const areInternationalFieldsFilled =
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.email &&
    !!formData.donorCountry;

  const isNextButtonDisabled =
    // For verified donors who are not anonymous/international
    ((phoneVerificationStage === 'verified_existing_donor' ||
      phoneVerificationStage === 'verified_new_donor') &&
      !formData.isAnonymous &&
      !formData.isInternational &&
      !areNonAnonymousFieldsFilled) ||
    // For anonymous donors (US only)
    (phoneVerificationStage === 'anonymous_selected' &&
      formData.isAnonymous &&
      !formData.isInternational &&
      !areAnonymousFieldsFilled) ||
    // For international donors (not anonymous)
    (phoneVerificationStage === 'anonymous_selected' &&
      !formData.isAnonymous &&
      formData.isInternational &&
      !areInternationalFieldsFilled) ||
    // For anonymous international donors
    (phoneVerificationStage === 'anonymous_selected' &&
      formData.isAnonymous &&
      formData.isInternational &&
      !areInternationalFieldsFilled);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
        <div className="text-xl font-medium text-gray-600">$</div>
        <div className="text-4xl font-bold text-center text-gray-900">{displayAmount.toFixed(2)}</div>
        <div className="text-xl font-medium text-gray-600">{t('common:currency.usd', 'USD')}</div>
      </div>

      {renderContent()}

      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900">
          {t('common:back', 'Back')}
        </Button>
        {(phoneVerificationStage === 'anonymous_selected' || 
          phoneVerificationStage === 'verified_existing_donor' || 
          phoneVerificationStage === 'verified_new_donor') && (
          <Button type="button" onClick={handleFinalSubmit} className="flex-1" disabled={isNextButtonDisabled}>
            {t('common:next', 'Next')}
          </Button>
        )}
      </div>
    </div>
  );
}