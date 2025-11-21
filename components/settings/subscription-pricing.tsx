"use client";


import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  paymentLink?: string;
}

interface SubscriptionPricingProps {
  currentPlan?: string;
  currentStatus?: string;
  organizationId: string;
  trialDaysRemaining?: number;
  hasPromotionalPricing?: boolean;
}

export function SubscriptionPricing({
  currentPlan,
  currentStatus,
  organizationId,
  trialDaysRemaining,
  hasPromotionalPricing
}: SubscriptionPricingProps) {
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [error, setError] = useState<string | null>(null);

  // Promotional coupon code for new customers (3 months at 50% off)
  // TODO: Create this coupon in your Stripe Dashboard
  const PROMOTIONAL_COUPON_CODE = process.env.NEXT_PUBLIC_STRIPE_PROMO_CODE || "50OFF3MONTHS";

  const isTrialUser = currentStatus === 'trial';

  const plans: PricingPlan[] = [
    {
      id: "monthly",
      name: t("settings:billing.plans.monthly", "Monthly"),
      price: 99,
      interval: "month",
      features: [
        t("settings:billing.features.unlimitedMembers", "Unlimited church members"),
        t("settings:billing.features.donationTracking", "Donation tracking & receipts"),
        t("settings:billing.features.financialReporting", "Financial reporting"),
        t("settings:billing.features.expenseManagement", "Expense management"),
        t("settings:billing.features.emailCommunications", "Email communications"),
        t("settings:billing.features.customDonationForms", "Custom donation forms"),
        t("settings:billing.features.nfcQrPages", "NFC & QR code pages"),
        t("settings:billing.features.prioritySupport", "Priority support"),
        ...(isTrialUser ? [t("settings:billing.features.promo3Months", "First 3 months at 50% off ($49.50/month)")] : [])
      ],
      paymentLink: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK || '#'
    },
    {
      id: "annual",
      name: t("settings:billing.plans.annual", "Annual"),
      price: 830,
      interval: "year",
      features: [
        t("settings:billing.features.unlimitedMembers", "Unlimited church members"),
        t("settings:billing.features.donationTracking", "Donation tracking & receipts"),
        t("settings:billing.features.financialReporting", "Financial reporting"),
        t("settings:billing.features.expenseManagement", "Expense management"),
        t("settings:billing.features.emailCommunications", "Email communications"),
        t("settings:billing.features.customDonationForms", "Custom donation forms"),
        t("settings:billing.features.nfcQrPages", "NFC & QR code pages"),
        t("settings:billing.features.prioritySupport", "Priority support"),
        t("settings:billing.features.savePerYear", "Save $358 per year"),
        ...(isTrialUser ? [t("settings:billing.features.promo3MonthsAnnual", "Special promotional pricing available")] : [])
      ],
      popular: true,
      paymentLink: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_LINK || '#'
    }
  ];

  const displayedPlans = billingInterval === "month" ? [plans[0]] : [plans[1]];
  const isCurrentPlan = (planId: string) => currentPlan === planId;

  const handleSubscribe = async (plan: PricingPlan) => {
    // For trial users or free users, use payment links with promotional coupon
    if (currentStatus === "free" || currentStatus === "trial") {
      if (plan.paymentLink && plan.paymentLink !== '#') {
        let url = `${plan.paymentLink}?client_reference_id=${organizationId}`;

        // Apply promotional coupon for trial users
        if (isTrialUser) {
          url += `&prefilled_promo_code=${PROMOTIONAL_COUPON_CODE}`;
        }

        // Debug logging
        console.log('Subscription Debug', {
          operation: 'ui.subscription.debug',
          currentStatus,
          isTrialUser,
          PROMOTIONAL_COUPON_CODE,
          finalUrl: url
        });

        window.location.href = url;
      } else {
        setError(t("settings:billing.errors.noPaymentLink", "Payment link not configured. Please contact support."));
      }
    } else {
      // For ALL other statuses (active, canceled, past_due, grace_period), use customer portal
      try {
        const response = await fetch("/api/stripe/portal", {
          method: "POST",
        });

        if (response.ok) {
          const { url } = await response.json();
          window.location.href = url;
        }
      } catch (error) {
        console.error('Error opening customer portal:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Trial Countdown Banner */}
      {isTrialUser && trialDaysRemaining !== undefined && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {t("settings:billing.trial.title", "Free Trial Active")}
              </h3>
              <p className="text-sm mt-1">
                {trialDaysRemaining > 1
                  ? t("settings:billing.trial.daysRemaining", `You have ${trialDaysRemaining} days remaining in your free trial. Upgrade now to get 3 months at 50% off!`, { days: trialDaysRemaining })
                  : t("settings:billing.trial.lastDay", "Last day of your free trial! Upgrade now to get 3 months at 50% off!")
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Promotional Pricing Banner */}
      {hasPromotionalPricing && (
        <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {t("settings:billing.promo.title", "Promotional Pricing Active")}
              </h3>
              <p className="text-sm mt-1">
                {t("settings:billing.promo.description", "You're currently enjoying 50% off your subscription. This promotional rate will continue for 3 months.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setBillingInterval("month")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              billingInterval === "month" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("settings:billing.monthly", "Monthly")}
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              billingInterval === "year" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("settings:billing.annual", "Annual")}
            <Badge variant="secondary" className="ml-2">
              {t("settings:billing.save30", "Save 30%")}
            </Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {displayedPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              "relative",
              plan.popular && "border-primary",
              isCurrentPlan(plan.id) && "bg-muted/50"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="gap-1">
                  <Zap className="h-3 w-3" />
                  {t("settings:billing.bestValue", "Best Value")}
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {isCurrentPlan(plan.id) && currentStatus === "active" && (
                  <Badge variant="default">
                    {t("settings:billing.currentPlan", "Current Plan")}
                  </Badge>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">
                  /{plan.interval === "month" ? t("settings:billing.perMonth", "month") : t("settings:billing.perYear", "year")}
                </span>
                {plan.interval === "year" && (
                  <span className="text-sm text-muted-foreground ml-2 line-through">
                    $1,188
                  </span>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {currentStatus === "active" && !isCurrentPlan(plan.id) ? (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleSubscribe(plan)}
                >
                  {t("settings:billing.switchPlan", "Switch to this plan")}
                </Button>
              ) : isCurrentPlan(plan.id) && currentStatus === "active" ? (
                <Button className="w-full" disabled variant="secondary">
                  {t("settings:billing.currentPlan", "Current Plan")}
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => handleSubscribe(plan)}
                >
                  {t("settings:billing.subscribe", "Subscribe")}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}