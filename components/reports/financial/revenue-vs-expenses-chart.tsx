"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { ErrorBoundary } from "@/components/error-boundary"

export interface RevenueExpenseDataPoint {
  date: string
  revenue: number
  expenses: number
  netIncome: number
}

interface RevenueVsExpensesChartProps {
  data: RevenueExpenseDataPoint[]
  isLoading?: boolean
}

const chartConfig = {
  donations: {
    label: "Donations",
    color: "hsl(142.1 76.2% 36.3%)", // green-600
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0 84.2% 60.2%)", // red-500
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Custom Tooltip Component following Recharts pattern
function CustomTooltip({ payload, label, active }: any) {
  if (active && payload && payload.length) {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    }

    return (
      <div
        className="custom-tooltip"
        style={{
          border: '1px solid hsl(var(--border))',
          backgroundColor: 'hsl(var(--background))',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <p className="label" style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px' }}>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '4px 0', fontSize: '13px', color: entry.color }}>
            <span style={{ fontWeight: '500' }}>{entry.name}:</span> {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }

  return null
}

export function RevenueVsExpensesChart({ data, isLoading }: RevenueVsExpensesChartProps) {
  const { t } = useTranslation(['reports'])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('reports:financial.donationsVsExpenses')}</CardTitle>
          <CardDescription>{t('reports:financial.revenueVsExpensesSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for line chart
  // IMPORTANT: Add 'T12:00:00' to avoid timezone shifts when parsing date strings
  const chartData = data.map(d => ({
    date: new Date(d.date + 'T12:00:00').toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    donations: d.revenue,
    expenses: d.expenses,
  }))

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>{t('reports:financial.donationsVsExpenses')}</CardTitle>
          <CardDescription>{t('reports:financial.revenueVsExpensesSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={CustomTooltip} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="donations"
                  stroke="var(--color-donations)"
                  strokeWidth={1.5}
                  name="Donations"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--color-expenses)"
                  strokeWidth={1.5}
                  name="Expenses"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
