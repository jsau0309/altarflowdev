"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useOrganization } from "@clerk/nextjs"
import { GrowthMetricsCards, type GrowthMetricsData } from "./growth-metrics-cards"
import { RevenueVsExpensesChart, type RevenueExpenseDataPoint } from "./revenue-vs-expenses-chart"
import { PayoutSummarySection, type PayoutSummaryData } from "./payout-summary-section"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"

interface DateRange {
  from: Date | null
  to: Date | null
}

interface FinancialAnalysisContentProps {
  dateRange: DateRange
  onLoadingChange?: (loading: boolean) => void
}

export function FinancialAnalysisContent({ dateRange, onLoadingChange }: FinancialAnalysisContentProps) {
  const { t } = useTranslation(['reports'])
  const { organization } = useOrganization()

  const [isLoading, setIsLoading] = useState(false)
  const [growthData, setGrowthData] = useState<GrowthMetricsData | null>(null)
  const [chartData, setChartData] = useState<RevenueExpenseDataPoint[]>([])
  const [payoutData, setPayoutData] = useState<PayoutSummaryData[]>([])

  // Track last fetch parameters to avoid duplicate fetches
  const [lastFetchParams, setLastFetchParams] = useState<string>('')

  useEffect(() => {
    if (organization && dateRange.from && dateRange.to) {
      // Create a unique key for the current fetch parameters
      const fetchKey = `${organization.id}-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`

      // Only fetch if parameters have changed
      if (fetchKey !== lastFetchParams) {
        console.log('📊 Financial Analysis: Date range changed, fetching new data...')
        console.log('  From:', dateRange.from.toLocaleDateString())
        console.log('  To:', dateRange.to.toLocaleDateString())
        fetchFinancialData()
        setLastFetchParams(fetchKey)
      }
    }
  }, [organization, dateRange])

  const fetchFinancialData = async () => {
    // Always show loading when fetching new data for better UX
    setIsLoading(true)
    onLoadingChange?.(true)

    try {
      if (!organization?.id || !dateRange.from || !dateRange.to) {
        return
      }

      // Calculate previous period for comparison
      const currentPeriodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousPeriodEnd = new Date(dateRange.from.getTime() - 1) // Day before current period starts
      const previousPeriodStart = new Date(previousPeriodEnd.getTime() - (currentPeriodDays * 24 * 60 * 60 * 1000))

      // Fetch financial data from our API
      const response = await fetch('/api/reports/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchId: organization.id,
          dateRange: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          },
          previousPeriod: {
            from: previousPeriodStart.toISOString(),
            to: previousPeriodEnd.toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch financial data')
      }

      const data = await response.json()

      // Transform data for growth metrics cards
      setGrowthData({
        netIncome: data.summary?.netIncome || 0,
        donationGrowthRate: data.summary?.donationGrowthRate || 0,
        netIncomeGrowthRate: data.summary?.netIncomeGrowthRate || 0,
        totalDonors: data.summary?.totalDonors || 0,
        newDonors: data.summary?.newDonors || 0,
        operatingExpenses: data.summary?.operatingExpenses || 0,
        monthsOfCushion: data.summary?.monthsOfCushion || 0,
        previousPeriod: data.summary?.previousPeriod
      })

      // Set chart data
      setChartData(data.revenueVsExpenses || [])

      // Set payout data
      setPayoutData(data.payouts || [])

      console.log('✅ Financial data updated:', {
        dateRange: `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`,
        netIncome: data.summary?.netIncome,
        growthRate: data.summary?.growthRate
      })

    } catch (error) {
      // Structured error logging with context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Financial Analysis Error]', {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        component: 'FinancialAnalysisContent'
      })
      toast.error(t('reports:financial.fetchingFinancialData'))
    } finally {
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }

  // Growth-focused layout: What matters most comes first
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* 🎯 TOP PRIORITY: Growth Metrics - The numbers that drive decisions */}
        <GrowthMetricsCards
          data={isLoading ? null : growthData}
          isLoading={isLoading}
        />

        {/* 📈 SECONDARY: Financial Health Visualization */}
        <RevenueVsExpensesChart
          data={isLoading ? [] : chartData}
          isLoading={isLoading}
        />

        {/* 💰 OPERATIONAL: Recent Payouts with Total Fees */}
        <PayoutSummarySection
          data={isLoading ? [] : payoutData}
          isLoading={isLoading}
        />
      </div>
    </ErrorBoundary>
  )
}
