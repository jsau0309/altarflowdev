'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { BanknoteIcon, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the Stripe account type
export type StripeAccount = {
  id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  // Add other account properties as needed
};

// Define the component props
type StripeConnectButtonProps = {
  className?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onConnectSuccess?: (account: StripeAccount) => void;
  churchId: string;
  accountStatus?: 'not_connected' | 'pending_verification' | 'connected';
  accountData?: StripeAccount | null;
};

// Stripe Express dashboard URL
const STRIPE_EXPRESS_DASHBOARD = 'https://dashboard.stripe.com/express/overview';

export function StripeConnectButton({ 
  className = "", 
  variant = "default",
  size = "default",
  onConnectSuccess,
  churchId,
  accountStatus = 'not_connected',
  accountData = null
}: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<StripeAccount | null>(accountData);
  const { t } = useTranslation(['banking', 'common']);
  
  // Determine the effective status based on props and account data
  const effectiveStatus = React.useMemo(() => {
    // First check if we have account data from props or state
    const account = accountData || currentAccount;
    
    // If we have account data, check its status first
    if (account?.id) {
      console.log('Account status:', {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      });
      
      // If both charges and payouts are enabled, account is fully connected
      if (account.charges_enabled && account.payouts_enabled) {
        return 'connected';
      }
      
      // If details are submitted but not yet enabled, show pending
      if (account.details_submitted) {
        return 'pending_verification';
      }
    }
    
    // If explicitly set to connected via props, trust that
    if (accountStatus === 'connected') return 'connected';
    
    // Default to not connected
    return 'not_connected';
  }, [accountStatus, accountData, currentAccount]);
  
  // Poll for account status updates when in pending state
  useEffect(() => {
    if (effectiveStatus !== 'pending_verification') return;
    
    const POLLING_INTERVAL = 10000; // 10 seconds for more responsive updates
    let isMounted = true;
    
    const checkAccountStatus = async () => {
      if (!isMounted) return;
      
      try {
        console.log('Checking account status...');
        const response = await fetch('/api/stripe', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Idempotency-Key': `polling_${churchId}_${Date.now()}`
          },
          body: JSON.stringify({
            action: 'getAccount',
            churchId,
            refresh: true
          })
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const account = await response.json();
          console.log('Account status check result:', {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted
          });
          
          // Always update the current account with latest data
          setCurrentAccount(account);
          
          // If account is now fully connected, update the state
          if (account.charges_enabled && account.payouts_enabled) {
            console.log('Account is now fully connected');
            if (onConnectSuccess) {
              onConnectSuccess(account);
            }
          }
        } else {
          const error = await response.json().catch(() => ({}));
          console.error('Error fetching account status:', error);
        }
      } catch (error) {
        console.error('Error polling account status:', error);
      }
    };
    
    // Initial check
    checkAccountStatus();
    
    // Set up polling
    const intervalId = setInterval(checkAccountStatus, POLLING_INTERVAL);
    
    // Clean up interval on unmount or when status changes
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [effectiveStatus, churchId, onConnectSuccess]);

  // Handle the main button click
  const handleMainAction = async () => {
    console.log('Button clicked with status:', effectiveStatus);
    
    // First, refresh the account status to ensure we have the latest data
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': `status_check_${churchId}_${Date.now()}`
        },
        body: JSON.stringify({
          action: 'getAccount',
          churchId,
          refresh: true
        })
      });
      
      if (response.ok) {
        const account = await response.json();
        console.log('Refreshed account status:', {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted
        });
        
        // Always update the current account with latest data
        setCurrentAccount(account);
        
        // If account is now fully connected, redirect to dashboard
        if (account.charges_enabled && account.payouts_enabled) {
          console.log('Account is fully connected, redirecting to dashboard');
          if (onConnectSuccess) onConnectSuccess(account);
          window.open(STRIPE_EXPRESS_DASHBOARD, '_blank', 'noopener,noreferrer');
          return;
        }
        
        // If details are submitted but not yet enabled, show pending status
        if (account.details_submitted) {
          console.log('Account verification still pending');
          toast.info(t('banking:verificationTooltip'));
          return;
        }
      }
    } catch (error) {
      console.error('Error refreshing account status:', error);
      // Continue with normal flow if refresh fails
    }
    
    // If we get here, either refresh failed or account is not connected
    if (effectiveStatus === 'connected' || (currentAccount?.charges_enabled && currentAccount?.payouts_enabled)) {
      console.log('Using cached connected status');
      window.open(STRIPE_EXPRESS_DASHBOARD, '_blank', 'noopener,noreferrer');
      return;
    }
    
    if (effectiveStatus === 'pending_verification' || currentAccount?.details_submitted) {
      console.log('Using cached pending status');
      toast.info(t('banking:verificationTooltip'));
      return;
    }

    // If we get here, status is 'not_connected'
    setIsLoading(true);
    
    try {
      let accountIdToUse = accountData?.id;

      if (!accountIdToUse) {
        // If no account exists, create one
        const initResponse = await fetch('/api/stripe', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Idempotency-Key': `init_account_${churchId}_${Date.now()}`
          },
          body: JSON.stringify({ 
            action: 'getOrCreateAccount', 
            churchId 
          })
        });

        if (!initResponse.ok) {
          const error = await initResponse.json();
          throw new Error(error.error || 'Failed to initialize Stripe account');
        }
        
        const initData = await initResponse.json();
        accountIdToUse = initData.account?.id;
        
        if (initData.account) {
          setCurrentAccount(initData.account);
          if (onConnectSuccess) {
            onConnectSuccess(initData.account);
          }
        }

        // If account is now fully connected, update UI and return
        if (initData.account?.charges_enabled && initData.account?.payouts_enabled) {
          setIsLoading(false);
          return;
        }
      }
      
      if (!accountIdToUse) {
        throw new Error('Stripe Account ID could not be determined');
      }

      // Create Account Link for onboarding
      const accountLinkResponse = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': `create_link_${accountIdToUse}_${Date.now()}`
        },
        body: JSON.stringify({
          action: 'createAccountLink',
          accountId: accountIdToUse,
          churchId,
          returnUrl: `${window.location.origin}/banking`,
          refreshUrl: `${window.location.origin}/banking`
        })
      });

      if (!accountLinkResponse.ok) {
        const error = await accountLinkResponse.json();
        throw new Error(error.error || 'Failed to create Stripe account link');
      }

      const { url: accountLinkUrl } = await accountLinkResponse.json();
      
      // Redirect to Stripe's onboarding
      window.location.href = accountLinkUrl;
      
    } catch (error) {
      console.error('Stripe connection error:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : t('common:errors.unexpectedError')
      );
    } finally {
      // Only reset loading if we're not in a connected state
      if (effectiveStatus === 'not_connected') {
        setIsLoading(false);
      }
    }
  };

  // Render the button content based on state
  const renderButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common:loading')}...
        </>
      );
    }

    switch (effectiveStatus) {
      case 'connected':
        return (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('banking:viewInStripeExpress')}
          </>
        );
      case 'pending_verification':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('banking:verificationInProgress')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('banking:verificationTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        );
      default: // not_connected
        return (
          <>
            <BanknoteIcon className="mr-2 h-4 w-4" />
            {t('banking:connectWithStripe')}
          </>
        );
    }
  };

  return (
    <TooltipProvider>
      <Button
        onClick={handleMainAction}
        disabled={isLoading}
        className={className}
        variant={variant}
        size={size}
      >
        {renderButtonContent()}
      </Button>
    </TooltipProvider>
  );
}