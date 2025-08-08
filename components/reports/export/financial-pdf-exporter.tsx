'use client'

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
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

export function exportFinancialToPDF({
  summary,
  feeCoverageAnalytics,
  payouts,
  dateRange,
  churchName = 'Church',
  t
}: FinancialExportData) {
  const doc = new jsPDF()
  let yPosition = 20
  
  // Add header
  doc.setFontSize(20)
  doc.text(churchName, 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(16)
  const reportTitle = t ? t('reports:financialAnalysis') : 'Financial Analysis'
  doc.text(reportTitle, 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(12)
  const dateRangeText = `${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : ''}`
  doc.text(dateRangeText, 20, yPosition)
  yPosition += 15
  
  // Financial Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const summaryText = (t ? t('common:summary') : 'SUMMARY').toUpperCase()
  doc.text(summaryText, 20, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 10
  
  doc.setFontSize(12)
  
  // Gross Revenue
  const grossLabel = t ? t('reports:financial.grossRevenue') : 'Gross Donations'
  doc.text(`${grossLabel}: ${formatCurrency(summary.grossRevenue)}`, 20, yPosition)
  if (summary.previousGrossRevenue !== undefined) {
    const change = summary.previousGrossRevenue !== 0 ? ((summary.grossRevenue - summary.previousGrossRevenue) / summary.previousGrossRevenue * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    doc.setFontSize(10)
    doc.text(`(${changeText}% vs previous period)`, 120, yPosition)
    doc.setFontSize(12)
  }
  yPosition += 7
  
  // Processing Fees
  const feesLabel = t ? t('reports:financial.totalFees') : 'Processing Fees'
  const feeTypeLabel = summary.isUsingActualFees 
    ? (t ? t('reports:financial.actual') : 'Actual') 
    : (t ? t('reports:financial.estimated') : 'Estimated')
  doc.text(`${feesLabel} (${feeTypeLabel}): ${formatCurrency(summary.totalFees)}`, 20, yPosition)
  if (summary.previousTotalFees !== undefined) {
    const change = summary.previousTotalFees !== 0 ? ((summary.totalFees - summary.previousTotalFees) / summary.previousTotalFees * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    doc.setFontSize(10)
    doc.text(`(${changeText}% vs previous period)`, 120, yPosition)
    doc.setFontSize(12)
  }
  yPosition += 7
  
  // Net Revenue
  const netLabel = t ? t('reports:financial.netRevenue') : 'Net Donations'
  doc.text(`${netLabel}: ${formatCurrency(summary.netRevenue)}`, 20, yPosition)
  if (summary.previousNetRevenue !== undefined) {
    const change = summary.previousNetRevenue !== 0 ? ((summary.netRevenue - summary.previousNetRevenue) / summary.previousNetRevenue * 100).toFixed(1) : '0'
    const changeText = change.startsWith('-') ? change : `+${change}`
    doc.setFontSize(10)
    doc.text(`(${changeText}% vs previous period)`, 120, yPosition)
    doc.setFontSize(12)
  }
  yPosition += 7
  
  // Effective Fee Rate
  const rateLabel = t ? t('reports:financial.effectiveFeeRate') : 'Effective Fee Rate'
  doc.text(`${rateLabel}: ${(summary.effectiveFeeRate * 100).toFixed(2)}%`, 20, yPosition)
  yPosition += 15
  
  // Fee Coverage Analytics Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const coverageText = (t ? t('reports:financial.donorFeeCoverage') : 'Donor Fee Coverage Impact').toUpperCase()
  doc.text(coverageText, 20, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 10
  
  doc.setFontSize(12)
  
  // Coverage Statistics
  const coverageRateLabel = t ? t('reports:financial.coverageRate') : 'Coverage Rate'
  doc.text(`${coverageRateLabel}: ${(feeCoverageAnalytics.coverageRate * 100).toFixed(1)}%`, 20, yPosition)
  yPosition += 7
  
  const donorsLabel = t ? t('reports:financial.donorsCoveringFees') : 'Donors Covering Fees'
  doc.text(`${donorsLabel}: ${feeCoverageAnalytics.donationsWithCoverage} ${t ? t('reports:financial.of') : 'of'} ${feeCoverageAnalytics.totalDonations}`, 20, yPosition)
  yPosition += 7
  
  const coveredFeesLabel = t ? t('reports:financial.actualFeesPaid') : 'Actual fees paid'
  doc.text(`${coveredFeesLabel}: ${formatCurrency(feeCoverageAnalytics.actualFees || 0)}`, 20, yPosition)
  yPosition += 7
  
  const uncoveredFeesLabel = t ? t('reports:financial.feesWithoutCoverage') : 'Fees if no one covered'
  doc.text(`${uncoveredFeesLabel}: ${formatCurrency(feeCoverageAnalytics.estimatedFeesWithoutCoverage || 0)}`, 20, yPosition)
  yPosition += 7
  
  const impactLabel = t ? t('reports:financial.savedByDonors') : 'Saved by donor coverage'
  doc.text(`${impactLabel}: ${formatCurrency(feeCoverageAnalytics.savedByDonorCoverage || 0)}`, 20, yPosition)
  yPosition += 15
  
  // Check if we need a new page for payouts
  if (yPosition > 200 && payouts.length > 0) {
    doc.addPage()
    yPosition = 20
  }
  
  // Payout Summary Section
  if (payouts.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const payoutText = (t ? t('reports:financial.recentPayouts') : 'Recent Payouts').toUpperCase()
    doc.text(payoutText, 20, yPosition)
    doc.setFont('helvetica', 'normal')
    yPosition += 10
    
    // Payout table headers
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    
    const colWidths = { date: 25, amount: 30, fees: 25, net: 30, status: 30, reconciled: 30 }
    let xPos = 20
    
    doc.text('Date', xPos, yPosition)
    xPos += colWidths.date
    doc.text('Amount', xPos, yPosition)
    xPos += colWidths.amount
    doc.text('Fees', xPos, yPosition)
    xPos += colWidths.fees
    doc.text('Net', xPos, yPosition)
    xPos += colWidths.net
    doc.text('Status', xPos, yPosition)
    xPos += colWidths.status
    doc.text('Reconciled', xPos, yPosition)
    
    doc.setFont('helvetica', 'normal')
    yPosition += 7
    
    // Add horizontal line
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 8
    
    // Payout rows
    payouts.forEach((payout, index) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
        
        // Re-add headers on new page
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        
        xPos = 20
        doc.text('Date', xPos, yPosition)
        xPos += colWidths.date
        doc.text('Amount', xPos, yPosition)
        xPos += colWidths.amount
        doc.text('Fees', xPos, yPosition)
        xPos += colWidths.fees
        doc.text('Net', xPos, yPosition)
        xPos += colWidths.net
        doc.text('Status', xPos, yPosition)
        xPos += colWidths.status
        doc.text('Reconciled', xPos, yPosition)
        
        doc.setFont('helvetica', 'normal')
        yPosition += 7
        doc.setLineWidth(0.5)
        doc.line(20, yPosition, 190, yPosition)
        yPosition += 8
      }
      
      // Add alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(20, yPosition - 4, 170, 6, 'F')
      }
      
      xPos = 20
      doc.text(format(new Date(payout.payoutDate), 'MM/dd/yy'), xPos, yPosition)
      xPos += colWidths.date
      doc.text(formatCurrency(payout.amount / 100), xPos, yPosition)
      xPos += colWidths.amount
      doc.text(formatCurrency(payout.totalFees / 100), xPos, yPosition)
      xPos += colWidths.fees
      doc.text(formatCurrency(payout.netAmount / 100), xPos, yPosition)
      xPos += colWidths.net
      
      // Status with color coding
      const statusColor: [number, number, number] = payout.status === 'paid' ? [0, 128, 0] : 
                         payout.status === 'failed' ? [255, 0, 0] : 
                         [128, 128, 128]
      doc.setTextColor(...statusColor)
      doc.text(payout.status.charAt(0).toUpperCase() + payout.status.slice(1), xPos, yPosition)
      doc.setTextColor(0, 0, 0)
      xPos += colWidths.status
      
      doc.text(payout.reconciledAt ? 'Yes' : 'No', xPos, yPosition)
      
      yPosition += 6
    })
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    
    // Page number and generation time
    doc.text(
      `Page ${i} of ${pageCount} - Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 20,
      { align: 'center' }
    )
    
    // Powered by AltarFlow
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(
      'Powered by AltarFlow',
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 13,
      { align: 'center' }
    )
    
    // Built with love
    doc.text(
      'Built with love for churches worldwide',
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 7,
      { align: 'center' }
    )
    
    // Reset text color
    doc.setTextColor(0, 0, 0)
  }
  
  // Generate filename and save
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `${churchName.replace(/\s+/g, '_')}_financial_analysis_${dateStr}.pdf`
  doc.save(filename)
}