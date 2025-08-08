"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "react-i18next"
import { DollarSign, TrendingUp, Users, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface FeeCoverageData {
  coverageRate: number
  totalDonations: number
  donationsWithCoverage: number
  estimatedFeesWithoutCoverage: number
  actualFees: number
  savedByDonorCoverage: number
  savingsPercentage: number
  coverageByType: Array<{
    type: string
    coverageRate: number
    totalDonations: number
    coveredDonations: number
  }>
}

interface DonorFeeCoverageAnalyticsProps {
  data: FeeCoverageData | null
  isLoading?: boolean
}

export function DonorFeeCoverageAnalytics({ data, isLoading }: DonorFeeCoverageAnalyticsProps) {
  const { t } = useTranslation(['reports'])
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(0)}%`
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (!data || data.totalDonations === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('reports:financial.donorFeeCoverage')}</CardTitle>
          <CardDescription>{t('reports:financial.donorFeeCoverageSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('reports:financial.noDataAvailable')}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Calculate potential savings if 10% more donors covered fees
  // This is based on the average fee per transaction
  const currentCoverageRate = data.coverageRate
  const targetCoverageRate = Math.min(currentCoverageRate + 0.10, 1.0) // Add 10%, max 100%
  const additionalDonationsWithCoverage = Math.round(
    data.totalDonations * (targetCoverageRate - currentCoverageRate)
  )
  
  // Calculate average fee per transaction that doesn't have coverage
  const donationsWithoutCoverage = data.totalDonations - data.donationsWithCoverage
  const averageFeePerTransaction = donationsWithoutCoverage > 0
    ? (data.estimatedFeesWithoutCoverage - data.savedByDonorCoverage) / donationsWithoutCoverage
    : data.estimatedFeesWithoutCoverage / data.totalDonations
  
  const potentialAdditionalSavings = additionalDonationsWithCoverage * averageFeePerTransaction
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('reports:financial.donorFeeCoverage')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t('reports:financial.donorFeeCoverageTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>{t('reports:financial.donorFeeCoverageSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coverage Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('reports:financial.coverageRate')}</span>
            <span className="text-2xl font-bold">{formatPercent(data.coverageRate)}</span>
          </div>
          <Progress value={data.coverageRate * 100} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {t('reports:financial.coverageRateDetail', {
              covered: data.donationsWithCoverage,
              total: data.totalDonations
            })}
          </p>
        </div>
        
        {/* Financial Impact */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('reports:financial.financialImpact')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('reports:financial.feesWithoutCoverage')}
              </span>
              <span className="font-medium text-destructive">
                {formatCurrency(data.estimatedFeesWithoutCoverage)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('reports:financial.actualFeesPaid')}
              </span>
              <span className="font-medium">
                {formatCurrency(data.actualFees)}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t('reports:financial.savedByDonors')}
                </span>
                <span className="font-bold text-green-600 text-lg">
                  {formatCurrency(data.savedByDonorCoverage)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('reports:financial.savingsPercentage', {
                  percentage: formatPercent(data.savingsPercentage)
                })}
              </p>
            </div>
          </div>
        </div>
        
        {/* Coverage by Type */}
        {data.coverageByType.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('reports:financial.coverageByType')}
            </h4>
            
            {data.coverageByType.map((type) => (
              <div key={type.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{type.type === 'ACH' ? t('reports:financial.bankTransfer') : t('reports:financial.creditCard')}</span>
                  <span className="font-medium">{formatPercent(type.coverageRate)}</span>
                </div>
                <Progress value={type.coverageRate * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {type.coveredDonations} {t('reports:financial.of')} {type.totalDonations} {t('reports:financial.donations')}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {/* Insight */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('reports:financial.insight')}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t('reports:financial.coverageInsight', {
                  amount: formatCurrency(potentialAdditionalSavings)
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}