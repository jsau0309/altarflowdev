"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useTranslation } from "react-i18next"
import { processDataForChart } from "@/lib/chart-utils"

interface Donation {
    date: string | Date;
    amount: number;
    // Add other relevant fields if needed
}

interface Expense {
    date: string | Date;
    amount: number;
    // Add other relevant fields if needed
}

interface Campaign {
    id: string;
    name: string;
    isActive: boolean;
    raised: number;
    goal: number;
    // Add other relevant fields if needed
}

interface CampaignChartsProps {
  donations: Donation[]
  expenses: Expense[]
  startDate?: Date
  endDate?: Date
}

export function CampaignCharts({ donations, expenses /*, startDate, endDate */ }: CampaignChartsProps) {
  // Load charts namespace
  const { t } = useTranslation('charts')

  // Filter data based on date range if provided
  // const filteredDonations = startDate && endDate
  //   ? donations.filter(d => new Date(d.date) >= startDate && new Date(d.date) <= endDate)
  //   : donations;
  // const filteredExpenses = startDate && endDate
  //   ? expenses.filter(e => new Date(e.date) >= startDate && new Date(e.date) <= endDate)
  //   : expenses;

  const donationData = processDataForChart(donations, "date", "amount")
  // Process expenses if needed for charts
  // const expenseData = processDataForChart(expenses, "date", "amount")

  // Get campaigns data - Removed mock data fetching
  // const campaigns: Campaign[] = mockDataService.getCampaigns() || []

  // Filter active campaigns - Requires campaigns data
  // const activeCampaigns = campaigns.filter((campaign) => campaign.isActive)

  // Prepare data for doughnut chart (campaign distribution) - Requires activeCampaigns
  // const doughnutChartData = activeCampaigns.map((campaign) => ({
  //   name: campaign.name,
  //   value: campaign.raised,
  // }))
  const doughnutChartData: {name: string, value: number}[] = [] // Placeholder

  // Prepare data for horizontal bar chart (campaign progress) - Requires activeCampaigns
  // const horizontalBarChartData = activeCampaigns.map((campaign) => ({
  //   name: campaign.name,
  //   raised: campaign.raised,
  //   goal: campaign.goal > 0 ? campaign.goal : campaign.raised,
  // }))
  const horizontalBarChartData: {name: string, raised: number, goal: number}[] = [] // Placeholder

  const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">{t('charts:campaignCharts.distributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              value: {
                label: t('charts:campaignCharts.amountLabel'),
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <Pie
                  data={doughnutChartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {doughnutChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">{t('charts:campaignCharts.progressTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              raised: {
                label: t('charts:campaignCharts.raisedLabel'),
                color: "hsl(var(--chart-1))",
              },
              goal: {
                label: t('charts:campaignCharts.goalLabel'),
                color: "hsl(var(--chart-4))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={horizontalBarChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="raised" fill="var(--color-raised)" name={t('charts:campaignCharts.raisedLabel')} radius={[0, 4, 4, 0]} />
                <Bar dataKey="goal" fill="var(--color-goal)" name={t('charts:campaignCharts.goalLabel')} radius={[0, 4, 4, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
