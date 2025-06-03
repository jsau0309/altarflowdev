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

export function BankingContent() {
  const [activeTab, setActiveTab] = useState("account")
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [churchId, setChurchId] = useState<string | null>(null)
  const { t } = useTranslation(['banking', 'common'])

  const { orgId, isLoaded: isClerkLoaded } = useAuth() // Renamed for clarity

  useEffect(() => {
    const fetchStripeAccountInternal = async () => {
      // If Clerk is not loaded yet, set loading and wait.
      if (!isClerkLoaded) {
        setIsLoading(true); 
        return;
      }

      // Clerk is loaded, now check for orgId.
      if (!orgId) {
        setError(t('common:errors.noOrganizationSelected'));
        setStripeAccount(null);
        setIsLoading(false); // Finished this path
        return;
      }

      // Clerk is loaded and orgId is available. Proceed to fetch.
      setIsLoading(true); // For the Stripe API call itself
      setChurchId(orgId);

      // TODO: The actual fetch call to /api/stripe needs to be here
      // For now, let's assume it's done and we're just setting loading states
      // Example: 
      // try {
      //   const response = await fetch(...);
      //   const data = await response.json();
      //   setStripeAccount(data.account);
      // } catch (e) {
      //   setError(t('common:errors.failedToFetchStripeAccount'));
      // } finally {
      //   setIsLoading(false);
      // }
      // Simulating end of fetch for now if no actual fetch is in this block
      // If fetchStripeAccountInternal is supposed to do the fetch, ensure setIsLoading(false) is called appropriately after it. 
      // If the fetch is done elsewhere and this effect only sets up, this might be okay.
 
      setError(null); // Clear previous errors

      try {
        
        // Fetch the latest Stripe account status
        const stripeResponse = await fetch('/api/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `get_account_${Date.now()}`
          },
          body: JSON.stringify({
            action: 'getAccount',
            churchId: orgId, // Use orgId directly
            refresh: true
          })
        })

        if (!stripeResponse.ok) {
          // If no account exists, that's fine - we'll show the connect button
          if (stripeResponse.status === 404) {
            setStripeAccount(null);
            return;
          }
          const errorData = await stripeResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch Stripe account');
        }

        const account = await stripeResponse.json();
        
        // Log the account status for debugging
        console.log('Stripe Account Status:', {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements
        });
        
        setStripeAccount(account);
      } catch (err) {
        console.error('Error fetching Stripe account:', err);
        setError(err instanceof Error ? err.message : t('common:errors.unknownError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchStripeAccountInternal()
  }, [isClerkLoaded, orgId, t])

  // If Clerk auth state is not loaded yet, show a loader for the whole content.
  // This must come AFTER all hook calls.
  if (!isClerkLoaded) {
    return (
      <div className="container mx-auto py-6 space-y-6 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
              {t('banking:bankingContent.tabs.account')}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.payouts')}
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.balance')}
            </TabsTrigger>
          </TabsList>
        </div>

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

      </Tabs>
    </div>
  )
}
