"use client"

import { useState, useEffect } from "react"
import { ArrowRight, ChevronDown, ChevronUp, DollarSign, FileText, User, Users, Wand2, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ManualDonationDialog } from "@/components/modals/manual-donation-dialog";
import { NewExpenseModal } from "@/components/modals/new-expense-modal"
import { AddMemberModal } from "@/components/members/add-member-modal"
import { GenerateReportModal } from "@/components/modals/generate-report-modal";
import { AiSummaryModal } from "@/components/modals/ai-summary-modal";
import LoaderOne from "@/components/ui/loader-one";
import { getDashboardSummaryOptimized } from "@/lib/actions/dashboard-optimized.actions";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLoading } from "@/contexts/loading-context";
import { safeStorage } from "@/lib/safe-storage";

// Define a basic structure for the dashboard data
interface DashboardData {
  donationSummary: {
    monthlyChange: number;
    weeklyTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
  expenseSummary: {
    monthlyChange: number;
    weeklyTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
  memberActivity: {
    newMembers: number;
    activeMembers: number;
    recentMembers: {
      id: string;
      firstName: string;
      lastName: string;
      joinDate: string;
    }[];
  };
}

export function DashboardContent() {
  const { t } = useTranslation(['dashboard', 'donations']);
  const { organization } = useOrganization();
  const router = useRouter();
  const { setDataLoading, isAuthTransition } = useLoading();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: string;
    daysLeftInTrial: number | null;
    trialDaysRemaining: number | null;
    daysUntilEnd: number | null;
    graceDaysRemaining: number | null;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Notify loading context that data is loading
      if (isAuthTransition) {
        setDataLoading(true);
      }
      setError(null);
      try {
        let churchIdFromStorage = null;
        churchIdFromStorage = safeStorage.getItem("churchId");
        if (!churchIdFromStorage) {
          console.warn('ChurchId not available in localStorage', { operation: 'ui.warn' });
        }
        const [summaryData, subscriptionData] = await Promise.all([
          getDashboardSummaryOptimized(),
          fetch('/api/subscription').then(res => res.json()).catch(() => null)
        ]);
        
        if (!summaryData) {
          setError("Failed to load dashboard data. Please try refreshing the page.");
        } else {
          setDashboardData(summaryData);
        }
        
        
        if (subscriptionData) {
          setSubscriptionInfo({
            status: subscriptionData.subscriptionStatus,
            daysLeftInTrial: subscriptionData.daysLeftInTrial,
            trialDaysRemaining: subscriptionData.trialDaysRemaining,
            daysUntilEnd: subscriptionData.daysUntilEnd,
            graceDaysRemaining: subscriptionData.graceDaysRemaining
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data or donors:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        setError("An error occurred while loading the dashboard.");
      } finally {
        setIsLoading(false);
        // Notify loading context that data has finished loading
        if (isAuthTransition) {
          setDataLoading(false);
        }
      }
    };

    fetchData();
  }, [isAuthTransition, setDataLoading]);

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleDataRefresh = async (actionContext?: string) => {
    const contextMessage = actionContext ? ` after ${actionContext}` : "";
    // Debug logging removed: refreshing dashboard data
    // setIsLoading(true); // Consider uncommenting if refresh is slow
    try {
      const data = await getDashboardSummaryOptimized();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to refresh dashboard data${contextMessage}:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    } finally {
      // setIsLoading(false); // Ensure this matches any setIsLoading(true) above
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount ?? 0);
  };

  // Don't render anything during auth transition - let the BoxLoader handle the entire screen
  if (isAuthTransition && isLoading) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('dashboard:welcomeTitle', 'Welcome to Altarflow')}</h1>
        <p className="text-muted-foreground">{t('dashboard:welcomeSubtitle', 'Comprehensive church management platform')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[500px]">
          <LoaderOne />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <div className="text-destructive mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('common:retry', 'Retry')}
          </button>
        </div>
      ) : (
        <>
          {/* Subscription Banner */}
          {subscriptionInfo && (
            <>
              {/* Trial Banner - Prominent Design */}
              {subscriptionInfo.status === 'trial' && subscriptionInfo.trialDaysRemaining !== null && subscriptionInfo.trialDaysRemaining !== undefined && (
                <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-lg px-5 py-4 mb-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full">
                      <Wand2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-green-900 dark:text-green-100">
                        {t('dashboard:trialActive', '🎉 Free Trial Active')}
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                        {subscriptionInfo.trialDaysRemaining === 1
                          ? t('dashboard:trialLastDay', 'Last day of your free trial! Upgrade now to get 3 months at 50% off.')
                          : t('dashboard:trialDaysRemaining', 'You have {{days}} days remaining in your free trial. Upgrade now to get 3 months at 50% off!', {
                              days: Number.isNaN(subscriptionInfo.trialDaysRemaining) ? 0 : (subscriptionInfo.trialDaysRemaining ?? 0)
                            })
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/settings?tab=account')}
                    size="default"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 ml-4 flex-shrink-0 font-semibold"
                  >
                    {t('dashboard:upgradeNow', 'Upgrade Now')}
                  </Button>
                </div>
              )}

              {/* Free Plan Banner - Compact Design */}
              {subscriptionInfo.status === 'free' && (
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                      <span className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                        {t('dashboard:freeActive', 'You\'re on AltarFlow Free')}
                      </span>
                      <span className="hidden sm:inline text-blue-400 dark:text-blue-500 text-xs">•</span>
                      <span className="text-xs sm:text-sm text-blue-700/80 dark:text-blue-300/80 mt-0.5 sm:mt-0">
                        {t('dashboard:freeDescription', 'Upgrade to unlock donations, expenses, and financial reports.')}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/settings?tab=account')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 h-8 ml-3 flex-shrink-0"
                  >
                    {t('dashboard:upgradeNow', 'Upgrade Now')}
                  </Button>
                </div>
              )}

              {/* Grace Period Banner */}
              {subscriptionInfo.status === 'grace_period' && subscriptionInfo.graceDaysRemaining !== null && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 mb-6">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-200">
                          {t('dashboard:gracePeriodActive', 'Your subscription has expired')}
                        </h3>
                        <p className="text-sm text-red-800 dark:text-red-300">
                          {subscriptionInfo.graceDaysRemaining === 1
                            ? t('dashboard:graceDayRemaining', '1 day grace period remaining. Renew now to keep your premium features.')
                            : t('dashboard:graceDaysRemaining', '{{days}} days grace period remaining. Renew now to keep your premium features.', { days: subscriptionInfo.graceDaysRemaining })
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => router.push('/settings?tab=account')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('dashboard:renewNow', 'Renew Now')}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Canceled Subscription Banner */}
              {subscriptionInfo.status === 'canceled' && subscriptionInfo.daysUntilEnd !== null && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 mb-6">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                      <div>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                          {t('dashboard:canceledActive', 'Subscription canceled')}
                        </h3>
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          {subscriptionInfo.daysUntilEnd === 1
                            ? t('dashboard:canceledDayRemaining', 'Premium features expire in 1 day.')
                            : t('dashboard:canceledDaysRemaining', 'Premium features expire in {{days}} days.', { days: subscriptionInfo.daysUntilEnd })
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => router.push('/settings?tab=account')}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {t('dashboard:reactivate', 'Reactivate')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Donation Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('dashboard:donationSummary.title', 'Donation Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center text-sm ${(dashboardData?.donationSummary?.monthlyChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(dashboardData?.donationSummary?.monthlyChange ?? 0) >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>
                    {t('dashboard:vsLastMonth', '{{change}}% vs last month', { 
                      change: Math.round(dashboardData?.donationSummary?.monthlyChange ?? 0)
                    })}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisWeek', 'This Week')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.donationSummary?.weeklyTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisMonth', 'This Month')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.donationSummary?.monthlyTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisYear', 'This Year')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.donationSummary?.yearlyTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('dashboard:expenseSummary.title', 'Expense Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center text-sm ${(dashboardData?.expenseSummary?.monthlyChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(dashboardData?.expenseSummary?.monthlyChange ?? 0) >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>
                    {t('dashboard:vsLastMonth', '{{change}}% vs last month', { 
                      change: Math.round(dashboardData?.expenseSummary?.monthlyChange ?? 0)
                    })}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisWeek', 'This Week')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.expenseSummary?.weeklyTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisMonth', 'This Month')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.expenseSummary?.monthlyTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:thisYear', 'This Year')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.expenseSummary?.yearlyTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Member Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('dashboard:memberActivity.title', 'Member Activity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{dashboardData?.memberActivity?.newMembers ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard:memberActivity.newMembers', 'New Members')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard:memberActivity.thisMonth', 'This month')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">{dashboardData?.memberActivity?.activeMembers ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard:memberActivity.activeMembers', 'Active Members')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard:memberActivity.total', 'Total')}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium">{t('dashboard:memberActivity.recentMembers', 'Recent Members')}</h4>
                  <div className="mt-2 space-y-2">
                    {dashboardData?.memberActivity?.recentMembers?.length ? (
                      dashboardData.memberActivity.recentMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.firstName} {member.lastName}</div>
                            <div className="text-xs text-muted-foreground">{t('dashboard:memberActivity.joined', 'Joined {{date}}', { date: new Date(member.joinDate).toLocaleDateString() })}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('dashboard:memberActivity.noRecentMembers', 'No recent members found.')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard:quickActions.title', 'Quick Actions')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <button
                  onClick={() => (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? router.push('/settings?tab=account') : openModal("donation")}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period')
                      ? 'opacity-50 cursor-pointer hover:bg-muted/50' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? 'bg-muted' : 'bg-primary/10'
                    } text-primary`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <div>{t('dashboard:quickActions.newDonation', 'New Donation')}</div>
                      {(subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') && (
                        <div className="text-xs text-muted-foreground">{t('dashboard:quickActions.upgradeRequired', 'Upgrade required')}</div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? router.push('/settings?tab=account') : openModal("expense")}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period')
                      ? 'opacity-50 cursor-pointer hover:bg-muted/50' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? 'bg-muted' : 'bg-primary/10'
                    } text-primary`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div>{t('dashboard:quickActions.newExpense', 'New Expense')}</div>
                      {(subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') && (
                        <div className="text-xs text-muted-foreground">{t('dashboard:quickActions.upgradeRequired', 'Upgrade required')}</div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => openModal("member")}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>{t('dashboard:quickActions.addMember', 'Add Member')}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? router.push('/settings?tab=account') : openModal("report")}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period')
                      ? 'opacity-50 cursor-pointer hover:bg-muted/50' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? 'bg-muted' : 'bg-primary/10'
                    } text-primary`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div>{t('dashboard:quickActions.generateReport', 'Generate Report')}</div>
                      {(subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') && (
                        <div className="text-xs text-muted-foreground">{t('dashboard:quickActions.upgradeRequired', 'Upgrade required')}</div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? router.push('/settings?tab=account') : openModal("aiSummary")}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period')
                      ? 'opacity-50 cursor-pointer hover:bg-muted/50' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      (subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') ? 'bg-muted' : 'bg-primary/10'
                    } text-primary`}>
                      <Wand2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{t('dashboard:quickActions.aiSummary', 'Generate AI Summary')}</span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          Beta
                        </span>
                      </div>
                      {(subscriptionInfo?.status === 'free' || subscriptionInfo?.status === 'grace_period') && (
                        <div className="text-xs text-muted-foreground">{t('dashboard:quickActions.upgradeRequired', 'Upgrade required')}</div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Modals */}
      <ManualDonationDialog isOpen={activeModal === "donation"} onClose={closeModal} onSuccess={() => handleDataRefresh("new manual donation")} />
      <NewExpenseModal isOpen={activeModal === "expense"} onClose={closeModal} onSuccess={() => handleDataRefresh("new expense")} />
      <AddMemberModal 
        open={activeModal === "member"} 
        onClose={closeModal} 
        onSuccess={() => handleDataRefresh("adding member")} 
      />
      <GenerateReportModal isOpen={activeModal === "report"} onClose={closeModal} />
      <AiSummaryModal isOpen={activeModal === "aiSummary"} onClose={closeModal} churchId={organization?.id} />
    </div>
  );
}
