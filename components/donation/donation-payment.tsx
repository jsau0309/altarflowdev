"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { DonationFormData } from "./donation-form"
import { Gift, Loader2 } from "lucide-react"

import { useTranslation } from 'react-i18next'
import { usePostHog } from '@/hooks/use-posthog'

import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Load Stripe with optional Connect account
const getStripePromise = (stripeAccount?: string | null) => {
  if (stripeAccount) {
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
      stripeAccount: stripeAccount
    });
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

interface DonationPaymentProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onBack: () => void;
  churchId: string;
  churchSlug: string; // Added churchSlug to construct dynamic return_url
  donorId?: string; // ID of the verified Donor record
  churchName: string; // Added churchName, now required
}

// New Inner component for the payment form itself
interface CheckoutFormProps {
  formData: DonationFormData;
  onBack: () => void;
  churchId: string; // This is the internal DB UUID
  churchSlug: string; // Added to construct dynamic return_url
  churchName: string; // Added for return_url
}

const CheckoutForm = ({ formData, onBack, churchId, churchSlug, churchName }: CheckoutFormProps) => {
  useEffect(() => {
    // Listen for CSP violations
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      // Debug logging removed: CSP violation details
      // Consider sending to error tracking service in production instead
    };
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    
    // Suppress WKWebView postMessage errors in WebView environments
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorString = args[0]?.toString() || '';
      // Filter out WKWebView postMessage errors which are harmless
      if (errorString.includes('WKWebView') || errorString.includes('postMessage')) {
        return; // Suppress this specific error
      }
      originalConsoleError.apply(console, args);
    };
    
    // Global error handler to suppress WKWebView errors from appearing in UI
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes('WKWebView') || event.message?.includes('postMessage')) {
        event.preventDefault(); // Prevent the error from appearing in the UI
        return false;
      }
    };
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      console.error = originalConsoleError; // Restore original console.error
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation(['donations', 'common']);
  const { trackDonation, trackEvent } = usePostHog();

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  // Calculate display amount based on formData
  const baseAmount = formData.amount || 0;
  let displayAmount = baseAmount;
  if (formData.coverFees && baseAmount > 0) {
    const fee = (baseAmount * 0.029) + 0.30;
    displayAmount = baseAmount + fee;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      setMessage(t('donations:donationPayment.stripeNotLoaded', "Stripe is not ready yet. Please wait a moment."));
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    // Track donation attempt
    trackEvent('donation_initiated', {
      amount: displayAmount,
      donation_type: formData.donationTypeName || 'Unknown',
      church_slug: churchSlug,
      covers_fees: formData.coverFees || false,
    });

    const calculatedReturnUrl = `${window.location.origin}/${churchSlug}/donation-successful`;
    // Debug logging removed: confirming Stripe payment

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${churchSlug}/donation-successful?amount=${formData.amount}&churchName=${encodeURIComponent(churchName || '')}`,
        // receipt_email removed - we send custom receipts via webhook/Resend instead
      },
      redirect: "if_required" // Changed to if_required to handle redirect better
    });

    // Handle the response
    if (error) {
      // Error occurred
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || t('donations:donationPayment.genericPaymentError', "An error occurred with your payment."));
      } else {
        setMessage(t('donations:donationPayment.unexpectedPaymentError', "An unexpected error occurred. Please try again."));
      }
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded but redirect didn't happen automatically (e.g., in WebView)
      // Clear the session storage to allow future donations
      const donationKey = `donation_${churchSlug}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${formData.campaignId || 'no-campaign'}`;
      sessionStorage.removeItem(donationKey);
      
      // Manually redirect to success page
      const successUrl = `${window.location.origin}/${churchSlug}/donation-successful?amount=${formData.amount}&churchName=${encodeURIComponent(churchName || '')}`;
      window.location.href = successUrl;
    } else {
      // Payment is processing or requires additional action
      // The redirect should have happened automatically
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <LinkAuthenticationElement
        id="link-authentication-element"
      />
      <PaymentElement id="payment-element" onReady={() => setIsPaymentElementReady(true)} options={{
        layout: {
          type: 'accordion',
          defaultCollapsed: false,
          radios: false,
          spacedAccordionItems: true
        },
        // Explicitly enable wallets (Apple Pay, Google Pay)
        wallets: {
          applePay: 'auto',
          googlePay: 'auto'
        }
      }} />
      
      {/* Fee coverage display - logic handled by parent, shown here for context if needed */}
      {formData.coverFees && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('donations:donationPayment.feesCoveredMessage', { amount: baseAmount.toFixed(2) })}
        </div>
      )}

      <Button type="submit" disabled={!stripe || !elements || isProcessing || !isPaymentElementReady} className="w-full">
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Gift className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? t('donations:donationPayment.processing', 'Processing...') : `${t('donations:donationPayment.donate', 'Donate')} ${displayAmount.toFixed(2)}`}
      </Button>
      
      {message && <div id="payment-message" className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</div>}
      
      <Button type="button" variant="outline" onClick={onBack} className="w-full">
        {t('common:back', 'Back')}
      </Button>
    </form>
  );
};


export default function DonationPayment({ formData, updateFormData, onBack, churchId, churchSlug, donorId, churchName }: DonationPaymentProps) {
  const { t } = useTranslation(['donations', 'common']);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeAccount, setStripeAccount] = useState<string | null>(null); // Store Connect account ID
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(false); // Start false
  const [initError, setInitError] = useState<string | null>(null);
  const initializationRef = useRef<AbortController | null>(null); // Track current initialization

  // Create a stable session key for this specific donation configuration
  // Don't include timestamp so it remains the same across remounts
  const donationSessionKey = useMemo(() => {
    return `donation_${churchId}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${formData.campaignId || 'no-campaign'}`;
  }, [churchId, formData.donationTypeId, formData.amount, formData.coverFees, formData.campaignId]);

  // Function to initiate payment - called once when component mounts with valid data
  const initiateDonationPayment = useCallback(async () => {
    // Check if we've already initialized for this session using sessionStorage
    const hasInitialized = sessionStorage.getItem(donationSessionKey);
    
    if (hasInitialized) {
      console.log('[DonationPayment] Already initialized in this session, skipping. Key:', donationSessionKey);
      // Try to retrieve the stored client secret
      const storedData = JSON.parse(hasInitialized);
      if (storedData.clientSecret && storedData.stripeAccount) {
        setClientSecret(storedData.clientSecret);
        setStripeAccount(storedData.stripeAccount);
      }
      return;
    }

    // Prevent multiple simultaneous calls
    if (initializationRef.current) {
      console.log('[DonationPayment] Initialization already in progress, skipping');
      return;
    }

    // If we already have a client secret, don't fetch again
    if (clientSecret) {
      console.log('[DonationPayment] Already have client secret, skipping');
      return;
    }

    // Check required fields
    if (!formData.donationTypeId || formData.amount <= 0 || !churchId) {
      console.log('[DonationPayment] Missing required fields, not initializing');
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    initializationRef.current = abortController;

    console.log('[DonationPayment] Starting payment initialization with session key:', donationSessionKey);
    setIsLoadingClientSecret(true);
    setInitError(null);

    try {
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error(t('donations:donationPayment.stripeKeyMissing', "Stripe publishable key is not configured."));
      }

      // Generate a unique idempotency key for THIS specific API call
      const uniqueIdempotencyKey = `${crypto.randomUUID()}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${Date.now()}`;
      console.log('[DonationPayment] Making API call with idempotency key:', uniqueIdempotencyKey);
      
      const response = await fetch('/api/donations/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uniqueIdempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey: uniqueIdempotencyKey,
          churchId: churchId,
          donationTypeId: formData.donationTypeId,
          baseAmount: Math.round(formData.amount * 100), // Convert to cents
          currency: 'usd', // Assuming USD, make dynamic if needed
          coverFees: formData.coverFees,
          isAnonymous: formData.isAnonymous,
          ...(formData.firstName && !formData.isAnonymous && { firstName: formData.firstName }),
          ...(formData.lastName && !formData.isAnonymous && { lastName: formData.lastName }),
          ...(formData.email && !formData.isAnonymous && { donorEmail: formData.email }), // API expects donorEmail
          ...(formData.phone && !formData.isAnonymous && { phone: formData.phone }),

          // Address info (conditionally added, now flat)
          ...(formData.street && !formData.isAnonymous && { street: formData.street }),
          ...(formData.addressLine2 && !formData.isAnonymous && { addressLine2: formData.addressLine2 }),
          ...(formData.city && !formData.isAnonymous && { city: formData.city }),
          ...(formData.state && !formData.isAnonymous && { state: formData.state }),
          ...(formData.zipCode && !formData.isAnonymous && { zipCode: formData.zipCode }), // Matches flat Zod schema field
          ...(formData.country && !formData.isAnonymous && { country: formData.country }),

          ...(donorId && { donorId: donorId }), // Include donorId if available
          ...(formData.campaignId && { campaignId: formData.campaignId }),
        }),
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log('[DonationPayment] Request was aborted');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to initiate donation. Please try again.' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.clientSecret) {
        console.log('[DonationPayment] Successfully received client secret, transaction ID:', data.transactionId);
        
        // Debug: Log payment method information
        console.log('[DonationPayment] Payment method types:', data.paymentMethodTypes);
        console.log('[DonationPayment] Payment method config:', data.paymentMethodConfiguration);
        
        // Store in sessionStorage to prevent duplicate calls
        sessionStorage.setItem(donationSessionKey, JSON.stringify({
          clientSecret: data.clientSecret,
          stripeAccount: data.stripeAccount || null,
          transactionId: data.transactionId,
          timestamp: Date.now()
        }));
        
        setClientSecret(data.clientSecret);
        setStripeAccount(data.stripeAccount || null);
      } else {
        throw new Error(t('donations:donationPayment.clientSecretError', 'Failed to retrieve client secret.'));
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('[DonationPayment] Request aborted');
        return;
      }
      console.error('[DonationPayment] Error in initiateDonationPayment:', error);
      setInitError(error.message || t('donations:donationPayment.initError', 'Error initializing payment form.'));
      setClientSecret(null);
    } finally {
      setIsLoadingClientSecret(false);
      initializationRef.current = null; // Clear the ref
    }
  }, [formData.donationTypeId, formData.amount, formData.coverFees, formData.isAnonymous, 
      formData.firstName, formData.lastName, formData.email, formData.phone,
      formData.street, formData.addressLine2, formData.city, formData.state, 
      formData.zipCode, formData.country, churchId, donorId, clientSecret, donationSessionKey, t]);

  // Effect to initialize payment only once when component mounts with valid data
  useEffect(() => {
    // Only initialize once when we have the required data
    if (formData.donationTypeId && formData.amount > 0 && churchId) {
      initiateDonationPayment();
    }

    // Cleanup function to abort any in-flight requests and clean sessionStorage
    return () => {
      if (initializationRef.current) {
        initializationRef.current.abort();
        initializationRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    }
  };

  // This top-level check for NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY can provide immediate feedback
  // if the key is missing, even before the useEffect runs or if it's somehow bypassed.
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
     return (
      <div className="space-y-6 p-4 border border-red-500 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-700">{t('donations:donationPayment.configErrorTitle', "Configuration Error")}</h3>
        <p className="text-red-600">{t('donations:donationPayment.stripeKeyMissingAdmin', "Stripe publishable key is missing. Please contact support or the site administrator.")}</p>
         <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  // Check if we need to initialize
  const hasSessionData = sessionStorage.getItem(donationSessionKey);
  
  if (!clientSecret && !isLoadingClientSecret && !initError && !hasSessionData) {
    // Check if we have the required data to initialize
    if (formData.donationTypeId && formData.amount > 0 && churchId) {
      // Trigger initialization
      initiateDonationPayment();
      return (
        <div className="flex flex-col justify-center items-center p-8 w-full">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Loading payment form...')}</p>
        </div>
      );
    }
  }

  if (isLoadingClientSecret) {
    return (
      <div className="flex flex-col justify-center items-center p-8 w-full">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Loading payment form...')}</p>
      </div>
    );
  }

  if (initError || (!clientSecret && hasSessionData)) {
    return (
      <div className="space-y-6 p-4 border border-red-500 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-700">{t('donations:donationPayment.initiationErrorTitle', 'Payment Initialization Failed')}</h3>
        <p className="text-red-600">{initError || t('donations:donationPayment.clientSecretMissing', 'Could not retrieve payment details. Please try refreshing or contact support.')}</p>
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    // Waiting for initialization
    return (
      <div className="flex flex-col justify-center items-center p-8 w-full">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Preparing payment form...')}</p>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret!, // Ensured by checks above to be a string
    appearance: appearance
  };
  
  return (
    <div className="space-y-6">
      <Elements options={options} stripe={getStripePromise(stripeAccount)}>
        <CheckoutForm formData={formData} onBack={onBack} churchId={churchId} churchSlug={churchSlug} churchName={churchName} />
      </Elements>
    </div>
  );
}