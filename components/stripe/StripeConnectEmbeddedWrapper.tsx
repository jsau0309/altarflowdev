'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectBalances,
  ConnectPayments,
  ConnectPayouts,
  ConnectPayoutsList,
  // Add other components like ConnectNotificationBanner, ConnectDocumentUpload if needed later
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';

// Define the possible component keys
type StripeComponentKey =
  | 'accountManagement'
  | 'accountOnboarding'
  | 'balances'
  | 'payments'
  | 'payouts'
  | 'payoutsList';

interface StripeConnectEmbeddedWrapperProps {
  componentKey: StripeComponentKey;
  // You can add other props here if needed, e.g., for passing specific configurations
  // to the Stripe components, though many are configured via the Account Session itself.
}

// A simple loading spinner component (you might have a more sophisticated one)
const LoadingSpinner: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
    Loading banking information...
  </div>
);

// A simple error message component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ color: 'red', padding: '20px', border: '1px solid red', borderRadius: '4px' }}>
    Error: {message}
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
        const instance = await loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: fetchClientSecretCallback,
          appearance: stripeAppearance,
        });
        // If it doesn't throw and returns an instance, we set it.
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
  }, []); // Fetch once on component mount

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
      {componentKey === 'accountOnboarding' && <ConnectAccountOnboarding onExit={() => {/* User exited onboarding */}} />}
      {componentKey === 'balances' && <ConnectBalances />}
      {componentKey === 'payments' && <ConnectPayments />}
      {componentKey === 'payouts' && <ConnectPayouts />}
      {componentKey === 'payoutsList' && <ConnectPayoutsList />}
      {/* Add other components here if needed, matching the StripeComponentKey type */}
    </ConnectComponentsProvider>
  );
};

export default StripeConnectEmbeddedWrapper;
