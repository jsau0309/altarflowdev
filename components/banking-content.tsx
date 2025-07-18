"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  ArrowDownToLine,
  BanknoteIcon as BankIcon,
  CheckCircle2,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Loader2,
  
  RefreshCw,
  Shield,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/nextjs'
import { StripeConnectButton, type StripeAccount } from './stripe-connect-button'
import StripeConnectEmbeddedWrapper from './stripe/StripeConnectEmbeddedWrapper';
import LoaderOne from '@/components/ui/loader-one';

export function BankingContent() {
  const [activeTab, setActiveTab] = useState("account")
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [churchId, setChurchId] = useState<string | null>(null)
  const { t } = useTranslation(['banking', 'common'])

  const { orgId, isLoaded: isClerkLoaded } = useAuth() // Renamed for clarity

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchStripeAccountInternal = async () => {
      // If Clerk is not loaded yet, set loading and wait.
      if (!isClerkLoaded) {
        setIsLoading(true);
        return;
      }

      // Clerk is loaded, now check for orgId.
      if (!orgId) {
        if (isMounted) {
          setError(t('common:errors.unknownError'));
          setStripeAccount(null);
          setIsLoading(false);
        }
        return;
      }

      // Clerk is loaded and orgId is available. Proceed to fetch.
      if (isMounted) {
        setIsLoading(true);
        setChurchId(orgId);
        setError(null); // Clear previous errors
      }

      try {
        // Add a small delay to prevent race conditions on initial load
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 100);
        });

        if (!isMounted) return;
        
        // Fetch the latest Stripe account status
        const stripeResponse = await fetch('/api/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `get_account_${orgId}_${Date.now()}_${Math.random()}`
          },
          body: JSON.stringify({
            action: 'getAccount',
            churchId: orgId,
            refresh: true
          })
        })

        if (!isMounted) return;

        if (!stripeResponse.ok) {
          // If no account exists, that's fine - we'll show the connect button
          if (stripeResponse.status === 404) {
            setStripeAccount(null);
            setIsLoading(false);
            return;
          }
          const errorData = await stripeResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch Stripe account');
        }

        // Check if response has content before parsing
        const contentType = stripeResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error('Expected JSON response but got:', contentType);
          throw new Error('Invalid response format from server');
        }

        const responseText = await stripeResponse.text();
        if (!responseText) {
          console.error('Empty response from Stripe API');
          throw new Error('Empty response from server');
        }
        
        let account;
        try {
          account = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', responseText);
          throw new Error('Invalid JSON response from server');
        }
        
        // Log the account status for debugging
        console.log('Stripe Account Status:', {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements
        });
        
        if (isMounted) {
          setStripeAccount(account);
        }
      } catch (err) {
        console.error('Error fetching Stripe account:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : t('common:errors.unknownError'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchStripeAccountInternal();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isClerkLoaded, orgId, t])

  // If Clerk auth state is not loaded yet, show a loader for the whole content.
  // This must come AFTER all hook calls.
  if (!isClerkLoaded) {
    return (
      <div className="container mx-auto py-6 space-y-6 flex justify-center items-center h-[calc(100vh-200px)]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('banking:bankingContent.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('banking:bankingContent.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto" 
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common:refresh')}
          </Button>
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common:loading')}...
              </Button>
            ) : error ? (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('common:error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : churchId ? (
              <StripeConnectButton 
                size="sm" 
                className="w-full sm:w-auto"
                onConnectSuccess={(account) => setStripeAccount(account)}
                churchId={churchId}
                accountStatus={
                  stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled 
                    ? 'connected' 
                    : stripeAccount?.id 
                      ? 'pending_verification' 
                      : 'not_connected'
                }
                accountData={stripeAccount}
              />
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common:loading')}...
              </Button>
            )}
            {/* Stripe Connected Icon with Tooltip */}
            {stripeAccount && stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{t('banking:bankingContent.connectedTitle')}</p>
                    <p>{t('banking:bankingContent.connectedDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="account" className="w-full space-y-6" onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full min-w-max mb-2">
            <TabsTrigger value="account" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.account')}</TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.payouts')}</TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.balance')}</TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[500px] pt-4">
            <LoaderOne />
          </div>
        ) : (
          <>
            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardContent className="space-y-6 px-6 py-5">
                  <StripeConnectEmbeddedWrapper componentKey="accountManagement" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardContent className="space-y-6 px-6 py-5">
                  <StripeConnectEmbeddedWrapper componentKey="payouts" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Information Tab */}
            <TabsContent value="balance" className="space-y-4">
              <Card className="w-full">
                <CardContent className="space-y-4 pt-6 md:pt-6">
                  <StripeConnectEmbeddedWrapper componentKey="balances" />
                  <StripeConnectEmbeddedWrapper componentKey="payments" />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
