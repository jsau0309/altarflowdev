"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { DollarSign, TrendingDown, TrendingUp, Percent, ArrowUp, ArrowDown, CheckCircle, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export interface FinancialSummaryData {
  grossRevenue: number
  totalFees: number
  netRevenue: number
  effectiveFeeRate: number
  isUsingActualFees?: boolean
  previousPeriod?: {
    grossRevenue: number
    totalFees: number
    netRevenue: number
    effectiveFeeRate: number
  }
}

interface FinancialSummaryCardsProps {
  data: FinancialSummaryData | null
  isLoading?: boolean
}

export function FinancialSummaryCards({ data, isLoading }: FinancialSummaryCardsProps) {
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
    // Rate comes as a decimal (0.0019 for 0.19%)
    // We multiply by 100 to get percentage
    const percentage = rate * 100
    
    // Format based on size
    if (percentage < 0.01) {
      return `${percentage.toFixed(4)}%` // Show 4 decimals for very small percentages
    } else if (percentage < 1) {
      return `${percentage.toFixed(2)}%` // Show 2 decimals for small percentages
    } else {
      return `${percentage.toFixed(1)}%` // Show 1 decimal for larger percentages
    }
  }
  
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return change
  }
  
  const renderChangeIndicator = (current: number, previous?: number) => {
    const change = calculateChange(current, previous)
    if (change === null) return null
    
    const isPositive = change > 0
    const isNeutral = Math.abs(change) < 0.01
    
    if (isNeutral) {
      return (
        <span className="text-xs text-muted-foreground">
          {t('reports:financial.noChange')}
        </span>
      )
    }
    
    return (
      <span className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}% {t('reports:financial.periodComparison')}
      </span>
    )
  }
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (!data) {
    return null
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.grossRevenue')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.grossRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {t('reports:financial.grossRevenueSubtitle')}
          </p>
          {renderChangeIndicator(data.grossRevenue, data.previousPeriod?.grossRevenue)}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {t('reports:financial.totalFees')}
            {data.isUsingActualFees !== undefined && (
              <Badge 
                variant={data.isUsingActualFees ? "default" : "secondary"}
                className="text-xs font-normal"
              >
                {data.isUsingActualFees ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('reports:financial.actual')}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t('reports:financial.estimated')}
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalFees)}</div>
          <p className="text-xs text-muted-foreground">
            {data.isUsingActualFees 
              ? t('reports:financial.fromReconciliation')
              : t('reports:financial.totalFeesSubtitle')
            }
          </p>
          {renderChangeIndicator(data.totalFees, data.previousPeriod?.totalFees)}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.netRevenue')}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.netRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {t('reports:financial.netRevenueSubtitle')}
          </p>
          {renderChangeIndicator(data.netRevenue, data.previousPeriod?.netRevenue)}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reports:financial.effectiveFeeRate')}
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(data.effectiveFeeRate)}</div>
          <p className="text-xs text-muted-foreground">
            {t('reports:financial.effectiveFeeRateSubtitle')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}