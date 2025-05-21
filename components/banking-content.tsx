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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/nextjs'
import { StripeConnectButton, type StripeAccount } from './stripe-connect-button'

export function BankingContent() {
  const [activeTab, setActiveTab] = useState("account")
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [churchId, setChurchId] = useState<string | null>(null)
  const { t } = useTranslation(['banking', 'common'])

  const { orgId } = useAuth()

  // Fetch Stripe account status on component mount
  useEffect(() => {
    const fetchStripeAccount = async () => {
      try {
        setIsLoading(true)
        
        if (!orgId) {
          throw new Error('No organization selected')
        }
        
        // Use the organization ID from Clerk
        setChurchId(orgId)
        
        // Fetch the latest Stripe account status
        const stripeResponse = await fetch('/api/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `get_account_${Date.now()}`
          },
          body: JSON.stringify({
            action: 'getAccount',
            churchId: orgId,
            refresh: true // Add this flag to force a fresh check with Stripe
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
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStripeAccount()
  }, [])

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
          </div>
        </div>
      </div>
      
      {stripeAccount && (
        <Alert className="mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <AlertTitle className="text-green-800">
                {t('banking:bankingContent.connectedTitle')}
              </AlertTitle>
              <AlertDescription className="text-green-700">
                {t('banking:bankingContent.connectedDescription')}
              </AlertDescription>
              {stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled && (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('banking:bankingContent.fullyConnected')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      <Alert className="mb-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('banking:bankingContent.alert.title')}</AlertTitle>
        <AlertDescription>
          {t('banking:bankingContent.alert.description')}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="account" className="w-full space-y-6" onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full min-w-max mb-2">
            <TabsTrigger value="account" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.account')}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.payouts')}
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.tax')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 whitespace-nowrap">
              {t('banking:bankingContent.tabs.settings')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>{t('banking:bankingContent.account.title')}</CardTitle>
              <CardDescription>{t('banking:bankingContent.account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">{t('banking:bankingContent.account.availableBalanceTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="text-3xl font-bold">$4,285.00</div>
                    <p className="text-sm text-muted-foreground mt-1">{t('banking:bankingContent.account.availableBalanceSubtitle')}</p>
                    <div className="flex mt-4">
                      <Button size="sm">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        {t('banking:bankingContent.account.withdrawButton')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">{t('banking:bankingContent.account.pendingBalanceTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="text-3xl font-bold">$1,250.00</div>
                    <p className="text-sm text-muted-foreground mt-1">{t('banking:bankingContent.account.pendingBalanceSubtitle')}</p>
                    <div className="flex mt-4 items-center text-sm text-muted-foreground">
                      <Info className="mr-2 h-4 w-4" />
                      {t('banking:bankingContent.account.pendingBalanceNote')}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">{t('banking:bankingContent.account.connectedAccountsTitle')}</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border rounded-md gap-4">
                    <div className="flex items-center">
                      <Landmark className="h-8 w-8 mr-4 text-primary" />
                      <div>
                        <p className="font-medium">{t('banking:bankingContent.account.defaultBankName')}</p>
                        <p className="text-sm text-muted-foreground">{t('banking:bankingContent.account.defaultBankEnding')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Badge variant="outline" className="mr-2">
                        {t('common:default')}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        {t('common:edit')}
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 border border-dashed rounded-md text-center">
                    <p className="text-muted-foreground mb-2">{t('banking:bankingContent.account.addAccountPrompt')}</p>
                    <Button variant="outline">
                      <BankIcon className="mr-2 h-4 w-4" />
                      {t('banking:bankingContent.account.addAccountButton')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">{t('banking:bankingContent.account.stripeTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('banking:bankingContent.account.stripeDescription')}
                </p>
                <div className="h-48 border border-dashed rounded-md flex items-center justify-center my-4">
                  <p className="text-muted-foreground">{t('banking:bankingContent.account.stripePlaceholder')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>{t('banking:bankingContent.payouts.title')}</CardTitle>
              <CardDescription>{t('banking:bankingContent.payouts.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    {t('banking:bankingContent.payouts.filterAll')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    {t('banking:bankingContent.payouts.filterScheduled')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    {t('banking:bankingContent.payouts.filterCompleted')}
                  </Button>
                </div>
                <Button size="sm" className="w-full sm:w-auto">
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  {t('banking:bankingContent.payouts.requestButton')}
                </Button>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">{t('banking:bankingContent.payouts.stripeTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('banking:bankingContent.payouts.stripeDescription')}
                </p>
                <div className="h-60 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">{t('banking:bankingContent.payouts.stripePlaceholder')}</p>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="p-5 border-b">
                  <h3 className="font-medium">{t('banking:bankingContent.payouts.recentTitle')}</h3>
                </div>
                <div className="divide-y">
                  {[
                    { date: "Mar 15, 2025", amount: "$1,250.00", status: t('banking:bankingContent.payouts.statusCompleted') },
                    { date: "Mar 1, 2025", amount: "$2,340.00", status: t('banking:bankingContent.payouts.statusCompleted') },
                    { date: "Feb 15, 2025", amount: "$1,890.00", status: t('banking:bankingContent.payouts.statusCompleted') },
                  ].map((payout, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-2">
                      <div>
                        <p className="font-medium">{payout.date}</p>
                        <p className="text-sm text-muted-foreground">{t('banking:bankingContent.payouts.payoutType')}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-medium">{payout.amount}</p>
                        <Badge variant="outline" className="bg-green-50">
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Information Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>{t('banking:bankingContent.tax.title')}</CardTitle>
              <CardDescription>{t('banking:bankingContent.tax.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">{t('banking:bankingContent.tax.stripeTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('banking:bankingContent.tax.stripeDescription')}
                </p>
                <div className="h-40 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">{t('banking:bankingContent.tax.stripePlaceholder')}</p>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="p-5 border-b">
                  <h3 className="font-medium">{t('banking:bankingContent.tax.documentsTitle')}</h3>
                </div>
                <div className="divide-y">
                  {[
                    { year: "2024", type: "1099-K", status: t('common:available') },
                    { year: "2023", type: "1099-K", status: t('common:available') },
                    { year: "2022", type: "1099-K", status: t('common:available') },
                  ].map((doc, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {t('banking:bankingContent.tax.docName', { type: doc.type, year: doc.year })}
                          </p>
                          <p className="text-sm text-muted-foreground">{t('banking:bankingContent.tax.docSubtitle')}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        {t('common:download')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader className="px-6 py-5 pb-2">
                  <CardTitle className="text-lg">{t('banking:bankingContent.tax.infoTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-6 py-5">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">{t('banking:bankingContent.tax.idTypeLabel')}</p>
                      <p>{t('banking:bankingContent.tax.idTypeValue')}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">{t('banking:bankingContent.tax.idLabel')}</p>
                      <p>{t('banking:bankingContent.tax.idValue')}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">{t('banking:bankingContent.tax.entityNameLabel')}</p>
                      <p>{t('banking:bankingContent.tax.entityNameValue')}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">{t('banking:bankingContent.tax.statusLabel')}</p>
                      <Badge variant="outline" className="bg-green-50">
                        {t('banking:bankingContent.tax.statusValue')}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    {t('banking:bankingContent.tax.updateButton')}
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>{t('banking:bankingContent.settings.title')}</CardTitle>
              <CardDescription>{t('banking:bankingContent.settings.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">{t('banking:bankingContent.settings.scheduleTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{t('banking:bankingContent.settings.currentScheduleLabel')}</p>
                          <p className="text-sm text-muted-foreground">{t('banking:bankingContent.settings.currentScheduleValue')}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          {t('common:change')}
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{t('banking:bankingContent.settings.nextPayoutDateLabel')}</p>
                          <p className="text-sm text-muted-foreground">{t('banking:bankingContent.settings.nextPayoutDateValue')}</p>
                        </div>
                        <Badge>{t('banking:bankingContent.settings.statusScheduled')}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">{t('banking:bankingContent.settings.securityTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{t('banking:bankingContent.settings.twoFactorLabel')}</p>
                          <p className="text-sm text-muted-foreground">{t('banking:bankingContent.settings.twoFactorDescription')}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          {t('common:enabled')}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{t('banking:bankingContent.settings.notificationsLabel')}</p>
                          <p className="text-sm text-muted-foreground">{t('banking:bankingContent.settings.notificationsDescription')}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          {t('common:enabled')}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Shield className="mr-2 h-4 w-4" />
                        {t('banking:bankingContent.settings.manageSecurityButton')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">{t('banking:bankingContent.settings.stripeTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('banking:bankingContent.settings.stripeDescription')}
                </p>
                <div className="h-40 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">{t('banking:bankingContent.settings.stripePlaceholder')}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">{t('banking:bankingContent.settings.apiTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('banking:bankingContent.settings.apiDescription')}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{t('banking:bankingContent.settings.webhookStatusLabel')}</p>
                    <Badge variant="outline" className="bg-green-50">
                      {t('common:active')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{t('banking:bankingContent.settings.apiModeLabel')}</p>
                    <Badge>{t('common:live')}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  {t('banking:bankingContent.settings.manageApiButton')}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border rounded-lg gap-4">
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('banking:bankingContent.settings.helpTitle')}</p>
                    <p className="text-sm text-muted-foreground">{t('banking:bankingContent.settings.helpDescription')}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('banking:bankingContent.settings.contactSupportButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
