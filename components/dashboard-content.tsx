"use client"

import { useState, useEffect } from "react"
import { ArrowRight, ChevronUp, DollarSign, FileText, User, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NewDonationModal } from "@/components/modals/new-donation-modal"
import { NewExpenseModal } from "@/components/modals/new-expense-modal"
import { AddMemberModal } from "@/components/members/add-member-modal"
import { GenerateReportModal } from "@/components/modals/generate-report-modal"
// Remove the Dashboard Charts section and imports
// 1. Remove the import for DashboardCharts:
// Remove this line:
// import { DashboardCharts } from "./charts/dashboard-charts"

// Define a basic structure for the dashboard data
// TODO: Update this with the actual data structure from the API
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
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual API call to fetch dashboard data
    const timer = setTimeout(() => {
      // const data = await fetchDashboardData(); // Example API call
      // setDashboardData(data);
      setIsLoading(false)
    }, 500) // Keep loading simulation for now

    return () => clearTimeout(timer)
  }, [])

  const openModal = (modalName: string) => {
    setActiveModal(modalName)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  const handleMemberAdded = () => {
    // TODO: Refresh dashboard data after adding a member via API call
    // const data = await fetchDashboardData();
    // setDashboardData(data);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <div>
          <div className="h-8 w-64 bg-muted animate-pulse rounded-md mb-2"></div>
          <div className="h-4 w-48 bg-muted animate-pulse rounded-md"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
          <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-80 bg-muted animate-pulse rounded-lg"></div>
          <div className="h-80 bg-muted animate-pulse rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Altarflow</h1>
        <p className="text-muted-foreground">Comprehensive church management platform</p>
      </div>

      {/* 2. Remove the entire Dashboard Charts grid section:
Remove this code block:
      {/* Dashboard Charts *\/}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <DashboardCharts />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Campaign Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* The second chart is rendered by the DashboardCharts component *\/}
          </CardContent>
        </Card>
      </div> */}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Donation Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Donation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-600">
              <ChevronUp className="h-4 w-4" />
              <span>+{dashboardData?.donationSummary?.monthlyChange}% vs last month</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">${dashboardData?.donationSummary?.weeklyTotal?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">${dashboardData?.donationSummary?.monthlyTotal?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Year</p>
                <p className="text-2xl font-bold">${dashboardData?.donationSummary?.yearlyTotal?.toLocaleString() ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-red-600">
              <ChevronUp className="h-4 w-4 rotate-180" />
              <span>{dashboardData?.expenseSummary?.monthlyChange}% vs last month</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">${dashboardData?.expenseSummary?.weeklyTotal?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">${dashboardData?.expenseSummary?.monthlyTotal?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Year</p>
                <p className="text-2xl font-bold">${dashboardData?.expenseSummary?.yearlyTotal?.toLocaleString() ?? 0}</p>
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
            <CardTitle className="text-lg">Member Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-4xl font-bold">{dashboardData?.memberActivity?.newMembers ?? 0}</p>
                <p className="text-sm text-muted-foreground">New Members</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-4xl font-bold">{dashboardData?.memberActivity?.activeMembers ?? 0}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-4 text-sm font-medium">Recent Members</h3>
              <div className="space-y-4">
                {dashboardData?.memberActivity?.recentMembers?.map((member: any) => {
                  const joinedDays = Math.round(
                    (new Date().getTime() - new Date(member.joinDate).getTime()) / (1000 * 60 * 60 * 24),
                  )
                  let joinedText = `Joined ${joinedDays} days ago`
                  if (joinedDays === 0) joinedText = "Joined today"
                  if (joinedDays === 1) joinedText = "Joined yesterday"

                  return (
                    <div key={member.id} className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {member.firstName?.charAt(0)}
                          {member.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{joinedText}</p>
                      </div>
                    </div>
                  )
                }) ?? <p className="text-sm text-muted-foreground">No recent members found.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <button
              onClick={() => openModal("donation")}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>New Donation</div>
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
                <div>New Expense</div>
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
                <div>Add Member</div>
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
                <div>Generate Report</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <NewDonationModal isOpen={activeModal === "donation"} onClose={closeModal} fromDashboard={true} />
      <NewExpenseModal isOpen={activeModal === "expense"} onClose={closeModal} />
      <AddMemberModal open={activeModal === "member"} onClose={closeModal} onSuccess={handleMemberAdded} />
      <GenerateReportModal isOpen={activeModal === "report"} onClose={closeModal} />
    </div>
  )
}
