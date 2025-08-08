'use client'

import { format } from 'date-fns'
import { TFunction } from 'i18next'

interface FinancialExportData {
  summary: {
    grossRevenue: number
    totalFees: number
    netRevenue: number
    effectiveFeeRate: number
    isUsingActualFees: boolean
    previousGrossRevenue?: number
    previousTotalFees?: number
    previousNetRevenue?: number
  }
  feeCoverageAnalytics: {
    totalDonations: number
    donationsWithCoverage: number
    coverageRate: number
    estimatedFeesWithoutCoverage?: number
    actualFees?: number
    savedByDonorCoverage?: number
    savingsPercentage?: number
  }
  payouts: Array<{
    payoutId: string
    payoutDate: Date
    arrivalDate: Date
    amount: number
    transactionCount: number
    grossVolume: number
    totalFees: number
    totalRefunds: number
    netAmount: number
    status: string
    reconciledAt: Date | null
  }>
  dateRange: {
    from: Date | null
    to: Date | null
  }
  churchName?: string
  t?: TFunction
}

export function exportFinancialToCSV({
  summary,
  feeCoverageAnalytics,
  payouts,
  dateRange,
  churchName = 'Church',
  t
}: FinancialExportData) {
  // Create CSV content
  const rows: string[] = []
  
  // Add header
  const reportTitle = t ? t('reports:financialAnalysis') : 'Financial Analysis'
  rows.push(`${churchName} - ${reportTitle}`)
  const dateRangeLabel = t ? t('reports:dateRange') : 'Date Range'
  rows.push(`${dateRangeLabel}: ${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : ''}`)
  rows.push('') // Empty line
  
  // Financial Summary Section
  const summaryText = (t ? t('common:summary') : 'SUMMARY').toUpperCase()
  rows.push(summaryText)
  
  const grossLabel = t ? t('reports:financial.grossRevenue') : 'Gross Donations'
  rows.push(`${grossLabel},$${summary.grossRevenue.toFixed(2)}`)
  if (summary.previousGrossRevenue !== undefined) {
    const change = summary.previousGrossRevenue !== 0 ? ((summary.grossRevenue - summary.previousGrossRevenue) / summary.previousGrossRevenue * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    rows.push(`Change vs Previous Period,${changeText}%`)
  }
  
  const feesLabel = t ? t('reports:financial.totalFees') : 'Processing Fees'
  const feeTypeLabel = summary.isUsingActualFees 
    ? (t ? t('reports:financial.actual') : 'Actual') 
    : (t ? t('reports:financial.estimated') : 'Estimated')
  rows.push(`${feesLabel} (${feeTypeLabel}),$${summary.totalFees.toFixed(2)}`)
  if (summary.previousTotalFees !== undefined) {
    const change = summary.previousTotalFees !== 0 ? ((summary.totalFees - summary.previousTotalFees) / summary.previousTotalFees * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    rows.push(`Fees Change vs Previous,${changeText}%`)
  }
  
  const netLabel = t ? t('reports:financial.netRevenue') : 'Net Donations'
  rows.push(`${netLabel},$${summary.netRevenue.toFixed(2)}`)
  if (summary.previousNetRevenue !== undefined) {
    const change = summary.previousNetRevenue !== 0 ? ((summary.netRevenue - summary.previousNetRevenue) / summary.previousNetRevenue * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    rows.push(`Net Change vs Previous,${changeText}%`)
  }
  
  const rateLabel = t ? t('reports:financial.effectiveFeeRate') : 'Effective Fee Rate'
  rows.push(`${rateLabel},${(summary.effectiveFeeRate * 100).toFixed(2)}%`)
  
  rows.push('') // Empty line
  rows.push('') // Empty line
  
  // Fee Coverage Analytics Section
  const coverageText = (t ? t('reports:financial.donorFeeCoverage') : 'Donor Fee Coverage Impact').toUpperCase()
  rows.push(coverageText)
  
  const coverageRateLabel = t ? t('reports:financial.coverageRate') : 'Coverage Rate'
  rows.push(`${coverageRateLabel},${(feeCoverageAnalytics.coverageRate * 100).toFixed(1)}%`)
  
  const donorsLabel = t ? t('reports:financial.donorsCoveringFees') : 'Donors Covering Fees'
  rows.push(`${donorsLabel},${feeCoverageAnalytics.donationsWithCoverage} ${t ? t('reports:financial.of') : 'of'} ${feeCoverageAnalytics.totalDonations}`)
  
  const coveredFeesLabel = t ? t('reports:financial.actualFeesPaid') : 'Actual fees paid'
  rows.push(`${coveredFeesLabel},$${(feeCoverageAnalytics.actualFees || 0).toFixed(2)}`)
  
  const uncoveredFeesLabel = t ? t('reports:financial.feesWithoutCoverage') : 'Fees if no one covered'
  rows.push(`${uncoveredFeesLabel},$${(feeCoverageAnalytics.estimatedFeesWithoutCoverage || 0).toFixed(2)}`)
  
  const impactLabel = t ? t('reports:financial.savedByDonors') : 'Saved by donor coverage'
  rows.push(`${impactLabel},$${(feeCoverageAnalytics.savedByDonorCoverage || 0).toFixed(2)}`)
  
  rows.push('') // Empty line
  rows.push('') // Empty line
  
  // Payout Summary Section
  if (payouts.length > 0) {
    const payoutText = (t ? t('reports:financial.recentPayouts') : 'Recent Payouts').toUpperCase()
    rows.push(payoutText)
    
    // Headers
    rows.push('Date,Amount,Transactions,Gross Volume,Fees,Refunds,Net Amount,Status,Reconciled')
    
    // Payout rows
    payouts.forEach(payout => {
      const date = format(new Date(payout.payoutDate), 'MM/dd/yyyy')
      const amount = `$${(payout.amount / 100).toFixed(2)}`
      const grossVolume = `$${(payout.grossVolume / 100).toFixed(2)}`
      const fees = `$${(payout.totalFees / 100).toFixed(2)}`
      const refunds = `$${(payout.totalRefunds / 100).toFixed(2)}`
      const net = `$${(payout.netAmount / 100).toFixed(2)}`
      const status = payout.status.charAt(0).toUpperCase() + payout.status.slice(1)
      const reconciled = payout.reconciledAt ? 'Yes' : 'No'
      
      rows.push(`${date},${amount},${payout.transactionCount},${grossVolume},${fees},${refunds},${net},${status},${reconciled}`)
    })
    
    // Summary totals
    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0)
    const totalTransactions = payouts.reduce((sum, p) => sum + p.transactionCount, 0)
    const totalGrossVolume = payouts.reduce((sum, p) => sum + p.grossVolume, 0)
    const totalFees = payouts.reduce((sum, p) => sum + p.totalFees, 0)
    const totalRefunds = payouts.reduce((sum, p) => sum + p.totalRefunds, 0)
    const totalNet = payouts.reduce((sum, p) => sum + p.netAmount, 0)
    
    rows.push('') // Empty line
    rows.push(`TOTALS,$${(totalAmount / 100).toFixed(2)},${totalTransactions},$${(totalGrossVolume / 100).toFixed(2)},$${(totalFees / 100).toFixed(2)},$${(totalRefunds / 100).toFixed(2)},$${(totalNet / 100).toFixed(2)},,`)
  }
  
  // Convert to CSV string
  const csvContent = rows.join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `${churchName.replace(/\s+/g, '_')}_financial_analysis_${dateStr}.csv`
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}