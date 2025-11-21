"use client"
import { logger } from '@/lib/logger';

import { useState } from "react";
import { isValidPhoneNumber } from 'react-phone-number-input';
import { Check } from "lucide-react"
import DonationDetails from "./donation-details"
import DonationInfo from "./donation-info"
import DonationPayment from "./donation-payment"
import { useTranslation } from "react-i18next"
import { DonationType } from "@prisma/client"; // Added import
import * as Sentry from '@sentry/nextjs';
import { trackUserInteraction } from '@/lib/sentry-ui';

// Amount validation utility
function validateDonationAmount(amount: number): { valid: boolean; error?: string; cents?: number } {
  // Check if it's a finite number
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Invalid donation amount' };
  }

  // Minimum $0.50 (Stripe minimum)
  if (amount < 0.50) {
    return { valid: false, error: 'Amount must be at least $0.50' };
  }

  // Maximum $999,999.99 (reasonable limit)
  if (amount > 999999.99) {
    return { valid: false, error: 'Amount exceeds maximum limit of $999,999.99' };
  }

  // Convert to cents with safe rounding
  const cents = Math.round(amount * 100);

  // Verify conversion didn't create invalid value
  if (cents < 50 || cents > 99999999) {
    return { valid: false, error: 'Amount conversion error' };
  }

  return { valid: true, cents };
}

// Serialized version for client components (goalAmount as string)
type SerializedDonationType = Omit<DonationType, 'goalAmount'> & {
  goalAmount: string | null;
};

// New props interface
interface DonationFormProps {
  churchId: string;
  churchName: string; // Will be available if needed inside the form
  donationTypes: SerializedDonationType[];
  churchSlug: string; // <<< Add this
}

// Updated DonationFormData type
export type DonationFormData = {
  amount: number;
  donationTypeId: string; // ID of the selected specific donation type/campaign
  donationTypeName?: string; // NAME of the selected specific donation type/campaign
  donationTypeIsCampaign?: boolean; // Flag to differentiate campaigns from general funds
  firstName?: string;
  lastName?: string;
  isAnonymous?: boolean;
  isInternational?: boolean; // International donor (non-US)
  email?: string;
  phone?: string;
  address?: string; // Full formatted address from PlaceKit
  street?: string; // Street address (e.g., 123 Main St)
  addressLine2?: string; // Optional second line of address
  city?: string;
  state?: string; // State or province
  zipCode?: string;
  country?: string; // Country code (e.g., US, MX, SV) - required for international donors
  donorCountry?: string; // Explicit country for donation transaction (for international donors)
  paymentMethod?: "card" | "bank" | "google-pay" | "apple-pay";
  coverFees?: boolean;
  donorId?: string; // ID of the Donor record from OTP flow
  // NEW FIELDS for early payment intent creation
  clientSecret?: string; // Stripe payment intent client secret
  stripeAccount?: string; // Stripe Connect account ID
  transactionId?: string; // Internal transaction ID
  // campaignId and campaignName are removed
};

export type PhoneVerificationStage =
  | 'initial'
  | 'otp_sent'
  | 'verifying_otp'
  | 'verified_existing_donor'
  | 'verified_new_donor'
  | 'anonymous_selected'
  | 'otp_failed'
  | 'verification_error';

