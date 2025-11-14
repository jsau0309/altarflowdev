'use client'

import { format } from 'date-fns'
import { ReportSummary } from '@/lib/actions/reports.actions'
import { TFunction } from 'i18next'

interface ExportData {
  date: Date
  description: string
  category: string
  amount: number
  paymentMethod?: string
}

interface CSVExporterProps {
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

export function exportToCSV({
  data,
  summary,
  type,
  dateRange,
  churchName = 'Church',
  donationTypeName,
  t
}: CSVExporterProps) {
  // Helper function to translate donation types (for system types like Offering, Tithe)
  const translateDonationType = (donationType: string): string => {
    if (!t) return donationType
    const fundKey = donationType.toLowerCase().replace(/\s+/g, '_')
    return t(`donations:funds.${fundKey}`, { defaultValue: donationType })
  }

  // Helper function to translate expense categories
  const translateExpenseCategory = (category: string): string => {
    if (!t) return category
    // Use the same translation key as the Tag implementation in Settings/Expenses pages
    return t(`settings:systemCategories.expenseCategories.${category}`, { defaultValue: category })
  }

  // Helper function to translate payment methods
  const translatePaymentMethod = (method: string): string => {
    if (!t) return method
    // Capitalize method name to match translation keys (Card, Cash, Check, Bank Transfer)
    const capitalizedMethod = method.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
    // Use the SAME translation key as the Tag implementation in Settings/Donations pages
    return t(`settings:systemCategories.paymentMethods.${capitalizedMethod}`, { defaultValue: capitalizedMethod })
  }

  // Create CSV content
  const rows: string[] = []
  
  // Add header
  const reportTitle = t ? t(`reports:${type === 'donations' ? 'donationReports' : 'expenseReports'}`) : `${type === 'donations' ? 'Donation' : 'Expense'} Report`
  rows.push(`${churchName} - ${reportTitle}`)
  const dateRangeLabel = t ? t('reports:dateRange') : 'Date Range'
  rows.push(`${dateRangeLabel}: ${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : ''}`)

  // Add filter if present (donation type or expense category)
  if (donationTypeName) {
    const filterLabel = t ? t('reports:filteredBy') : 'Filtered by'
    // Translate the filter name if it's an expense category
    const translatedFilterName = type === 'expenses'
      ? translateExpenseCategory(donationTypeName)
      : donationTypeName
    rows.push(`${filterLabel}: ${translatedFilterName}`)
  }

  rows.push('') // Empty line
  
  // Add summary
  const summaryText = t ? t('common:summary').toUpperCase() : 'SUMMARY'
  rows.push(summaryText)
  const totalLabel = t ? t(`reports:total${type === 'donations' ? 'Donations' : 'Expenses'}`) : `Total ${type === 'donations' ? 'Donations' : 'Expenses'}`
  rows.push(`${totalLabel},$${summary.total.toFixed(2)}`)
  const avgLabel = t ? t(`reports:average${type === 'donations' ? 'Donation' : 'Expense'}`) : `Average ${type === 'donations' ? 'Donation' : 'Expense'}`
  rows.push(`${avgLabel},$${summary.average.toFixed(2)}`)
  
  if (type === 'donations' && summary.count !== undefined) {
    const uniqueDonorsLabel = t ? t('reports:uniqueDonors') : 'Unique Donors'
    rows.push(`${uniqueDonorsLabel},${summary.count}`)
  } else if (type === 'expenses' && summary.netIncome !== undefined) {
    const netIncomeLabel = t ? t('reports:netIncome') : 'Net Income'
    rows.push(`${netIncomeLabel},$${summary.netIncome.toFixed(2)}`)
  }
  
  rows.push('') // Empty line
  rows.push('') // Empty line
  
  // Add transaction details header
  const detailsText = t ? t('common:transactionDetails').toUpperCase() : 'TRANSACTION DETAILS'
  rows.push(detailsText)
  
  const dateLabel = t ? t('common:date') : 'Date'
  const donorLabel = t ? t('common:donor') : 'Donor'
  const vendorLabel = t ? t('common:vendor') : 'Vendor'
  const categoryLabel = t ? t('common:category') : 'Category'
  const amountLabel = t ? t('common:amount') : 'Amount'
  const paymentLabel = t ? t('common:paymentMethod') : 'Payment Method'
  
  if (type === 'donations') {
    rows.push(`${dateLabel},${donorLabel},${categoryLabel},${amountLabel},${paymentLabel}`)
  } else {
    rows.push(`${dateLabel},${vendorLabel},${categoryLabel},${amountLabel}`)
  }
  
  // Add transaction rows
  data.forEach(transaction => {
    const date = format(new Date(transaction.date), 'MM/dd/yyyy')
    const description = transaction.description.replace(/,/g, ';') // Replace commas to avoid CSV issues
    const translatedCategory = type === 'donations'
      ? translateDonationType(transaction.category)
      : translateExpenseCategory(transaction.category)
    const category = translatedCategory.replace(/,/g, ';') // Replace commas to avoid CSV issues
    const amount = `$${transaction.amount.toFixed(2)}`

    if (type === 'donations') {
      const translatedPayment = transaction.paymentMethod
        ? translatePaymentMethod(transaction.paymentMethod)
        : 'N/A'
      const paymentMethod = translatedPayment.replace(/,/g, ';') // Replace commas to avoid CSV issues
      rows.push(`${date},${description},${category},${amount},${paymentMethod}`)
    } else {
      rows.push(`${date},${description},${category},${amount}`)
    }
  })
  
  // Convert to CSV string
  const csvContent = rows.join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  // Generate filename
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
  const filename = `${sanitizedChurchName}_${type}${sanitizedDonationType}_report_${dateStr}.csv`
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}