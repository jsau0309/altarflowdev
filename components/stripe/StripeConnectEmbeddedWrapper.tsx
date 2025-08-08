'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectBalances,
  ConnectPayments,
  ConnectPayouts,
  ConnectPayoutsList,
  ConnectNotificationBanner,
  ConnectDocuments,
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';

// Define the possible component keys
type StripeComponentKey =
  | 'accountManagement'
  | 'accountOnboarding'
  | 'balances'
  | 'payments'
  | 'payouts'
  | 'payoutsList'
  | 'notificationBanner'
  | 'documents';

interface StripeConnectEmbeddedWrapperProps {
  componentKey: StripeComponentKey;
  // You can add other props here if needed, e.g., for passing specific configurations
  // to the Stripe components, though many are configured via the Account Session itself.
}

// A simple loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-3 text-muted-foreground">Loading banking components...</span>
  </div>
);

// A simple error message component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-destructive p-5 border border-destructive rounded-md">
    <p className="font-medium">Error</p>
    <p className="text-sm mt-1">{message}</p>
  </div>
);

const stripeAppearance = {
  variables: {
    colorPrimary: '#2563EB', // Altarflow Blue
    colorBackground: '#FFFFFF',
    colorText: '#1F2937', // Dark gray for text
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    spacingUnit: '4px', // Base unit for spacing
    borderRadius: '6px',  // Slightly rounded corners
  },
  rules: {
    '.Input': {
      borderColor: '#D1D5DB', // Light gray border for inputs
    },
  }
};

const StripeConnectEmbeddedWrapper: React.FC<StripeConnectEmbeddedWrapperProps> = ({ componentKey }) => {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  
  // Map i18n language to Stripe locale
  const getStripeLocale = () => {
    const currentLang = i18n.language;
    // Stripe supports: en, es, fr, de, it, ja, pt, nl, pl, sv, zh, and more
    // For AltarFlow, we map 'en' to 'en' and 'es' to 'es'
    return currentLang === 'es' ? 'es' : 'en';
  };

  useEffect(() => {
    // Define the function to fetch the client secret, as expected by loadConnectAndInitialize
    const fetchClientSecretCallback = async (): Promise<string> => {
      try {
        const response = await fetch('/api/stripe/connect/account-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Failed to fetch account session: ${response.statusText}`;
          console.error('Error fetching Stripe Account Session:', errorMessage);
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.client_secret) {
          setError(null); // Clear any previous error on success
          return data.client_secret;
        } else {
          const errorMessage = 'Client secret not found in response.';
          console.error(errorMessage);
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching account session.';
        console.error('Exception fetching Stripe Account Session:', errorMessage);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    };

    const initializeStripeConnect = async () => {
      setLoading(true);
      setError(null);
            setLoading(true);
      // 

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError('Stripe publishable key is not configured (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).');
        setLoading(false);
        return;
      }

      try {
        // loadConnectAndInitialize is synchronous and returns the instance directly
        // Note: The fetchClientSecret callback is async but handled internally by Stripe
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: fetchClientSecretCallback,
          appearance: stripeAppearance,
          locale: getStripeLocale() as any, // Set locale based on current language
        });
        // Set the instance if initialization was successful
        setConnectInstance(instance);
      } catch (e) {
        // This catch is for errors thrown directly by loadConnectAndInitialize (e.g., invalid pk)
        console.error('Error during loadConnectAndInitialize:', e);
        if (!error) { // Avoid overwriting a more specific error
          setError(e instanceof Error ? e.message : 'Failed to initialize Stripe Connect.');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeStripeConnect();
  }, [i18n.language]); // Reinitialize when language changes

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!connectInstance) {
    // This case should ideally be covered by the error state, but as a fallback:
    return <ErrorMessage message="Could not initialize banking components: Stripe Connect instance is missing." />;
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      {componentKey === 'accountManagement' && <ConnectAccountManagement />}
      {componentKey === 'accountOnboarding' && (
        <ConnectAccountOnboarding 
          onExit={() => {
            // Refresh the page to update account status after onboarding
            window.location.reload();
          }} 
        />
      )}
      {componentKey === 'balances' && <ConnectBalances />}
      {componentKey === 'payments' && <ConnectPayments />}
      {componentKey === 'payouts' && <ConnectPayouts />}
      {componentKey === 'payoutsList' && <ConnectPayoutsList />}
      {componentKey === 'notificationBanner' && <ConnectNotificationBanner />}
      {componentKey === 'documents' && <ConnectDocuments />}
    </ConnectComponentsProvider>
  );
};

export default StripeConnectEmbeddedWrapper;
