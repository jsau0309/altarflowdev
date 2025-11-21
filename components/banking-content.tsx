"use client"


import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  BanknoteIcon as BankIcon,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/nextjs'
import { type StripeAccount } from './stripe-connect-button'
import StripeConnectEmbeddedWrapper from './stripe/StripeConnectEmbeddedWrapper';
import StripeOnboardingStart from './stripe/StripeOnboardingStart';
import LoaderOne from '@/components/ui/loader-one';
import { PayoutReconciliationDashboard } from './payouts/payout-reconciliation-dashboard';

export function BankingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("account")
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [churchId, setChurchId] = useState<string | null>(null)
  const { t } = useTranslation(['banking', 'common'])

  const { orgId, isLoaded: isClerkLoaded } = useAuth() // Renamed for clarity

  // Determine if account is fully connected
  const isFullyConnected = useMemo(() => {
    return stripeAccount?.stripeAccountId && 
           stripeAccount?.charges_enabled && 
           stripeAccount?.payouts_enabled &&
           stripeAccount?.verificationStatus === 'verified'
  }, [stripeAccount])

  // Smart tab visibility based on account status
  const visibleTabs = useMemo(() => {
    // Only show tabs if fully connected
    if (!isFullyConnected) {
      return []
    }
    
    // Show management tabs for connected accounts
    return [
      { id: 'account', label: t('banking:bankingContent.tabs.account'), icon: User },
      { id: 'payments', label: t('banking:bankingContent.tabs.payments'), icon: CreditCard },
      { id: 'payouts', label: t('banking:bankingContent.tabs.payouts'), icon: BankIcon },
      { id: 'reconciliation', label: t('banking:bankingContent.tabs.reconciliation'), icon: FileText }
    ]
  }, [isFullyConnected, t])

  // Initialize active tab from URL on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    const validTabIds = visibleTabs.map(tab => tab.id)
    
    if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else if (visibleTabs.length > 0) {
      // Default to account tab for connected accounts
      setActiveTab('account')
    }
  }, [searchParams, visibleTabs])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL without causing a page refresh
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.push(url.pathname + url.search, { scroll: false })
  }

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
      console.error('Expected JSON response but got', { operation: 'ui.banking.content_type_error', contentType });
          throw new Error('Invalid response format from server');
        }

        const responseText = await stripeResponse.text();
        if (!responseText) {
          console.error('Empty response from Stripe API', { operation: 'ui.error' });
          throw new Error('Empty response from server');
        }
        
        let account;
        try {
          account = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse JSON response', {
            operation: 'ui.banking.json_parse_error',
            responseText: responseText.substring(0, 100)
          }, parseError instanceof Error ? parseError : new Error(String(parseError)));
          throw new Error('Invalid JSON response from server');
        }
        
        // Debug logging removed: Stripe account status details
        
        if (isMounted) {
          setStripeAccount(account);
        }
      } catch (err) {
        console.error('Error fetching Stripe account:', { operation: 'ui.error' }, err instanceof Error ? err : new Error(String(err)));
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
            ) : isFullyConnected ? (
              // Only show the connected badge after onboarding is complete
              <Badge variant="secondary" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {t('banking:connected')}
              </Badge>
            ) : null /* Don't show any button during onboarding */}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[500px] pt-4">
          <LoaderOne />
        </div>
      ) : !isFullyConnected ? (
        // Onboarding State - Show the start onboarding component
        <div className="mt-6">
          {churchId ? (
            <StripeOnboardingStart />
          ) : (
            <Card>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {t('common:loading')}...
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Management State - Show tabs for connected accounts
        <Tabs value={activeTab} className="w-full space-y-6" onValueChange={handleTabChange}>
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full min-w-max mb-2">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="flex-1 whitespace-nowrap flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardContent className="space-y-6 px-6 py-5">
                {/* Account Management component handles everything internally */}
                <StripeConnectEmbeddedWrapper componentKey="accountManagement" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('banking:payments.title')}</CardTitle>
                <CardDescription>
                  {t('banking:payments.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 py-5">
                <StripeConnectEmbeddedWrapper componentKey="payments" />
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
          
          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4">
            <PayoutReconciliationDashboard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
