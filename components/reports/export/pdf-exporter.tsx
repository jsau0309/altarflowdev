'use client'

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { ReportSummary } from '@/lib/actions/reports.actions'
import { formatCurrency } from '@/lib/utils'
import { TFunction } from 'i18next'

interface ExportData {
  date: Date
  description: string
  category: string
  amount: number
  paymentMethod?: string
}

interface PDFExporterProps {
  data: ExportData[]
  summary: ReportSummary
  type: 'donations' | 'expenses'
  dateRange: {
    from: Date | null
    to: Date | null
  }
  churchName?: string
  donationTypeName?: string | null
  t?: TFunction
}

export function exportToPDF({
  data,
  summary,
  type,
  dateRange,
  churchName = 'Church',
  donationTypeName,
  t
}: PDFExporterProps) {
  const doc = new jsPDF()
  let yPosition = 20
  
  // Add header
  doc.setFontSize(20)
  doc.text(churchName, 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(16)
  const reportTitle = t ? t(`reports:${type === 'donations' ? 'donationReports' : 'expenseReports'}`) : `${type === 'donations' ? 'Donation' : 'Expense'} Report`
  doc.text(reportTitle, 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(12)
  const dateRangeText = `${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : ''}`
  doc.text(dateRangeText, 20, yPosition)
  yPosition += 7

  // Add donation type filter if present
  if (donationTypeName) {
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    const filterLabel = t ? t('reports:filteredBy') : 'Filtered by'
    doc.text(`${filterLabel}: ${donationTypeName}`, 20, yPosition)
    doc.setTextColor(0, 0, 0)
    yPosition += 8
  } else {
    yPosition += 8
  }
  
  // Add summary section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const summaryText = t ? t('common:summary').toUpperCase() : 'SUMMARY'
  doc.text(summaryText, 20, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 10
  
  doc.setFontSize(12)
  const totalLabel = t ? t(`reports:total${type === 'donations' ? 'Donations' : 'Expenses'}`) : `Total ${type === 'donations' ? 'Donations' : 'Expenses'}`
  doc.text(`${totalLabel}: ${formatCurrency(summary.total)}`, 20, yPosition)
  yPosition += 7
  
  const avgLabel = t ? t(`reports:average${type === 'donations' ? 'Donation' : 'Expense'}`) : `Average ${type === 'donations' ? 'Donation' : 'Expense'}`
  doc.text(`${avgLabel}: ${formatCurrency(summary.average)}`, 20, yPosition)
  yPosition += 7
  
  if (type === 'donations' && summary.count !== undefined) {
    const uniqueDonorsLabel = t ? t('reports:uniqueDonors') : 'Unique Donors'
    doc.text(`${uniqueDonorsLabel}: ${summary.count}`, 20, yPosition)
    yPosition += 7
  } else if (type === 'expenses' && summary.netIncome !== undefined) {
    const netIncomeLabel = t ? t('reports:netIncome') : 'Net Income'
    doc.text(`${netIncomeLabel}: ${formatCurrency(summary.netIncome)}`, 20, yPosition)
    yPosition += 7
  }
  
  yPosition += 10
  
  // Add transaction details
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const detailsText = t ? t('common:transactionDetails').toUpperCase() : 'TRANSACTION DETAILS'
  doc.text(detailsText, 20, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 10
  
  // Table headers
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  const colWidths = type === 'donations' 
    ? { date: 25, description: 55, category: 35, amount: 30, payment: 30 }
    : { date: 25, description: 65, category: 40, amount: 30 }
  
  let xPos = 20
  const dateLabel = t ? t('common:date') : 'Date'
  doc.text(dateLabel, xPos, yPosition)
  xPos += colWidths.date
  
  const descLabel = t ? (type === 'donations' ? t('common:donor') : t('common:vendor')) : (type === 'donations' ? 'Donor' : 'Vendor')
  doc.text(descLabel, xPos, yPosition)
  xPos += colWidths.description
  
  const categoryLabel = t ? t('common:category') : 'Category'
  doc.text(categoryLabel, xPos, yPosition)
  xPos += colWidths.category
  
  const amountLabel = t ? t('common:amount') : 'Amount'
  doc.text(amountLabel, xPos, yPosition)
  
  if (type === 'donations') {
    xPos += colWidths.amount
    const paymentLabel = t ? t('common:payment') : 'Payment'
    doc.text(paymentLabel, xPos, yPosition)
  }
  
  doc.setFont('helvetica', 'normal')
  yPosition += 7
  
  // Add horizontal line that spans full width of content
  doc.setLineWidth(0.5)
  doc.line(20, yPosition, 190, yPosition)
  yPosition += 8
  
  // Transaction rows
  data.forEach((transaction, index) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
      
      // Re-add headers on new page
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      
      xPos = 20
      const dateLabel2 = t ? t('common:date') : 'Date'
      doc.text(dateLabel2, xPos, yPosition)
      xPos += colWidths.date
      const descLabel2 = t ? (type === 'donations' ? t('common:donor') : t('common:vendor')) : (type === 'donations' ? 'Donor' : 'Vendor')
      doc.text(descLabel2, xPos, yPosition)
      xPos += colWidths.description
      const categoryLabel2 = t ? t('common:category') : 'Category'
      doc.text(categoryLabel2, xPos, yPosition)
      xPos += colWidths.category
      const amountLabel2 = t ? t('common:amount') : 'Amount'
      doc.text(amountLabel2, xPos, yPosition)
      if (type === 'donations') {
        xPos += colWidths.amount
        const paymentLabel2 = t ? t('common:payment') : 'Payment'
        doc.text(paymentLabel2, xPos, yPosition)
      }
      
      doc.setFont('helvetica', 'normal')
      yPosition += 7
      doc.setLineWidth(0.5)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 8
    }
    
    // Add alternating row background for better readability
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(20, yPosition - 4, 170, 6, 'F')
    }
    
    xPos = 20
    const date = format(new Date(transaction.date), 'MM/dd/yyyy')
    doc.text(date, xPos, yPosition)
    xPos += colWidths.date
    
    // Truncate long descriptions to fit column
    const maxDescLength = type === 'donations' ? 28 : 35
    const description = transaction.description.length > maxDescLength 
      ? transaction.description.substring(0, maxDescLength - 3) + '...' 
      : transaction.description
    doc.text(description, xPos, yPosition)
    xPos += colWidths.description
    
    // Truncate category if needed
    const category = transaction.category.length > 18 
      ? transaction.category.substring(0, 15) + '...' 
      : transaction.category
    doc.text(category, xPos, yPosition)
    xPos += colWidths.category
    
    doc.text(formatCurrency(transaction.amount), xPos, yPosition)
    
    if (type === 'donations' && transaction.paymentMethod) {
      xPos += colWidths.amount
      const payment = transaction.paymentMethod.length > 15 
        ? transaction.paymentMethod.substring(0, 12) + '...' 
        : transaction.paymentMethod
      doc.text(payment, xPos, yPosition)
    }
    
    yPosition += 6
  })
  
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

  // Robust filename sanitization helper
  const sanitizeFilename = (str: string): string => {
    return str
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Trim underscores from start/end
      .slice(0, 50) // Limit length to prevent overly long filenames
      || 'report' // Fallback if string becomes empty
  }

  const sanitizedChurchName = sanitizeFilename(churchName)
  const sanitizedDonationType = donationTypeName ? `_${sanitizeFilename(donationTypeName)}` : ''
  const filename = `${sanitizedChurchName}_${type}${sanitizedDonationType}_report_${dateStr}.pdf`
  doc.save(filename)
}