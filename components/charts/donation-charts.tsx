"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { format } from "date-fns" // Unused
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  // Bar, // Unused
  // BarChart, // Unused
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useTranslation } from "react-i18next"
import { Donation } from "@/lib/types"

interface DonationChartsProps {
  donations: Donation[];
  startDate?: Date;
  endDate?: Date;
}

export function DonationCharts({ donations, startDate, endDate }: DonationChartsProps) {
  // const { t } = useTranslation() // Unused

  // Filter donations based on date range
  const filteredDonations = donations.filter((donation: Donation) => {
    if (!startDate && !endDate) return true
    const donationDate = new Date(donation.date)
    if (startDate && endDate) {
      return donationDate >= startDate && donationDate <= endDate
    } else if (startDate) {
      return donationDate >= startDate
    } else if (endDate) {
      return donationDate <= endDate
    }
    return true
  })

  // Aggregate data for charts
  const donationByMethod = filteredDonations.reduce((acc: { [key: string]: number }, donation: Donation) => {
    const method = donation.paymentMethod || "Unknown"
    acc[method] = (acc[method] || 0) + donation.amount
    return acc
  }, {})

  const donationByDay = filteredDonations.reduce((acc: { [key: string]: number }, donation: Donation) => {
    const day = new Date(donation.date).toLocaleDateString("en-US", { weekday: 'short' }) // Group by day of week
    acc[day] = (acc[day] || 0) + donation.amount
    return acc
  }, {})

  // Format data for charts
  const pieChartData = Object.entries(donationByMethod).map(([name, value]) => ({ name, value }))
  const lineChartData = Object.entries(donationByDay).map(([name, value]) => ({ name, donations: value })) // Rename 'value' to 'donations'
  // const barChartData = Object.entries(donationByMethod).map(([name, value]) => ({ name, amount: value })) // Unused

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

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
          <CardTitle className="text-md">Donation Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="donations"
                  stroke="var(--color-donations)"
                  name="Donations"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              value: {
                label: "Amount",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="45%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((_entry: any, index: number) => (
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
      {/* Optional: Bar chart for donation methods if desired */}
      {/* <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">Donations by Method (Bar)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer config={{ amount: { label: "Amount", color: "hsl(var(--chart-3))" }}} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card> */}
    </div>
  )
}
