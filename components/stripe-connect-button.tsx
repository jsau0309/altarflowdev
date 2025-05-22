'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, BanknoteIcon, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define the Stripe account type
export type StripeAccount = {
  id: string;
  stripeAccountId: string;
  churchId: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'restricted' | 'action_required';
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  requirementsDisabledReason: string | null;
  tosAcceptanceDate: string | null;
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

// Status types for button display states
type EffectiveStatus = 'not_connected' | 'pending_verification' | 'connected';

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
  const effectiveStatus = React.useMemo<EffectiveStatus>(() => {
    // First check if we have account data from props or state
    const account = accountData || currentAccount;
    
    // If we have account data, check its status first
    if (account?.stripeAccountId) {
      console.log('Account status:', {
        id: account.id,
        stripeAccountId: account.stripeAccountId,
        verificationStatus: account.verificationStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirementsCurrentlyDue: account.requirementsCurrentlyDue,
        requirementsDisabledReason: account.requirementsDisabledReason
      });
      
      // Use the verificationStatus from the account if available
      if (account.verificationStatus) {
        switch (account.verificationStatus) {
          case 'verified':
            return 'connected';
          case 'pending':
          case 'action_required':
          case 'restricted':
            return 'pending_verification';
          case 'unverified':
          default:
            return 'not_connected';
        }
      }
      
      // Fallback to the old status check if verificationStatus is not available
      if (account.charges_enabled && account.payouts_enabled) {
        return 'connected';
      }
      
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
            'Idempotency-Key': crypto.randomUUID(),
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

  // Handle the main button action (connect or view dashboard)
  const handleMainAction = async () => {
    setIsLoading(true);
    try {
      const account = currentAccount || accountData;
      
      if (['connected', 'verified'].includes(account?.verificationStatus || effectiveStatus)) {
        // Create login link for the dashboard
        const response = await fetch('/api/stripe', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID()
          },
          body: JSON.stringify({
            action: 'createLoginLink',
            accountId: account?.stripeAccountId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create dashboard link');
        }

        const responseData = await response.json();
        console.log('[StripeConnectButton] API Response Data for createLoginLink:', responseData);
        const url = responseData.url;
        console.log('[StripeConnectButton] Extracted Login URL:', url);
        if (url) {
          console.log('[StripeConnectButton] Attempting to open login link in new tab:', url);
          window.open(url, '_blank');
        } else {
          console.error('[StripeConnectButton] Login URL is missing or invalid!', responseData);
          toast.error('Failed to get a valid login link. Please try again.');
        }

      } else {
        // Create account link for onboarding
        const response = await fetch('/api/stripe', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID()
          },
          body: JSON.stringify({
            action: 'createAccountLink',
            churchId,
            returnUrl: `${window.location.origin}/banking`,
            refreshUrl: `${window.location.origin}/banking`
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create onboarding link');
        }

        const responseData = await response.json();
        console.log('[StripeConnectButton] API Response Data for createAccountLink:', responseData);
        const url = responseData.onboardingUrl; // handleCreateAccount returns onboardingUrl
        console.log('[StripeConnectButton] Extracted Onboarding URL:', url);
        if (url) {
          console.log('[StripeConnectButton] Attempting redirect to:', url);
          window.location.href = url;
        } else {
          console.error('[StripeConnectButton] Onboarding URL is missing or invalid!', responseData);
          toast.error('Failed to get a valid onboarding link. Please try again.');
        }

      }
    } catch (error) {
      console.error('Stripe action failed:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get button text and variant based on status
  const getButtonConfig = () => {
    const account = currentAccount || accountData;
    const status = account?.verificationStatus || effectiveStatus;
    const requirements = account?.requirementsCurrentlyDue || [];
    const disabledReason = account?.requirementsDisabledReason || '';
    
    switch (status) {
      case 'connected':
      case 'verified':
        return {
          text: t('banking:viewDashboard'),
          variant: 'default' as const,
          icon: <ExternalLink className="h-4 w-4" />,
          tooltip: t('banking:viewDashboardTooltip'),
          onClick: handleMainAction,
        };
      case 'pending':
        return {
          text: t('banking:verificationPending'),
          variant: 'outline' as const,
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          tooltip: t('banking:verificationTooltip'),
          onClick: handleMainAction,
        };
      case 'action_required':
        return {
          text: t('banking:actionRequired'),
          variant: 'outline' as const,
          icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
          tooltip: t('banking:actionRequiredTooltip', {
            requirements: requirements.join(', ')
          }),
          onClick: handleMainAction,
        };
      case 'restricted':
        return {
          text: t('banking:accountRestricted'),
          variant: 'destructive' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          tooltip: t('banking:accountRestrictedTooltip', {
            reason: disabledReason || t('banking:unknownReason')
          }),
          onClick: handleMainAction,
        };
      default:
        return {
          text: t('banking:connectWithStripe'),
          variant: 'default' as const,
          icon: <BanknoteIcon className="h-4 w-4" />,
          tooltip: t('banking:connectWithStripeTooltip'),
          onClick: handleMainAction,
        };
    }
  };
  
  const buttonConfig = getButtonConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn("flex items-center gap-2", className)}
            variant={buttonConfig.variant as any}
            size={size}
            onClick={buttonConfig.onClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              buttonConfig.icon
            )}
            {buttonConfig.text}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{buttonConfig.tooltip}</p>
          {currentAccount?.requirementsCurrentlyDue && currentAccount.requirementsCurrentlyDue.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium">{t('banking:requirementsNeeded')}:</p>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {currentAccount.requirementsCurrentlyDue.map((req: string, i: number) => (
                  <li key={i} className="text-muted-foreground">
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}