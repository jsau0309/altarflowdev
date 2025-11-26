"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

export function SubscriptionGuard({ children, feature: _feature, fallback }: SubscriptionGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState<{ status?: string; plan?: string; daysLeftInTrial?: number } | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (!response.ok) {
        setHasAccess(false);
        return;
      }

      const data = await response.json();
      setSubscription(data);
      
      // Check if subscription is active
      const isActive = ['trial', 'active', 'past_due'].includes(data.status);
      setHasAccess(isActive);
    } catch (error) {
      console.error('Error checking subscription:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderOne />
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle>Subscription Required</CardTitle>
            </div>
            <CardDescription>
              {subscription?.status === 'trial' && subscription?.daysLeftInTrial === 0
                ? "Your trial has ended. Please upgrade to continue using AltarFlow."
                : "You need an active subscription to access this feature."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upgrade your account to unlock all features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Unlimited member management</li>
              <li>Advanced donation tracking</li>
              <li>Financial reporting</li>
              <li>Email receipts</li>
              <li>And much more!</li>
            </ul>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => router.push("/billing")} className="gap-2">
                <CreditCard className="h-4 w-4" />
                View Billing Options
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}