import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { useTranslation } from "react-i18next";

interface ChurchData {
  name: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionEndsAt: string | null;
  stripeCustomerId: string | null;
}

export function AccountManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [churchData, setChurchData] = useState<ChurchData | null>(null);

  useEffect(() => {
    fetchChurchData();
  }, []);

  const fetchChurchData = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setChurchData(data);
      }
    } catch (error) {
      console.error("Error fetching church data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_payment: { label: t("settings:billing.status.pendingPayment", "Payment Required"), variant: "destructive" as const },
      active: { label: t("settings:billing.status.active", "Active"), variant: "default" as const },
      past_due: { label: t("settings:billing.status.pastDue", "Past Due"), variant: "secondary" as const },
      canceled: { label: t("settings:billing.status.canceled", "Canceled"), variant: "destructive" as const },
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

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("settings:billing.title", "Subscription & Billing")}
          </CardTitle>
          <CardDescription>
            {t("settings:billing.description", "Manage your subscription and billing information")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
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
            </div>
            
            <div className="flex gap-2">
              {isPendingPayment && (
                <Button asChild>
                  <a href="/billing/required">
                    {t("settings:billing.chooseAPlan", "Choose a Plan")}
                  </a>
                </Button>
              )}
              {isActive && churchData?.stripeCustomerId && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    // TODO: Create Stripe billing portal session
                    alert(t("settings:billing.portalComingSoon", "Billing portal coming soon!"));
                  }}
                >
                  {t("settings:billing.manageSubscription", "Manage Subscription")}
                </Button>
              )}
            </div>
          </div>

          {/* Payment Required Warning */}
          {isPendingPayment && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {t("settings:billing.subscriptionRequired", "Subscription Required")}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t("settings:billing.selectPlanToContinue", "Please select a plan to continue using AltarFlow.")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings:billing.yourPlanIncludes", "Your Plan Includes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                t("settings:billing.features.unlimitedMembers", "Unlimited church members"),
                t("settings:billing.features.donationTracking", "Donation tracking & receipts"),
                t("settings:billing.features.financialReporting", "Financial reporting"),
                t("settings:billing.features.expenseManagement", "Expense management"),
                t("settings:billing.features.emailCommunications", "Email communications"),
                t("settings:billing.features.customDonationForms", "Custom donation forms"),
                t("settings:billing.features.nfcQrPages", "NFC & QR code pages"),
                t("settings:billing.features.prioritySupport", "Priority support")
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}