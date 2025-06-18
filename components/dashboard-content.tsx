"use client"

import { useState, useEffect } from "react"
import { ArrowRight, ChevronDown, ChevronUp, DollarSign, FileText, User, Users, Wand2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ManualDonationDialog } from "@/components/modals/manual-donation-dialog";
import { getDistinctDonorsForFilter, DonorFilterItem } from "@/lib/actions/donations.actions";
import { NewExpenseModal } from "@/components/modals/new-expense-modal"
import { AddMemberModal } from "@/components/members/add-member-modal"
import { GenerateReportModal } from "@/components/modals/generate-report-modal";
import { AiSummaryModal } from "@/components/modals/ai-summary-modal";
import LoaderOne from "@/components/ui/loader-one";
import { getDashboardSummary } from "@/lib/actions/reports.actions";

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
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [donorsList, setDonorsList] = useState<DonorFilterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChurchId, setCurrentChurchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const churchIdFromStorage = localStorage.getItem("churchId");
        setCurrentChurchId(churchIdFromStorage); // Set churchId in state
        const [summaryData, donorsData] = await Promise.all([
          getDashboardSummary(),
          churchIdFromStorage ? getDistinctDonorsForFilter() : Promise.resolve([] as DonorFilterItem[])
        ]);
        setDashboardData(summaryData);
        setDonorsList(donorsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data or donors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleDataRefresh = async (actionContext?: string) => {
    const contextMessage = actionContext ? ` after ${actionContext}` : "";
    console.log(`Refreshing dashboard data${contextMessage}...`);
    // setIsLoading(true); // Consider uncommenting if refresh is slow
    try {
      const data = await getDashboardSummary();
      setDashboardData(data);
    } catch (error) {
      console.error(`Failed to refresh dashboard data${contextMessage}:`, error);
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
      ) : (
        <>
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
                  onClick={() => openModal("donation")}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>{t('dashboard:quickActions.newDonation', 'New Donation')}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => openModal("expense")}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>{t('dashboard:quickActions.newExpense', 'New Expense')}</div>
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
                  onClick={() => openModal("report")}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>{t('dashboard:quickActions.generateReport', 'Generate Report')}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => openModal("aiSummary")}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Wand2 className="h-5 w-5" />
                    </div>
                    <div>{t('dashboard:quickActions.aiSummary', 'Generate AI Summary')}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Modals */}
      <ManualDonationDialog isOpen={activeModal === "donation"} onClose={closeModal} onSuccess={() => handleDataRefresh("new manual donation")} donors={donorsList} />
      <NewExpenseModal isOpen={activeModal === "expense"} onClose={closeModal} onSuccess={() => handleDataRefresh("new expense")} />
      <AddMemberModal 
        open={activeModal === "member"} 
        onClose={closeModal} 
        onSuccess={() => handleDataRefresh("adding member")} 
      />
      <GenerateReportModal isOpen={activeModal === "report"} onClose={closeModal} />
      <AiSummaryModal isOpen={activeModal === "aiSummary"} onClose={closeModal} churchId={currentChurchId || undefined} />
    </div>
  );
}
