"use client"

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

// New props interface
interface DonationFormProps {
  churchId: string;
  churchName: string; // Will be available if needed inside the form
  donationTypes: DonationType[];
  churchSlug: string; // <<< Add this
}

// Updated DonationFormData type
export type DonationFormData = {
  amount: number;
  // donationType: "one-time" | "recurring"; // Removed: All donations are one-time
  donationTypeId: string; // ID of the selected specific donation type/fund
  donationTypeName?: string; // NAME of the selected specific donation type/fund
  // frequency?: "weekly" | "monthly" | "quarterly" | "annually"; // Removed
  // startDate?: string; // Removed (related to recurring)
  firstName?: string;
  lastName?: string;
  isAnonymous?: boolean;
  email?: string;
  phone?: string;
  address?: string; // Full formatted address from PlaceKit
  street?: string; // Street address (e.g., 123 Main St)
  addressLine2?: string; // Optional second line of address
  city?: string;
  state?: string; // State or province
  zipCode?: string;
  country?: string; // Country code (e.g., US)
  paymentMethod?: "card" | "bank" | "google-pay" | "apple-pay";
  coverFees?: boolean;
  donorId?: string; // ID of the Donor record from OTP flow
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
  const [formData, setFormData] = useState<DonationFormData>({
    amount: 0,
    // donationType: "one-time", // Removed
    donationTypeId: "",
    donationTypeName: "",
    // frequency: "monthly", // Removed
    // startDate: undefined, // Removed
    firstName: "",
    lastName: "",
    isAnonymous: false,
    email: "",
    phone: "",
    address: "", // Full formatted address
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    paymentMethod: undefined,
    coverFees: false,
    donorId: undefined,
  });
  const [step, setStep] = useState(1);
  const [phoneVerificationStage, setPhoneVerificationStage] = useState<PhoneVerificationStage>('initial');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isLoadingOtpAction, setIsLoadingOtpAction] = useState<boolean>(false);
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
    } catch (error: any) {
      setApiErrorMessage(error.message || 'An unexpected error occurred while sending OTP.');
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
        if (data.isExistingDonor && data.donorData) {
          updateFormData({
            donorId: data.donorData.id, // Store the donor's ID
            firstName: data.donorData.firstName || '',
            lastName: data.donorData.lastName || '',
            email: data.donorData.email || '',
            street: data.donorData.addressLine1 || '',
            addressLine2: data.donorData.addressLine2 || '', // Added addressLine2
            city: data.donorData.city || '',
            state: data.donorData.state || '',
            zipCode: data.donorData.postalCode || '',
            country: data.donorData.country || '',
            // Note: 'address' (full formatted address) is not directly provided by this API
            // It might need to be reconstructed or handled differently if required.
          });
          setPhoneVerificationStage('verified_existing_donor');
        } else {
          // Clear PII fields for a new donor, except phone which is already set and verified
          // Also, store the new donor's ID
          updateFormData({
            donorId: data.donorData.id, // Store the new donor's ID
            firstName: '',
            lastName: '',
            email: '',
            street: '',
            addressLine2: '', // Ensure addressLine2 is also cleared for new donors
            city: '',
            state: '',
            zipCode: '',
            country: '',
          });
          setPhoneVerificationStage('verified_new_donor');
        }
        setEnteredOtp(''); // Clear OTP input on success
      } else {
        // This case might be redundant if !response.ok covers it, but good for explicit API contracts
        throw new Error(data.message || 'OTP verification failed.');
      }
    } catch (error: any) {
      console.error("OTP Check Catch Block Error:", error);
      setApiErrorMessage(`Catch Block: ${error.message || 'An unexpected error occurred.'}`); 
      setPhoneVerificationStage('otp_failed');
    } finally {
      setIsLoadingOtpAction(false);
    }
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
        // Pass donationTypes to DonationDetails
        return <DonationDetails formData={formData} updateFormData={updateFormData} onNext={nextStep} donationTypes={donationTypes} />;
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
          apiErrorMessage={apiErrorMessage}
          handleSendOtp={handleSendOtp}
          handleCheckOtp={handleCheckOtp}
          handleChangePhoneNumber={handleChangePhoneNumber}
        />;
      case 3:
        // Pass churchId, donorId, and churchName to DonationPayment
        return <DonationPayment formData={formData} updateFormData={updateFormData} onBack={prevStep} churchId={churchId} churchSlug={churchSlug} donorId={formData.donorId} churchName={churchName} />;
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
        ${isActive ? "bg-blue-600 border-4 border-gray-300 dark:border-gray-600" : ""}
        ${isCompleted ? "bg-blue-600" : ""}
        ${!isActive && !isCompleted ? "bg-gray-200 dark:bg-gray-700" : ""}
      `}
      >
        {isCompleted && <Check className="h-5 w-5 text-white" />}
        {isActive && <div className="w-4 h-4 rounded-full bg-white"></div>}
      </div>
      <span className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">{label}</span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className="flex-1 h-px mx-2 w-16">
      <div className={`h-full ${completed ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}></div>
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
