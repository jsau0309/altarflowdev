"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ArrowUpRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

export interface PayoutSummaryData {
  id: string
  payoutDate: string
  arrivalDate: string
  amount: number
  status: string
  reconciledAt: string | null
  transactionCount: number
  grossVolume: number
  totalFees: number
  netAmount: number
}

interface PayoutSummarySectionProps {
  data: PayoutSummaryData[]
  isLoading?: boolean
}

export function PayoutSummarySection({ data, isLoading }: PayoutSummarySectionProps) {
  const { t } = useTranslation(['reports', 'banking'])
  const router = useRouter()
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100) // Convert cents to dollars
  }
  
  const getStatusBadge = (status: string, reconciledAt: string | null) => {
    if (reconciledAt) {
      return <Badge className="bg-green-500">{t('banking:reconciliation.status.reconciled')}</Badge>
    }
    
    switch (status) {
      case 'paid':
        return <Badge variant="secondary">{t('banking:reconciliation.status.pendingReconciliation')}</Badge>
      case 'in_transit':
        return <Badge variant="outline">{t('banking:reconciliation.status.inTransit')}</Badge>
      case 'pending':
        return <Badge variant="outline">{t('banking:reconciliation.status.pending')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('banking:reconciliation.status.failed')}</Badge>
      case 'canceled':
        return <Badge variant="destructive">{t('banking:reconciliation.status.canceled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const handleViewReconciliation = () => {
    router.push('/banking?tab=reconciliation')
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  // Get only the 5 most recent payouts
  const recentPayouts = data.slice(0, 5)
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle>{t('reports:financial.recentPayouts')}</CardTitle>
          <CardDescription>{t('reports:financial.recentPayoutsSubtitle')}</CardDescription>
        </div>
        <Button 
          onClick={handleViewReconciliation}
          size="sm"
          variant="outline"
        >
          {t('reports:financial.viewInReconciliation')}
          <ArrowUpRight className="h-4 w-4 ml-2" />
        </Button>
      </CardHeader>
      <CardContent>
        {recentPayouts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {t('reports:financial.noDataAvailable')}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('banking:reconciliation.table.payoutDate')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.amount')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.transactions')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.fees')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.netAmount')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {format(new Date(payout.payoutDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>{payout.transactionCount || '-'}</TableCell>
                    <TableCell>
                      {payout.totalFees ? formatCurrency(payout.totalFees) : '-'}
                    </TableCell>
                    <TableCell>
                      {payout.netAmount ? formatCurrency(payout.netAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payout.status, payout.reconciledAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}