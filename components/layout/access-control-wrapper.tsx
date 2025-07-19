"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import LoaderOne from "@/components/ui/loader-one"

interface AccessControlWrapperProps {
  children: React.ReactNode
}

// Pages accessible during trial or after cancellation
const TRIAL_ACCESSIBLE_PATHS = ['/flows', '/members', '/settings']
// Pages that require active subscription (not trial)
const SUBSCRIPTION_ONLY_PATHS = ['/donations', '/expenses', '/reports', '/banking']

export function AccessControlWrapper({ children }: AccessControlWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Fetch subscription status
    fetch('/api/subscription')
      .then(res => res.json())
      .then(data => {
        if (data) {
          const status = data.subscriptionStatus
          setSubscriptionStatus(status)
          
          // Determine access based on status and path
          const isTrialAccessiblePath = TRIAL_ACCESSIBLE_PATHS.some(path => pathname.startsWith(path))
          const isSubscriptionOnlyPath = SUBSCRIPTION_ONLY_PATHS.some(path => pathname.startsWith(path))
          
          console.log('[AccessControl] Debug:', {
            pathname,
            status,
            isTrialAccessiblePath,
            isSubscriptionOnlyPath,
            TRIAL_ACCESSIBLE_PATHS,
            SUBSCRIPTION_ONLY_PATHS
          });
          
          if (status === 'active' || status === 'past_due') {
            // Full access
            setHasAccess(true)
          } else if ((status === 'trial' || status === 'canceled' || status === 'pending_payment') && isTrialAccessiblePath) {
            // Limited access during trial or after cancellation
            setHasAccess(true)
          } else if ((status === 'trial' || status === 'canceled' || status === 'pending_payment') && isSubscriptionOnlyPath) {
            // No access to subscription-only pages
            setHasAccess(false)
          } else if (pathname === '/dashboard') {
            // Dashboard is always accessible
            setHasAccess(true)
          } else {
            setHasAccess(false)
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching subscription info:', err)
        setLoading(false)
      })
  }, [pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderOne />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>{t('common:access.restrictedTitle', 'Access Restricted')}</CardTitle>
            </div>
            <CardDescription>
              {subscriptionStatus === 'trial' 
                ? t('common:access.trialRestriction', 'This feature is not available during your trial. Upgrade to access all features.')
                : t('common:access.subscriptionRequired', 'An active subscription is required to access this feature.')
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {subscriptionStatus === 'trial'
                ? t('common:access.trialFeatures', 'During your trial, you have access to Flows, Members, and Settings.')
                : t('common:access.limitedFeatures', 'With your current plan, you have access to Flows, Members, and Settings.')
              }
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/settings?tab=account')}
                className="gap-2"
              >
                {t('common:access.upgradeNow', 'Upgrade Now')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.back()}
              >
                {t('common:goBack', 'Go Back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}