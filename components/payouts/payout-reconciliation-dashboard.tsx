"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, CheckCircle, AlertCircle, Clock, RefreshCw, Download } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import LoaderOne from '@/components/ui/loader-one'
import { useTranslation } from 'react-i18next'

interface PayoutStatistics {
  total: number
  reconciled: number
  pending: number
  failed: number
}

interface PayoutRecord {
  id: string
  stripePayoutId: string
  payoutDate: string
  arrivalDate: string
  amount: number
  status: string
  reconciledAt: string | null
  transactionCount: number | null
  grossVolume: number | null
  totalFees: number | null
  netAmount: number | null
}

export function PayoutReconciliationDashboard() {
  const { t } = useTranslation(['banking', 'common'])
  const [isLoading, setIsLoading] = useState(true)
  const [statistics, setStatistics] = useState<PayoutStatistics | null>(null)
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [isReconciling, setIsReconciling] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const fetchReconciliationData = async () => {
    try {
      const response = await fetch('/api/reconcile')
      if (!response.ok) throw new Error('Failed to fetch reconciliation data')
      
      const data = await response.json()
      setStatistics(data.statistics)
      setPayouts(data.recentPayouts)
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
      toast.error('Failed to load reconciliation data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReconciliationData()
  }, [])

  const handleReconcilePayout = async (payoutId: string) => {
    const toastId = toast.loading(t('banking:reconciliation.toast.reconciling', 'Reconciling payout...'))
    setIsReconciling(true)
    
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Reconciliation failed')
      }
      
      const result = await response.json()
      toast.success(
        t('banking:reconciliation.toast.reconcileSuccess', 'Payout reconciled successfully'),
        { id: toastId }
      )
      
      // Refresh the data
      await fetchReconciliationData()
    } catch (error) {
      console.error('Error reconciling payout:', error)
      toast.error(
        t('banking:reconciliation.toast.reconcileError', 'Failed to reconcile payout'),
        { 
          id: toastId,
          description: error instanceof Error ? error.message : undefined
        }
      )
    } finally {
      setIsReconciling(false)
    }
  }

  const handleReconcileAll = async () => {
    const toastId = toast.loading(t('banking:reconciliation.toast.reconcilingAll', 'Reconciling all pending payouts...'))
    setIsReconciling(true)
    
    try {
      // First get the churchId from the current session
      const getResponse = await fetch('/api/reconcile')
      if (!getResponse.ok) {
        throw new Error('Failed to get church information')
      }
      const churchData = await getResponse.json()
      
      // Now reconcile for this church
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchId: churchData.churchId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Reconciliation failed')
      }
      
      await response.json() // Consume response body
      toast.success(
        t('banking:reconciliation.toast.reconcileAllSuccess', 'All pending payouts reconciled'),
        { id: toastId }
      )
      
      // Refresh the data
      await fetchReconciliationData()
    } catch (error) {
      console.error('Error reconciling all payouts:', error)
      toast.error(
        t('banking:reconciliation.toast.reconcileAllError', 'Failed to reconcile payouts'),
        { 
          id: toastId,
          description: error instanceof Error ? error.message : undefined
        }
      )
    } finally {
      setIsReconciling(false)
    }
  }

  const handleImportHistorical = async () => {
    const toastId = toast.loading(t('banking:reconciliation.toast.checkingStripe', 'Checking Stripe for payouts...'))
    setIsImporting(true)
    
    try {
      // First check what's available
      const checkResponse = await fetch('/api/reconcile/import-historical')
      const checkData = await checkResponse.json()
      
      if (!checkData.hasStripeAccount) {
        toast.error(
          t('banking:reconciliation.toast.noStripeAccount', 'Please complete Stripe onboarding first'),
          { id: toastId }
        )
        return
      }
      
      if (checkData.availableInStripe === 0) {
        toast.info(
          t('banking:reconciliation.toast.noPayoutsFound', 'No payouts found in your Stripe account'),
          { id: toastId }
        )
        return
      }
      
      // Update loading message
      toast.loading(
        t('banking:reconciliation.toast.importing', 'Importing payouts from Stripe...'),
        { id: toastId }
      )
      
      // Import the payouts
      const response = await fetch('/api/reconcile/import-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }) // Import up to 100 payouts
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }
      
      const result = await response.json()
      
      if (result.imported > 0) {
        toast.success(
          t('banking:reconciliation.toast.importSuccess', 'Imported {{count}} payouts from Stripe', { count: result.imported }),
          { id: toastId }
        )
      } else if (result.skipped > 0) {
        toast.info(
          t('banking:reconciliation.toast.alreadyImported', '{{count}} payouts already in database', { count: result.skipped }),
          { id: toastId }
        )
      } else {
        toast.info(
          t('banking:reconciliation.toast.noNewPayouts', 'No new payouts to import'),
          { id: toastId }
        )
      }
      
      // Refresh the data
      await fetchReconciliationData()
    } catch (error) {
      console.error('Error importing historical payouts:', error)
      toast.error(
        t('banking:reconciliation.toast.importError', 'Failed to import payouts'),
        { 
          id: toastId,
          description: error instanceof Error ? error.message : undefined
        }
      )
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusBadge = (status: string, reconciledAt: string | null) => {
    if (reconciledAt) {
      return <Badge className="bg-green-500">{t('banking:reconciliation.status.reconciled', 'Reconciled')}</Badge>
    }
    
    switch (status) {
      case 'paid':
        return <Badge variant="secondary">{t('banking:reconciliation.status.pendingReconciliation', 'Pending Reconciliation')}</Badge>
      case 'in_transit':
        return <Badge variant="outline">{t('banking:reconciliation.status.inTransit', 'In Transit')}</Badge>
      case 'pending':
        return <Badge variant="outline">{t('banking:reconciliation.status.pending', 'Pending')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('banking:reconciliation.status.failed', 'Failed')}</Badge>
      case 'canceled':
        return <Badge variant="destructive">{t('banking:reconciliation.status.canceled', 'Canceled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoaderOne />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('banking:reconciliation.stats.totalPayouts', 'Total Payouts')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('banking:reconciliation.stats.reconciled', 'Reconciled')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.reconciled || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('banking:reconciliation.stats.pending', 'Pending')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.pending || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('banking:reconciliation.stats.failed', 'Failed')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('banking:reconciliation.recentPayouts.title', 'Recent Payouts')}</CardTitle>
            <CardDescription>{t('banking:reconciliation.recentPayouts.description', 'View and reconcile your Stripe payouts')}</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Import/Sync Button - always available for syncing */}
            <Button
              onClick={handleImportHistorical}
              disabled={isImporting}
              size="sm"
              variant="outline"
            >
                {isImporting ? (
                  <>
                    <div className="h-4 w-4 mr-2">
                      <LoaderOne />
                    </div>
                    {t('banking:reconciliation.importing', 'Importing...')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t('banking:reconciliation.importFromStripe', 'Import from Stripe')}
                  </>
                )}
              </Button>
            <Button 
              onClick={handleReconcileAll} 
              disabled={isReconciling || statistics?.pending === 0}
              size="sm"
            >
              {isReconciling ? (
                <>
                  <div className="h-4 w-4 mr-2">
                    <LoaderOne />
                  </div>
                  {t('banking:reconciliation.reconciling', 'Reconciling...')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('banking:reconciliation.reconcileAllPending', 'Reconcile All Pending')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('banking:reconciliation.table.payoutDate', 'Payout Date')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.arrivalDate', 'Arrival Date')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.amount', 'Amount')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.transactions', 'Transactions')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.grossVolume', 'Gross Volume')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.fees', 'Fees')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.netAmount', 'Net Amount')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.status', 'Status')}</TableHead>
                  <TableHead>{t('banking:reconciliation.table.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {t('banking:reconciliation.noPayoutsFound', 'No payouts found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(new Date(payout.payoutDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payout.arrivalDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>${(payout.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        {payout.transactionCount || '-'}
                      </TableCell>
                      <TableCell>
                        {payout.grossVolume ? `$${(payout.grossVolume / 100).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {payout.totalFees ? `$${(payout.totalFees / 100).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {payout.netAmount ? `$${(payout.netAmount / 100).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.status, payout.reconciledAt)}
                      </TableCell>
                      <TableCell>
                        {payout.status === 'paid' && !payout.reconciledAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReconcilePayout(payout.stripePayoutId)}
                            disabled={isReconciling}
                          >
                            {t('banking:reconciliation.reconcile', 'Reconcile')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}