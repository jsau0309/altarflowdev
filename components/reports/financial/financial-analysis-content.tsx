"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useOrganization } from "@clerk/nextjs"
import { FinancialSummaryCards, type FinancialSummaryData } from "./financial-summary-cards"
import { DonorFeeCoverageAnalytics, type FeeCoverageData } from "./donor-fee-coverage-analytics"
import { FeeBreakdownChart, type FeeBreakdownData } from "./fee-breakdown-chart"
import { PayoutSummarySection, type PayoutSummaryData } from "./payout-summary-section"
import LoaderOne from "@/components/ui/loader-one"
import { toast } from "sonner"

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
  const [summaryData, setSummaryData] = useState<FinancialSummaryData | null>(null)
  const [feeCoverageData, setFeeCoverageData] = useState<FeeCoverageData | null>(null)
  const [feeBreakdownData, setFeeBreakdownData] = useState<FeeBreakdownData[]>([])
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
      
      // Set all the data with defaults if empty
      setSummaryData(data.summary || {
        grossRevenue: 0,
        totalFees: 0,
        netRevenue: 0,
        effectiveFeeRate: 0
      })
      setFeeCoverageData(data.feeCoverageAnalytics || null)
      setFeeBreakdownData(data.feeBreakdown || [])
      setPayoutData(data.payouts || [])
      
      console.log('✅ Financial data updated:', {
        dateRange: `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`,
        grossRevenue: data.summary?.grossRevenue,
        coverageRate: data.feeCoverageAnalytics?.coverageRate
      })
      
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast.error(t('reports:financial.fetchingFinancialData'))
    } finally {
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }
  
  // Hybrid approach: Show skeleton loading but keep components in place
  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <FinancialSummaryCards 
        data={isLoading ? null : summaryData} 
        isLoading={isLoading} 
      />
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonorFeeCoverageAnalytics 
          data={isLoading ? null : feeCoverageData} 
          isLoading={isLoading} 
        />
        <FeeBreakdownChart 
          data={isLoading ? [] : feeBreakdownData} 
          isLoading={isLoading} 
        />
      </div>
      
      {/* Payout Summary */}
      <PayoutSummarySection 
        data={isLoading ? [] : payoutData} 
        isLoading={isLoading} 
      />
    </div>
  )
}