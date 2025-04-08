"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useTranslation } from "react-i18next"
import { Expense } from "@/lib/types"

interface ExpenseChartsProps {
  expenses: Expense[];
  startDate?: Date
  endDate?: Date
}

export function ExpenseCharts({ expenses, startDate, endDate }: ExpenseChartsProps) {
  // const { t } = useTranslation() // Unused

  // Filter expenses based on date range
  const filteredExpenses = expenses.filter((expense: Expense) => {
    if (!startDate && !endDate) return true
    const expenseDate = new Date(expense.date)
    if (startDate && endDate) {
      return expenseDate >= startDate && expenseDate <= endDate
    } else if (startDate) {
      return expenseDate >= startDate
    } else if (endDate) {
      return expenseDate <= endDate
    }
    return true
  })

  // Prepare data for charts
  const expensesByCategory = filteredExpenses.reduce((acc: { [key: string]: number }, expense: Expense) => {
    const category = expense.category || "Uncategorized"
    acc[category] = (acc[category] || 0) + expense.amount
    return acc
  }, {})

  const expensesByMonth = filteredExpenses.reduce((acc: { [key: string]: number }, expense: Expense) => {
    const month = format(new Date(expense.date), "MMM yyyy") // Group by month
    acc[month] = (acc[month] || 0) + expense.amount
    return acc
  }, {})

  // const pieChartData = Object.entries(expensesByCategory).map(([name, value]) => ({ // Unused
  //   name: name.charAt(0).toUpperCase() + name.slice(1),
  //   value,
  // }))

  const barChartData = Object.entries(expensesByMonth).map(([name, value]) => ({
    month: name,
    amount: value,
  }))

  // const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28"] // Unused

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
          <CardTitle className="text-md">Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="amount" fill="var(--color-amount)" name="Amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">Expense Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  name="Expenses"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
