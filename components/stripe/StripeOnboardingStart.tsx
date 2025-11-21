"use client";


import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Building2, CreditCard, Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StripeConnectEmbeddedWrapper from './StripeConnectEmbeddedWrapper';

export default function StripeOnboardingStart() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const { t } = useTranslation('banking');
  const { orgId } = useAuth();

  // Check if a Stripe Connect account already exists
  useEffect(() => {
    const checkExistingAccount = async () => {
      // Wait for orgId to be available
      if (!orgId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `check_account_${orgId}_${Date.now()}_${Math.random()}`,
          },
          body: JSON.stringify({
            action: 'getAccount',
            churchId: orgId,
          }),
        });

        if (response.ok) {
          const account = await response.json();
          if (account?.stripeAccountId) {
            setExistingAccount(account);
            // If account exists but onboarding not complete, allow resuming
            if (!account.charges_enabled || !account.payouts_enabled) {
              // Account exists but needs to complete onboarding
              setHasStarted(false);
            } else {
              // Account is fully set up, shouldn't be here
              setHasStarted(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing account:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAccount();
  }, [orgId]); // Re-run when orgId becomes available

  const handleStartOnboarding = async () => {
    try {
      // If account already exists, just continue with existing account
      if (existingAccount?.stripeAccountId) {
        setHasStarted(true);
        return;
      }

      // Otherwise create a new account
      const response = await fetch('/api/stripe/connect/account-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startOnboarding: true }),
      });

      if (response.ok) {
        const data = await response.json();
        // If we get a client_secret, the account was created
        if (data.client_secret) {
          setHasStarted(true);
        }
      }
    } catch (error) {
      console.error('Error starting onboarding:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center mt-20">
        <Card className="max-w-3xl w-full">
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasStarted) {
    // Show the embedded onboarding flow
    return <StripeConnectEmbeddedWrapper componentKey="accountOnboarding" />;
  }

  // Determine button text based on whether account exists
  const isResuming = existingAccount?.stripeAccountId && 
                     (!existingAccount.charges_enabled || !existingAccount.payouts_enabled);
  const buttonText = isResuming 
    ? t('banking:onboarding.continueButton', 'Continue Setup') 
    : t('banking:onboarding.startButton', 'Start Setup');

  return (
    <div className="flex justify-center mt-20">
      <Card className="max-w-3xl w-full">
        <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {t('banking:onboarding.title', 'Set Up Your Payment Account')}
            </CardTitle>
            <CardDescription className="text-base mt-1">
              {t('banking:onboarding.description', 'Accept donations and manage payouts securely with Stripe')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {t('banking:onboarding.feature1.title', 'Accept Donations Online')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('banking:onboarding.feature1.description', 'Process credit card and ACH donations securely')}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {t('banking:onboarding.feature2.title', 'Bank-Level Security')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('banking:onboarding.feature2.description', 'PCI compliant with encrypted transactions')}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {t('banking:onboarding.feature3.title', 'Direct Bank Deposits')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('banking:onboarding.feature3.description', 'Funds deposited directly to your church bank account')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            {t('banking:onboarding.setupTime', 'Setup takes about 5-10 minutes. You\'ll need your church EIN and bank account details.')}
          </p>
        </div>

        <Button 
          onClick={handleStartOnboarding}
          size="lg"
          className="w-full"
        >
          {buttonText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
    </div>
  );
}