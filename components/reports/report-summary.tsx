"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { DollarSign, TrendingUp, Users, TrendingDown } from "lucide-react"
import { ReportSummary as ReportSummaryType } from "@/lib/actions/reports.actions"
import { Skeleton } from "@/components/ui/skeleton"

interface ReportSummaryProps {
  type: 'donations' | 'expenses'
  data: ReportSummaryType
  loading?: boolean
}

export function ReportSummary({ type, data, loading }: ReportSummaryProps) {
  const { t } = useTranslation(['reports', 'common'])
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {type === 'donations' ? t('reports:totalDonations') : t('reports:totalExpenses')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatCurrency(data.total)}</div>
              <p className="text-xs text-muted-foreground">
                {t('reports:inSelectedPeriod')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {type === 'donations' ? t('reports:averageDonation') : t('reports:averageExpense')}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatCurrency(data.average)}</div>
              <p className="text-xs text-muted-foreground">
                {t('reports:perTransaction')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {type === 'donations' 
              ? t('reports:uniqueDonors') 
              : t('reports:netIncome')
            }
          </CardTitle>
          {type === 'donations' ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {type === 'donations' 
                  ? formatNumber(data.count || 0)
                  : formatCurrency(data.netIncome || 0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {type === 'donations' 
                  ? t('reports:contributorsInPeriod')
                  : t('reports:donationsMinusExpenses')
                }
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}