function DonationForm({ churchId, churchName, donationTypes, churchSlug }: DonationFormProps) {
  const { i18n } = useTranslation(); // Get current language from i18n
  const [formData, setFormData] = useState<DonationFormData>({
    amount: 0,
    donationTypeId: "",
    donationTypeName: "",
    donationTypeIsCampaign: false,
    firstName: "",
    lastName: "",
    isAnonymous: false,
    isInternational: false,
    email: "",
    phone: "",
    address: "", // Full formatted address
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    donorCountry: "",
    paymentMethod: undefined,
    coverFees: false,
    donorId: undefined,
  });
  const [step, setStep] = useState(1);
  const [phoneVerificationStage, setPhoneVerificationStage] = useState<PhoneVerificationStage>('initial');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isLoadingOtpAction, setIsLoadingOtpAction] = useState<boolean>(false);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const updateFormData = (data: Partial<DonationFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleSendOtp = async () => {
    if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
      setApiErrorMessage('Please enter a valid phone number.');
      trackUserInteraction('OTP Send Failed', 'donation', { reason: 'invalid_phone' });
      return;
    }
    setIsLoadingOtpAction(true);
    setApiErrorMessage(null);
    try {
      const response = await fetch('/api/donors/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formData.phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send OTP.');
      }
      setPhoneVerificationStage('otp_sent');
    } catch (error) {
      const err = error as Error;
      setApiErrorMessage(err.message || 'An unexpected error occurred while sending OTP.');
      setPhoneVerificationStage('verification_error'); // Or keep 'initial' depending on desired UX
    } finally {
      setIsLoadingOtpAction(false);
    }
  };

  const handleCheckOtp = async () => {
    // Debug logging removed: handling OTP check with phone and code
    if (!formData.phone || !enteredOtp) {
      setApiErrorMessage('Client Check: Phone number and OTP are required.'); // Added "Client Check:"
      return;
    }
    setIsLoadingOtpAction(true);
    setApiErrorMessage(null);
    setPhoneVerificationStage('verifying_otp'); // Set stage to verifying_otp

    try {
      const response = await fetch('/api/donors/otp/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formData.phone,
          code: enteredOtp,
          churchId: churchId // Pass the churchId from props
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to verify OTP.');
      }

      if (data.success) {
        // Store donor information based on whether they're existing or new
        const donorUpdateData: Partial<DonationFormData> = {
          donorId: data.donorData.id,
        };

        if (data.isExistingDonor && data.donorData) {
          // Existing donor - populate with saved data
          Object.assign(donorUpdateData, {
            firstName: data.donorData.firstName || '',
            lastName: data.donorData.lastName || '',
            email: data.donorData.email || '',
            street: data.donorData.addressLine1 || '',
            addressLine2: data.donorData.addressLine2 || '',
            city: data.donorData.city || '',
            state: data.donorData.state || '',
            zipCode: data.donorData.postalCode || '',
            country: data.donorData.country || '',
          });
          setPhoneVerificationStage('verified_existing_donor');
        } else {
          // New donor - clear PII fields
          Object.assign(donorUpdateData, {
            firstName: '',
            lastName: '',
            email: '',
            street: '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          });
          setPhoneVerificationStage('verified_new_donor');
        }

        updateFormData(donorUpdateData);
        setEnteredOtp(''); // Clear OTP input on success

        // NEW: Create payment intent immediately for EXISTING donors only
        // New donors need to fill out their information first
        if (data.isExistingDonor) {
          // Pass donor data directly (can't rely on formData state - it updates async)
          await createPaymentIntent(data.donorData);
        }
        // For new donors, payment intent will be created when they click "Next" after filling the form
      } else {
        // This case might be redundant if !response.ok covers it, but good for explicit API contracts
        throw new Error(data.message || 'OTP verification failed.');
      }
    } catch (error) {
      const err = error as Error;
      logger.error('OTP Check Catch Block Error:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      setApiErrorMessage(`Catch Block: ${err.message || 'An unexpected error occurred.'}`);
      setPhoneVerificationStage('otp_failed');
    } finally {
      setIsLoadingOtpAction(false);
    }
  };

  // NEW: Function to create payment intent after OTP verification
  const createPaymentIntent = async (donorData: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  }) => {
    setIsCreatingPaymentIntent(true);
    setApiErrorMessage(null);

    try {
      // Generate unique idempotency key for this payment intent
      const uniqueIdempotencyKey = `${crypto.randomUUID()}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${Date.now()}`;

      const piResponse = await fetch('/api/donations/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uniqueIdempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey: uniqueIdempotencyKey,
          churchId: churchId,
          donationTypeId: formData.donationTypeId,
          baseAmount: (() => {
            const validation = validateDonationAmount(formData.amount || 0);
            if (!validation.valid) {
              throw new Error(validation.error || 'Invalid amount');
            }
            return validation.cents!;
          })(),
          currency: 'usd',
          coverFees: formData.coverFees,
          isAnonymous: false, // Verified donors are never anonymous
          isInternational: formData.isInternational || false,
          donorId: donorData.id,
          // Use donor data directly from API response (not formData state)
          firstName: donorData.firstName || '',
          lastName: donorData.lastName || '',
          donorEmail: donorData.email || '',
          phone: formData.phone || '', // Phone from formData (verified)
          street: donorData.addressLine1 || '',
          addressLine2: donorData.addressLine2 || '',
          city: donorData.city || '',
          state: donorData.state || '',
          zipCode: donorData.postalCode || '',
          country: donorData.country || '',
          donorLanguage: (i18n.language === 'es' || i18n.language.startsWith('es-')) ? 'es' : 'en', // Normalize language code
        }),
      });

      if (!piResponse.ok) {
        const errorData = await piResponse.json().catch(() => ({
          message: 'Failed to prepare payment. Please try again.'
        }));
        throw new Error(errorData.message || `Server error: ${piResponse.status}`);
      }

      const piData = await piResponse.json();

      // API returns data directly with clientSecret, stripeAccount, transactionId
      if (piData.clientSecret) {
        logger.debug('[DonationForm] Payment intent created successfully, transaction ID:', { operation: 'ui.debug', data: piData.transactionId });

        // Store payment intent data in formData
        updateFormData({
          clientSecret: piData.clientSecret,
          stripeAccount: piData.stripeAccount || undefined,
          transactionId: piData.transactionId,
        });

        // Automatically proceed to payment step
        nextStep();
      } else {
        throw new Error(piData.error || piData.message || 'Failed to retrieve payment information.');
      }
    } catch (error) {
      const err = error as Error;
      logger.error('Payment Intent Creation Error:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      setApiErrorMessage(`Payment preparation failed: ${err.message || 'An unexpected error occurred.'}`);
      setPhoneVerificationStage('verification_error');
    } finally {
      setIsCreatingPaymentIntent(false);
    }
  };

  // NEW: Wrapper function for new donors to update donor info first, then create payment intent
  const createPaymentIntentForNewDonor = async () => {
    setIsCreatingPaymentIntent(true);
    setApiErrorMessage(null);

    try {
      // Step 1: Update donor record in database with form data
      const updatePayload = {
        donorId: formData.donorId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        addressLine1: formData.street || null,
        addressLine2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        postalCode: formData.zipCode || null,
        country: formData.donorCountry || 'US', // Use donorCountry (2-letter code), not country (state name)
      };

      const updateResponse = await fetch('/api/donors/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({
          error: 'Failed to save donor information.'
        }));
        throw new Error(errorData.error || 'Failed to save donor information.');
      }

      const updateData = await updateResponse.json();

      if (!updateData.success || !updateData.donorData) {
        throw new Error('Failed to retrieve updated donor information.');
      }

      // Step 2: Create payment intent with updated donor data from API
      // This ensures we use the persisted data, not just form state
      await createPaymentIntent(updateData.donorData);

    } catch (error) {
      const err = error as Error;
      logger.error('[DonationForm] Error in createPaymentIntentForNewDonor:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      setApiErrorMessage(`Failed to prepare payment: ${err.message || 'An unexpected error occurred.'}`);
      setPhoneVerificationStage('verification_error');
      setIsCreatingPaymentIntent(false);
    }
    // Note: isCreatingPaymentIntent will be set to false by createPaymentIntent
  };

  const handleChangePhoneNumber = () => {
    // Debug logging removed: changing phone number
    setPhoneVerificationStage('initial');
    setApiErrorMessage(null);
    setEnteredOtp(''); // Clear OTP when changing number
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        // Pass donationTypes and churchSlug to DonationDetails
        return <DonationDetails formData={formData} updateFormData={updateFormData} onNext={nextStep} donationTypes={donationTypes} churchSlug={churchSlug} />;
      case 2:
        return <DonationInfo
          formData={formData}
          updateFormData={updateFormData}
          onNext={nextStep}
          onBack={prevStep}
          phoneVerificationStage={phoneVerificationStage}
          setPhoneVerificationStage={setPhoneVerificationStage}
          enteredOtp={enteredOtp}
          setEnteredOtp={setEnteredOtp}
          isLoadingOtpAction={isLoadingOtpAction}
          isCreatingPaymentIntent={isCreatingPaymentIntent}
          apiErrorMessage={apiErrorMessage}
          handleSendOtp={handleSendOtp}
          handleCheckOtp={handleCheckOtp}
          handleChangePhoneNumber={handleChangePhoneNumber}
          createPaymentIntentForNewDonor={createPaymentIntentForNewDonor}
        />;
      case 3:
        // Pass clientSecret and stripeAccount from formData (created after OTP verification)
        return <DonationPayment
          formData={formData}
          updateFormData={updateFormData}
          onBack={prevStep}
          churchId={churchId}
          churchSlug={churchSlug}
          donorId={formData.donorId}
          churchName={churchName}
          clientSecret={formData.clientSecret}
          stripeAccount={formData.stripeAccount}
        />;
      default:
        return <div>Something went wrong.</div>;
    }
  };

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} />
      {renderStep()}
    </div>
  );
}

