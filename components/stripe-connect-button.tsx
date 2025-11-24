'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Banknote, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


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
  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Centralized logic for button appearance and behavior
  const getButtonConfigLogic = () => {
    const account = currentAccount || accountData;

    if (account?.stripeAccountId) {
      // Debug logging removed: Stripe account data for button config
    }

    if (!account || !account.stripeAccountId) {
      return {
        text: t('banking:connectWithStripe'),
        variant: 'default' as const,
        icon: <Banknote className="h-4 w-4" />,
        tooltip: t('banking:connectWithStripeTooltip'),
        actionType: 'createAccountLink' as const,
      };
    }

    const {
      verificationStatus,
      requirementsCurrentlyDue,
      requirementsEventuallyDue, // Destructure this field
      requirementsDisabledReason,
      charges_enabled,
      payouts_enabled,
      details_submitted
    } = account;

    // Ensure requirements arrays are always arrays, even if null/undefined from props/API
    const currentReqs = Array.isArray(requirementsCurrentlyDue) ? requirementsCurrentlyDue : [];
    const eventualReqs = Array.isArray(requirementsEventuallyDue) ? requirementsEventuallyDue : [];

    if (verificationStatus === 'restricted') {
      return {
        text: t('banking:accountRestricted'),
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        tooltip: t('banking:accountRestrictedTooltip', {
          reason: requirementsDisabledReason || t('banking:unknownReason'),
        }),
        actionType: 'createAccountLink' as const, // Should go to onboarding to fix restriction
      };
    }

    // If there are current requirements, or if status is action_required, or if there are eventual requirements
    // (The 'restricted' case is handled by the preceding 'if' block)
    if (currentReqs.length > 0 || verificationStatus === 'action_required' || eventualReqs.length > 0) {
      // Determine the requirements to display in the tooltip - prioritize current, then eventual
      const displayReqs = currentReqs.length > 0 ? currentReqs : eventualReqs;
      return {
        text: t('banking:actionRequired'),
        variant: 'outline' as const,
        icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        tooltip: t('banking:actionRequiredTooltip', {
          requirements: displayReqs.length > 0
            ? displayReqs.join(', ')
            : t('banking:additionalInfoNeeded'),
        }),
        actionType: 'createAccountLink' as const, // Should go to onboarding to provide required info
      };
    }

    if (verificationStatus === 'pending') {
      return {
        text: t('banking:verificationPending'),
        variant: 'outline' as const,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        tooltip: t('banking:verificationTooltip'),
        actionType: 'createLoginLink' as const,
      };
    }

    if (verificationStatus === 'verified' && charges_enabled && payouts_enabled) {
      return {
        text: t('banking:connected'),
        variant: 'secondary' as const,
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        tooltip: t('banking:fullyConnected'),
        actionType: 'none' as const, // No action needed, fully connected
      };
    }

    // Fallback for intermediate states (e.g., verified but payouts/charges not active, or details_submitted but not fully verified)
    if (details_submitted) { // Covers verified but not fully operational, or unverified but started onboarding
      return {
        text: t('banking:completeVerification'),
        variant: 'outline' as const,
        icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        tooltip: t('banking:completeVerificationTooltip'),
        actionType: 'createAccountLink' as const, // Should go to onboarding to complete verification
      };
    }
    
    // Default: Connect (e.g. 'unverified' and no details_submitted)
    return {
      text: t('banking:connectWithStripe'),
      variant: 'default' as const,
      icon: <BanknoteIcon className="h-4 w-4" />,
      tooltip: t('banking:connectWithStripeTooltip'),
      actionType: 'createAccountLink' as const,
    };
  };

  const buttonConfig = React.useMemo(getButtonConfigLogic, [currentAccount, accountData, t]);

  // Determine if polling is needed (only when Stripe status is 'pending')
  const shouldPoll = React.useMemo(() => {
    const account = currentAccount || accountData;
    return account?.verificationStatus === 'pending';
  }, [currentAccount, accountData]);

  // Poll for account status updates when in pending state
  useEffect(() => {
    if (!shouldPoll) return;

    const POLLING_INTERVAL = 10000; // 10 seconds
    
    const checkAccountStatus = async () => {
      if (!isMountedRef.current) return;
      
      try {
        // Debug logging removed: polling account status
        const response = await fetch('/api/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({ action: 'getAccount', churchId: churchId, refresh: true }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[StripeConnectButton] Error polling account status:', {
            status: response.status,
            errorData
          });
          // Don't toast on every poll failure, could be noisy
          return;
        }

        const data = await response.json();
        if (data.account && isMountedRef.current) {
          // Debug logging removed: polled account data
          setCurrentAccount(data.account);

          // Check if it's now fully connected based on new criteria
          if (
            data.account.verificationStatus === 'verified' &&
            (!data.account.requirementsCurrentlyDue || data.account.requirementsCurrentlyDue.length === 0) &&
            data.account.charges_enabled &&
            data.account.payouts_enabled
          ) {
            if (onConnectSuccess) {
              onConnectSuccess(data.account);
            }
          }
        }
      } catch (error) {
        console.error('[StripeConnectButton] Exception during polling:', error);
      }
    };

    const intervalId = setInterval(checkAccountStatus, POLLING_INTERVAL);
    checkAccountStatus(); // Initial check

    return () => {
      clearInterval(intervalId);
    };
  }, [shouldPoll, churchId, onConnectSuccess]);

  const handleMainAction = async () => {
    // If action is 'none', don't do anything (fully connected state)
    if (buttonConfig.actionType === 'none') {
      return;
    }
    
    setIsLoading(true);
    try {
      const account = currentAccount || accountData;

      if (!buttonConfig || !buttonConfig.actionType) {
        console.error('[StripeConnectButton] CRITICAL: buttonConfig or buttonConfig.actionType is undefined!');
        toast.error('Internal error: Button configuration is missing.');
        setIsLoading(false);
        return;
      }
      
      let apiAction: 'createAccountLink' | 'createLoginLink';
      let payload: any;

      if (buttonConfig.actionType === 'createAccountLink') {
        apiAction = 'createAccountLink';
        payload = {
          action: apiAction,
          churchId: churchId,
          returnUrl: window.location.href, 
          refreshUrl: window.location.href,
        };
      } else if (buttonConfig.actionType === 'createLoginLink') {
        apiAction = 'createLoginLink';
        if (!account?.stripeAccountId) {
          toast.error('Stripe Account ID is missing. Cannot create login link.');
          setIsLoading(false);
          return;
        }
        payload = {
          action: apiAction,
          accountId: account.stripeAccountId,
        };
      } else {
        // Unknown action type
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to perform Stripe action' }));
        throw new Error(errorData.message || `Stripe API request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      const url = responseData.url;
      
      if (url) {
        window.open(url, '_blank');
      } else {
        console.error('[StripeConnectButton] URL missing or invalid in response:', responseData);
        toast.error('Failed to get a valid link from Stripe. Please try again.');
      }
    } catch (error) {
      console.error('Stripe action failed:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn("flex items-center gap-2", className)}
            variant={buttonConfig.variant as any}
            size={size}
            onClick={handleMainAction}
            disabled={isLoading || buttonConfig.actionType === 'none'}
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