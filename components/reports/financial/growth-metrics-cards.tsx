"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "react-i18next"
import { TrendingUp, TrendingDown, DollarSign, Activity, Flame } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"

export interface GrowthMetricsData {
  netIncome: number
  donationGrowthRate: number // Top-line growth (gross revenue)
  netIncomeGrowthRate: number // Bottom-line growth (net income)
  totalDonors: number
  newDonors: number
  operatingExpenses: number // 12-month rolling average
  monthsOfCushion: number // Net income / operating expenses
  previousPeriod?: {
    netIncome: number
    totalDonors: number
    grossRevenue: number
  }
}

interface GrowthMetricsCardsProps {
  data: GrowthMetricsData | null
  isLoading?: boolean
}

export function GrowthMetricsCards({ data, isLoading }: GrowthMetricsCardsProps) {
  const { t } = useTranslation(['reports'])

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Calculate trends with safe division
  const netIncomeTrend = data.previousPeriod?.netIncome && Math.abs(data.previousPeriod.netIncome) > 0.01
    ? ((data.netIncome - data.previousPeriod.netIncome) / Math.abs(data.previousPeriod.netIncome)) * 100
    : null

  return (
    <ErrorBoundary>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Net Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.netIncome')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.netIncome)}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {netIncomeTrend !== null && (
              <>
                {netIncomeTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={netIncomeTrend >= 0 ? "text-green-500" : "text-red-500"}>
                  {netIncomeTrend >= 0 ? '+' : ''}{netIncomeTrend.toFixed(1)}%
                </span>
                <span>{t('reports:financial.periodComparison')}</span>
              </>
            )}
            {netIncomeTrend === null && t('reports:financial.donationsMinusExpenses')}
          </p>
        </CardContent>
      </Card>

      {/* Net Income Growth Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.netIncomeGrowth')}
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${!isNaN(data.netIncomeGrowthRate) && data.netIncomeGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {isNaN(data.netIncomeGrowthRate) || !isFinite(data.netIncomeGrowthRate)
              ? 'N/A'
              : `${data.netIncomeGrowthRate >= 0 ? '+' : ''}${(data.netIncomeGrowthRate * 100).toFixed(1)}%`}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {!isNaN(data.netIncomeGrowthRate) && isFinite(data.netIncomeGrowthRate) && (
              <>
                {data.netIncomeGrowthRate >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </>
            )}
            <span>{t('reports:financial.bottomLineGrowth')}</span>
          </p>
        </CardContent>
      </Card>

      {/* Donation Growth Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.donationGrowth')}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${!isNaN(data.donationGrowthRate) && data.donationGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {isNaN(data.donationGrowthRate) || !isFinite(data.donationGrowthRate)
              ? 'N/A'
              : `${data.donationGrowthRate >= 0 ? '+' : ''}${(data.donationGrowthRate * 100).toFixed(1)}%`}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {!isNaN(data.donationGrowthRate) && isFinite(data.donationGrowthRate) && (
              <>
                {data.donationGrowthRate >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </>
            )}
            <span>{t('reports:financial.topLineGrowth')}</span>
          </p>
        </CardContent>
      </Card>

      {/* Operating Expenses Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.operatingExpenses')}
          </CardTitle>
          <Flame className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.operatingExpenses)}/mo
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.operatingExpenses === 0 ? (
              t('reports:financial.noCompleteMonths')
            ) : data.monthsOfCushion > 0 ? (
              <>
                {data.monthsOfCushion.toFixed(1)} {t('reports:financial.monthsCushion')}
              </>
            ) : (
              t('reports:financial.negativeCushion')
            )}
          </p>
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  )
}