interface StepperProps {
  currentStep: number
}

function Stepper({ currentStep }: StepperProps) {
  const { t } = useTranslation('donations');
  const steps = [
    { id: 1, name: t('donations:stepper.details', "Details") },
    { id: 2, name: t('donations:stepper.info', "Info") },
    { id: 3, name: t('donations:stepper.donate', "Donate") },
  ]

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <StepIndicator step={step.id} currentStep={currentStep} label={step.name} />
          {index < steps.length - 1 && <StepConnector completed={currentStep > step.id} />}
        </div>
      ))}
    </div>
  )
}

interface StepIndicatorProps {
  step: number
  currentStep: number
  label: string
}

function StepIndicator({ step, currentStep, label }: StepIndicatorProps) {
  const isActive = step === currentStep
  const isCompleted = currentStep > step

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${isActive ? "bg-blue-600 border-4 border-gray-300" : ""}
        ${isCompleted ? "bg-blue-600" : ""}
        ${!isActive && !isCompleted ? "bg-gray-200" : ""}
      `}
      >
        {isCompleted && <Check className="h-5 w-5 text-white" />}
        {isActive && <div className="w-4 h-4 rounded-full bg-white"></div>}
      </div>
      <span className="mt-2 text-sm font-medium text-gray-900">{label}</span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className="flex-1 h-px mx-2 w-16">
      <div className={`h-full ${completed ? "bg-blue-600" : "bg-gray-200"}`}></div>
    </div>
  )
}

// Export with Sentry error boundary
export default Sentry.withErrorBoundary(DonationForm, {
  fallback: ({ resetError }) => (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold mb-4">Something went wrong with the donation form</h2>
      <p className="text-gray-600 mb-4">We apologize for the inconvenience. Please try again.</p>
      <button 
        onClick={resetError}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  ),
  showDialog: false
});
