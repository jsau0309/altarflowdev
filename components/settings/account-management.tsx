import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { useTranslation } from "react-i18next";
import { SubscriptionPricing } from "./subscription-pricing";
import { useOrganization } from "@clerk/nextjs";

interface ChurchData {
  name: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionEndsAt: string | null;
  stripeCustomerId: string | null;
  daysUntilEnd: number | null;
  graceDaysRemaining: number | null;
}

export function AccountManagement() {
  const { t } = useTranslation();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [churchData, setChurchData] = useState<ChurchData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChurchData();
  }, []);

  const fetchChurchData = async () => {
    try {
      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/subscription?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setChurchData(data);
      }
    } catch (error) {
      console.error("Error fetching church data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChurchData();
  };

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        alert(t("settings:billing.portalError", "Failed to open billing portal"));
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      alert(t("settings:billing.portalError", "Failed to open billing portal"));
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      free: { label: t("settings:billing.status.free", "Free"), variant: "secondary" as const },
      pending_payment: { label: t("settings:billing.status.pendingPayment", "Payment Required"), variant: "destructive" as const },
      active: { label: t("settings:billing.status.active", "Active"), variant: "default" as const },
      past_due: { label: t("settings:billing.status.pastDue", "Past Due"), variant: "secondary" as const },
      canceled: { label: t("settings:billing.status.canceled", "Canceled"), variant: "destructive" as const },
      grace_period: { label: t("settings:billing.status.gracePeriod", "Grace Period"), variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderOne />
      </div>
    );
  }

  const isActive = churchData?.subscriptionStatus === 'active';
  const isPendingPayment = churchData?.subscriptionStatus === 'pending_payment';
  const isFree = churchData?.subscriptionStatus === 'free';
  const isCanceled = churchData?.subscriptionStatus === 'canceled';
  const isGracePeriod = churchData?.subscriptionStatus === 'grace_period';

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("settings:billing.title", "Subscription & Billing")}
            </CardTitle>
            <CardDescription>
              {t("settings:billing.description", "Manage your subscription and billing information")}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold">
                  {churchData?.subscriptionPlan ? 
                    t(`settings:billing.plans.${churchData.subscriptionPlan}`, 
                      `${churchData.subscriptionPlan.charAt(0).toUpperCase() + churchData.subscriptionPlan.slice(1)} Plan`) : 
                    t("settings:billing.noActivePlan", "No Active Plan")}
                </h3>
                {churchData && getStatusBadge(churchData.subscriptionStatus)}
              </div>
              {churchData?.subscriptionEndsAt && isActive && (
                <p className="text-sm text-muted-foreground">
                  {t("settings:billing.renewsOn", "Renews on")} {new Date(churchData.subscriptionEndsAt).toLocaleDateString()}
                </p>
              )}
              {isCanceled && churchData?.daysUntilEnd !== null && (
                <p className="text-sm text-muted-foreground">
                  {t("settings:billing.endsIn", "Ends in {{days}} days", { days: churchData.daysUntilEnd })}
                </p>
              )}
              {isGracePeriod && churchData?.graceDaysRemaining !== null && (
                <p className="text-sm text-muted-foreground">
                  {t("settings:billing.graceDaysLeft", "{{days}} grace days remaining", { days: churchData.graceDaysRemaining })}
                </p>
              )}
            </div>
            
            {(isActive || isCanceled) && churchData?.stripeCustomerId && (
              <Button 
                onClick={openCustomerPortal}
                disabled={portalLoading}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {portalLoading ? t("settings:billing.loading", "Loading...") : t("settings:billing.manageSubscription", "Manage Subscription")}
              </Button>
            )}
          </div>

          {/* Status Warnings */}
          {(isFree || isPendingPayment || isGracePeriod || isCanceled) && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              isGracePeriod ? 'bg-red-50 dark:bg-red-950/20' : 'bg-amber-50 dark:bg-amber-950/20'
            }`}>
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                isGracePeriod ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  isGracePeriod ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'
                }`}>
                  {isFree && t("settings:billing.freeActive", "Free Plan")}
                  {isPendingPayment && t("settings:billing.subscriptionRequired", "Subscription Required")}
                  {isGracePeriod && t("settings:billing.gracePeriodActive", "Grace Period")}
                  {isCanceled && t("settings:billing.canceledActive", "Subscription Canceled")}
                </p>
                <p className={`text-sm ${
                  isGracePeriod ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
                }`}>
                  {isFree && t("settings:billing.freeMessage", "You're currently on the free plan with limited access. Upgrade to unlock all features.")}
                  {isPendingPayment && t("settings:billing.selectPlanToContinue", "Please select a plan to continue using AltarFlow.")}
                  {isGracePeriod && t("settings:billing.gracePeriodMessage", "Your subscription expired. You have {{days}} days left to renew before losing premium features.", { days: churchData?.graceDaysRemaining || 0 })}
                  {isCanceled && t("settings:billing.canceledMessage", "Your subscription will end on {{date}}. Renew to keep your premium features.", { date: churchData?.subscriptionEndsAt ? new Date(churchData.subscriptionEndsAt).toLocaleDateString() : '' })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isActive ? t("settings:billing.changePlan", "Change Plan") : t("settings:billing.selectPlan", "Select a Plan")}
          </CardTitle>
          <CardDescription>
            {isActive 
              ? t("settings:billing.changePlanDesc", "Switch between monthly and annual billing")
              : t("settings:billing.selectPlanDesc", "Choose the plan that works best for your church")
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization?.id && (
            <SubscriptionPricing 
              currentPlan={churchData?.subscriptionPlan || undefined}
              currentStatus={churchData?.subscriptionStatus}
              organizationId={organization.id}
            />
          )}
        </CardContent>
      </Card>

    </div>
  );
}