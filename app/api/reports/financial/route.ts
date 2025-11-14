import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db'
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns'

// Stripe fee rate constants - move to config later if rates change
const STRIPE_CARD_FEE_RATE = 0.029 // 2.9%
const STRIPE_CARD_FEE_FIXED = 30 // 30 cents
const STRIPE_ACH_FEE_RATE = 0.008 // 0.8%
const EPSILON = 0.01 // 1 cent - for division safety

// Helper function to validate ISO date strings
function isValidISODate(dateString: any): boolean {
  if (typeof dateString !== 'string') return false
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Verify authentication and organization membership
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { churchId, dateRange, previousPeriod } = body

    // CRITICAL: Validate required parameters
    if (!churchId || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // CRITICAL: Verify user belongs to the organization they're requesting data for
    if (orgId !== churchId) {
      return NextResponse.json({ error: 'Forbidden - organization mismatch' }, { status: 403 })
    }

    // CRITICAL: Validate date formats before parsing
    if (!isValidISODate(dateRange.from) || !isValidISODate(dateRange.to)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (previousPeriod && (!isValidISODate(previousPeriod.from) || !isValidISODate(previousPeriod.to))) {
      return NextResponse.json({ error: 'Invalid previous period date format' }, { status: 400 })
    }

    // Parse dates (now safe after validation)
    const fromDate = startOfDay(new Date(dateRange.from))
    const toDate = endOfDay(new Date(dateRange.to))
    const prevFromDate = previousPeriod ? startOfDay(new Date(previousPeriod.from)) : null
    const prevToDate = previousPeriod ? endOfDay(new Date(previousPeriod.to)) : null

    // Get the actual churchId from clerkOrgId (already verified above)
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId },
      select: { id: true }
    })

    if (!church) {
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }
    
    // Fetch current period donations
    const currentDonations = await prisma.donationTransaction.findMany({
      where: {
        churchId: church.id,
        transactionDate: {
          gte: fromDate,
          lte: toDate
        },
        status: 'succeeded'
      },
      select: {
        amount: true,
        processingFeeCoveredByDonor: true,
        platformFeeAmount: true,
        transactionDate: true,
        paymentMethodType: true,
        refundedAmount: true,
        donorId: true,
        stripePaymentIntentId: true // To distinguish Stripe vs manual donations
      }
    })
    
    // Fetch previous period donations if requested
    const previousDonations = prevFromDate && prevToDate ? await prisma.donationTransaction.findMany({
      where: {
        churchId: church.id,
        transactionDate: {
          gte: prevFromDate,
          lte: prevToDate
        },
        status: 'succeeded'
      },
      select: {
        amount: true,
        processingFeeCoveredByDonor: true,
        platformFeeAmount: true,
        refundedAmount: true,
        donorId: true
      }
    }) : []

    // Fetch current period expenses
    const currentExpenses = await prisma.expense.findMany({
      where: {
        churchId: church.id,
        expenseDate: {
          gte: fromDate,
          lte: toDate
        },
        status: {
          in: ['APPROVED', 'PENDING']
        }
      },
      select: {
        amount: true,
        expenseDate: true
      }
    })

    // Fetch previous period expenses
    const previousExpenses = prevFromDate && prevToDate ? await prisma.expense.findMany({
      where: {
        churchId: church.id,
        expenseDate: {
          gte: prevFromDate,
          lte: prevToDate
        },
        status: {
          in: ['APPROVED', 'PENDING']
        }
      },
      select: {
        amount: true
      }
    }) : []

    // Get actual fees from reconciled payouts in the selected date range
    // Payouts are our source of truth for fees from Stripe
    // HIGH PRIORITY FIX: Add pagination to prevent memory issues with large datasets
    const reconciledPayouts = await prisma.payoutSummary.findMany({
      where: {
        churchId: church.id,
        payoutDate: {
          gte: fromDate,
          lte: toDate
        },
        reconciledAt: { not: null } // Only reconciled payouts have accurate fee data
      },
      select: {
        totalFees: true,
        payoutDate: true
      },
      orderBy: { payoutDate: 'desc' },
      take: 1000 // Limit to prevent memory issues
    })

    // Sum up the actual fees from payouts in this date range
    const currentActualFees = reconciledPayouts.reduce((sum, p) => sum + (p.totalFees || 0), 0)

    // Get previous period payouts for growth comparison
    const previousPayouts = prevFromDate && prevToDate ? await prisma.payoutSummary.findMany({
      where: {
        churchId: church.id,
        payoutDate: {
          gte: prevFromDate,
          lte: prevToDate
        },
        reconciledAt: { not: null }
      },
      select: {
        totalFees: true
      },
      orderBy: { payoutDate: 'desc' },
      take: 1000 // Limit to prevent memory issues
    }) : []

    const previousActualFees = previousPayouts.reduce((sum, p) => sum + (p.totalFees || 0), 0)

    // Calculate REAL gross donations (what donors actually paid)
    // This includes: donation amounts + fees covered by donors (Stripe + platform fees)
    const currentDonationAmounts = currentDonations.reduce((sum, d) => sum + d.amount - (d.refundedAmount || 0), 0)
    const currentFeesCovered = currentDonations.reduce((sum, d) => sum + (d.processingFeeCoveredByDonor || 0), 0)
    const currentPlatformFees = currentDonations.reduce((sum, d) => sum + (d.platformFeeAmount || 0), 0)
    const currentGross = currentDonationAmounts + currentFeesCovered + currentPlatformFees

    // ALWAYS use actual fees from PayoutSummary - never estimate!
    // This ensures 100% accuracy from reconciliation data
    // If no payouts in the period, fees = 0 (as it should be)
    const currentProcessingFees = currentActualFees
    
    // Total fees = fees from PayoutSummary (includes Stripe fees + platform fees)
    // Platform fees are already included in the payout reconciliation data
    const currentTotalFees = currentProcessingFees

    // Calculate net donations (gross - total fees)
    const currentNet = currentGross - currentTotalFees
    
    // Calculate previous period summary
    const prevDonationAmounts = previousDonations.reduce((sum, d) => sum + d.amount - (d.refundedAmount || 0), 0)
    const prevFeesCovered = previousDonations.reduce((sum, d) => sum + (d.processingFeeCoveredByDonor || 0), 0)
    const prevPlatformFees = previousDonations.reduce((sum, d) => sum + (d.platformFeeAmount || 0), 0)
    const prevGross = prevDonationAmounts + prevFeesCovered + prevPlatformFees
    const prevProcessingFees = previousActualFees // Fees from PayoutSummary
    const prevTotalFees = prevProcessingFees
    const prevNet = prevGross - prevTotalFees

    // Calculate effective fee rate (what percentage of gross donations goes to fees)
    // Use EPSILON to avoid division by zero/near-zero amounts
    const effectiveFeeRate = currentGross > EPSILON ? (currentTotalFees / currentGross) : 0
    const prevEffectiveFeeRate = prevGross > EPSILON ? (prevTotalFees / prevGross) : 0

    // ========== NEW GROWTH METRICS ==========

    // Calculate total expenses (convert from dollars to cents)
    const currentTotalExpenses = currentExpenses.reduce((sum, e) => sum + (parseFloat(e.amount.toString()) * 100), 0)
    const previousTotalExpenses = previousExpenses.reduce((sum, e) => sum + (parseFloat(e.amount.toString()) * 100), 0)

    // Calculate Net Income (Revenue - Expenses)
    const currentNetIncome = currentNet - currentTotalExpenses
    const previousNetIncome = prevNet - previousTotalExpenses

    // ========== OPERATING EXPENSES: 12-MONTH ROLLING AVERAGE ==========
    // This is FIXED to last 12 months (not affected by user's date filter)
    // Professional standard for expense forecasting
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

    const last12MonthsExpenses = await prisma.expense.findMany({
      where: {
        churchId: church.id,
        expenseDate: {
          gte: twelveMonthsAgo,
          lte: new Date()
        }
      },
      select: {
        amount: true,
        expenseDate: true
      }
    })

    // ONLY count COMPLETE calendar months (exclude current incomplete month)
    // CFO Standard: If today is Nov 13, we exclude all Nov expenses from average
    // Once Dec 1 arrives, November becomes complete and gets included
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed (0=Jan, 10=Nov)

    // Filter to only complete months (exclude current month)
    const completeMonthExpenses = last12MonthsExpenses.filter(e => {
      const expenseDate = new Date(e.expenseDate)
      const expenseYear = expenseDate.getFullYear()
      const expenseMonth = expenseDate.getMonth()

      // Exclude if expense is in current month of current year
      return !(expenseYear === currentYear && expenseMonth === currentMonth)
    })

    // Calculate 12-month average from complete months only (convert dollars to cents)
    const total12MonthExpenses = completeMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount.toString()) * 100), 0)

    // Calculate actual months of data by counting unique year-month combinations
    // Use actual calendar months (28-31 days) - variance averages out over 12 months
    const uniqueMonths = new Set(
      completeMonthExpenses.map(e => {
        const date = new Date(e.expenseDate)
        return `${date.getFullYear()}-${date.getMonth()}`
      })
    )

    // Use the count of unique complete months (minimum 1 to avoid division by zero)
    // If no complete months exist yet, we'll show current month as baseline
    const actualMonthsToUse = Math.max(1, uniqueMonths.size)

    const operatingExpensesMonthly = total12MonthExpenses / actualMonthsToUse

    // Calculate months of cushion based on current period's net income
    // Use EPSILON to avoid division by zero
    const monthsOfCushion = operatingExpensesMonthly > EPSILON
      ? Math.max(0, currentNetIncome / operatingExpensesMonthly)
      : 0

    // Calculate Donation Growth Rate (top-line: % change in gross revenue)
    // Use EPSILON to avoid division by zero/near-zero amounts
    const donationGrowthRate = prevGross > EPSILON
      ? ((currentGross - prevGross) / prevGross)
      : (prevGross < EPSILON && currentGross > EPSILON ? 1 : 0) // 100% growth if starting from ~0

    // Calculate Net Income Growth Rate (bottom-line: % change in net income)
    // Use absolute value of previous if negative to get meaningful percentage
    // Use EPSILON for safer division check
    const absPrevNetIncome = Math.abs(previousNetIncome)
    const netIncomeGrowthRate = absPrevNetIncome > EPSILON
      ? ((currentNetIncome - previousNetIncome) / absPrevNetIncome)
      : (absPrevNetIncome < EPSILON && Math.abs(currentNetIncome) > EPSILON ? 1 : 0) // 100% growth if starting from ~0

    // Calculate Donor Metrics
    const currentUniqueDonors = new Set(currentDonations.map(d => d.donorId).filter(Boolean)).size
    const previousUniqueDonors = new Set(previousDonations.map(d => d.donorId).filter(Boolean)).size

    // Find donors who gave in previous period
    const previousDonorIds = new Set(previousDonations.map(d => d.donorId).filter(Boolean))

    // New donors = gave this period but not in previous period
    const newDonors = currentDonations.filter(d => d.donorId && !previousDonorIds.has(d.donorId))
    const newDonorCount = new Set(newDonors.map(d => d.donorId)).size

    // Returning donors = gave in both periods
    const returningDonorCount = currentDonations.filter(d => d.donorId && previousDonorIds.has(d.donorId)).length

    // Prepare summary data
    const summary = {
      // Revenue metrics
      grossRevenue: currentGross / 100,
      totalFees: currentTotalFees / 100,
      netRevenue: currentNet / 100,
      effectiveFeeRate,
      isUsingActualFees: true, // Always using PayoutSummary data (never estimating)

      // NEW: Growth-focused metrics
      totalExpenses: currentTotalExpenses / 100,
      netIncome: currentNetIncome / 100,
      donationGrowthRate, // Top-line growth (gross revenue)
      netIncomeGrowthRate, // Bottom-line growth (net income)
      totalDonors: currentUniqueDonors,
      newDonors: newDonorCount,
      returningDonors: returningDonorCount,
      operatingExpenses: operatingExpensesMonthly / 100, // 12-month rolling average
      monthsOfCushion, // Based on current net income vs 12-month avg expenses

      // Previous period comparison
      previousPeriod: previousDonations.length > 0 ? {
        grossRevenue: prevGross / 100,
        totalFees: prevProcessingFees / 100,
        netRevenue: prevNet / 100,
        effectiveFeeRate: prevEffectiveFeeRate,
        totalExpenses: previousTotalExpenses / 100,
        netIncome: previousNetIncome / 100,
        totalDonors: previousUniqueDonors
      } : undefined
    }
    
    // Calculate donor fee coverage analytics
    const stripeDonations = currentDonations.filter(d => 
      d.paymentMethodType && 
      d.paymentMethodType !== 'cash' && 
      d.paymentMethodType !== 'check'
    )
    
    const donationsWithCoverage = stripeDonations.filter(d => 
      d.processingFeeCoveredByDonor && d.processingFeeCoveredByDonor > 0
    )
    
    const coverageRate = stripeDonations.length > 0 
      ? (donationsWithCoverage.length / stripeDonations.length) 
      : 0
    
    // Calculate what fees would be without any coverage
    // This is the sum of covered fees PLUS the actual fees paid
    const totalCoveredFees = stripeDonations.reduce((sum, d) => {
      return sum + (d.processingFeeCoveredByDonor || 0)
    }, 0)

    // Fees if no one covered = actual fees paid + fees that were covered
    // Platform fees are always included in PayoutSummary data
    const estimatedFeesWithoutCoverage = currentProcessingFees + totalCoveredFees
    
    // Total saved by donor coverage
    // This is simply the sum of all fees that donors covered
    const totalSavedByCoverage = totalCoveredFees
    
    // Calculate coverage by donation type
    const coverageByType = new Map<string, { total: number; covered: number }>()
    
    stripeDonations.forEach(d => {
      const type = d.paymentMethodType === 'us_bank_account' ? 'ACH' : 'Card'
      
      if (!coverageByType.has(type)) {
        coverageByType.set(type, { total: 0, covered: 0 })
      }
      
      const stats = coverageByType.get(type)!
      stats.total++
      if (d.processingFeeCoveredByDonor && d.processingFeeCoveredByDonor > 0) {
        stats.covered++
      }
    })
    
    const coverageBreakdown = Array.from(coverageByType.entries()).map(([type, stats]) => ({
      type,
      coverageRate: stats.total > 0 ? stats.covered / stats.total : 0,
      totalDonations: stats.total,
      coveredDonations: stats.covered
    }))
    
    // Generate daily revenue vs expenses data
    const dailyData = new Map<string, { gross: number; fees: number; expenses: number }>()
    
    // If we have payouts in this period, fetch them for daily breakdown
    const payoutsByDate = new Map<string, { grossVolume: number; totalFees: number }>()
    if (currentActualFees > 0) {
      const allPayouts = await prisma.payoutSummary.findMany({
        where: {
          churchId: church.id,
          payoutDate: {
            gte: fromDate,
            lte: toDate
          }
        },
        select: {
          payoutDate: true,
          grossVolume: true,
          totalFees: true
        },
        orderBy: { payoutDate: 'desc' },
        take: 1000 // Limit to prevent memory issues
      })
      
      allPayouts.forEach(payout => {
        const date = payout.payoutDate.toISOString().split('T')[0]
        payoutsByDate.set(date, {
          grossVolume: payout.grossVolume || 0,
          totalFees: payout.totalFees || 0
        })
      })
    }
    
    currentDonations.forEach(donation => {
      // Use format to avoid timezone shifts (ISO conversion can change the date)
      const date = format(donation.transactionDate, 'yyyy-MM-dd')
      const netDonation = donation.amount - (donation.refundedAmount || 0)
      const coveredFees = donation.processingFeeCoveredByDonor || 0
      const grossAmount = netDonation + coveredFees // Real amount donor paid
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { gross: 0, fees: 0, expenses: 0 })
      }
      
      const day = dailyData.get(date)!
      day.gross += grossAmount
      
      // Skip fee calculation if we have actual payout data for this day
      if (payoutsByDate.has(date)) {
        const payoutData = payoutsByDate.get(date)!
        day.fees = payoutData.totalFees
      } else {
        // Estimate fees ONLY for actual Stripe transactions (not manual donations)
        // Manual donations (no stripePaymentIntentId) always have $0 fees
        if (donation.stripePaymentIntentId && donation.paymentMethodType) {
          // This is a real Stripe transaction - calculate fee on the TOTAL transaction (donation + covered fees)
          const totalTransaction = netDonation + coveredFees

          let transactionFee = 0
          if (donation.paymentMethodType === 'card' || donation.paymentMethodType === 'link') {
            transactionFee = Math.round(totalTransaction * STRIPE_CARD_FEE_RATE + STRIPE_CARD_FEE_FIXED)
          } else if (donation.paymentMethodType === 'us_bank_account' || donation.paymentMethodType === 'ach_debit') {
            transactionFee = Math.round(totalTransaction * STRIPE_ACH_FEE_RATE)
          } else {
            transactionFee = Math.round(totalTransaction * STRIPE_CARD_FEE_RATE + STRIPE_CARD_FEE_FIXED)
          }

          day.fees += transactionFee
        }
        // Manual donations: no Stripe ID = no fees (already handled by not adding to fees)
      }
    })

    // Add expenses to daily data (convert from dollars to cents)
    currentExpenses.forEach(expense => {
      // Use format to avoid timezone shifts
      const date = format(expense.expenseDate, 'yyyy-MM-dd')

      if (!dailyData.has(date)) {
        dailyData.set(date, { gross: 0, fees: 0, expenses: 0 })
      }

      const day = dailyData.get(date)!
      day.expenses += parseFloat(expense.amount.toString()) * 100
    })

    // Fill in missing days with zero values
    const allDays = eachDayOfInterval({ start: fromDate, end: toDate })
    const revenueVsExpenses = allDays.map(day => {
      const dateStr = day.toISOString().split('T')[0]
      const data = dailyData.get(dateStr) || { gross: 0, fees: 0, expenses: 0 }

      // Show GROSS donations (what donors actually paid)
      // No fee deductions - this is the total amount donors contributed
      const revenue = data.gross / 100
      const expenses = data.expenses / 100
      const netIncome = revenue - expenses

      return {
        date: dateStr,
        revenue,
        expenses,
        netIncome
      }
    })

    // Calculate fee breakdown by payment method
    const feesByType = new Map<string, number>()
    let totalFeesForBreakdown = 0

    if (currentActualFees > 0) {
      // When we have actual fees, distribute them proportionally by payment type
      const volumeByType = new Map<string, number>()
      
      currentDonations.forEach(donation => {
        if (donation.paymentMethodType === 'cash' || donation.paymentMethodType === 'check') {
          return // Skip manual donations
        }
        
        const netDonation = donation.amount - (donation.refundedAmount || 0)
        const coveredFees = donation.processingFeeCoveredByDonor || 0
        const totalTransaction = netDonation + coveredFees
        
        if (totalTransaction <= 0) return
        
        let type = 'Card Fees'
        if (donation.paymentMethodType === 'us_bank_account' || donation.paymentMethodType === 'ach_debit') {
          type = 'ACH Fees'
        }
        
        volumeByType.set(type, (volumeByType.get(type) || 0) + totalTransaction)
      })
      
      // Distribute actual fees proportionally based on volume
      const totalVolume = Array.from(volumeByType.values()).reduce((sum, v) => sum + v, 0)
      
      if (totalVolume > 0) {
        volumeByType.forEach((volume, type) => {
          const proportionalFee = Math.round((volume / totalVolume) * currentActualFees)
          if (proportionalFee > 0) {
            feesByType.set(type, proportionalFee)
            totalFeesForBreakdown += proportionalFee
          }
        })
      }
    } else {
      // Estimate fees by payment method when no actual fees available
      currentDonations.forEach(donation => {
        // Skip manual donations
        if (donation.paymentMethodType === 'cash' || donation.paymentMethodType === 'check') {
          return // No fees for manual donations
        }
        
        const netDonation = donation.amount - (donation.refundedAmount || 0)
        const coveredFees = donation.processingFeeCoveredByDonor || 0
        const totalTransaction = netDonation + coveredFees
        
        if (totalTransaction <= 0) return
        
        let fee = 0
        let type = 'Card Fees'
        
        // Calculate fee on the total transaction amount
        if (donation.paymentMethodType === 'card' || donation.paymentMethodType === 'link') {
          type = 'Card Fees'
          fee = Math.round(totalTransaction * STRIPE_CARD_FEE_RATE + STRIPE_CARD_FEE_FIXED)
        } else if (donation.paymentMethodType === 'us_bank_account' || donation.paymentMethodType === 'ach_debit') {
          type = 'ACH Fees'
          fee = Math.round(totalTransaction * STRIPE_ACH_FEE_RATE)
        } else if (donation.paymentMethodType) {
          // Unknown payment type, use card fees as default
          type = 'Card Fees'
          fee = Math.round(totalTransaction * STRIPE_CARD_FEE_RATE + STRIPE_CARD_FEE_FIXED)
        }
        
        if (fee > 0) {
          feesByType.set(type, (feesByType.get(type) || 0) + fee)
          totalFeesForBreakdown += fee
        }
      })
    }
    
    const feeBreakdown = Array.from(feesByType.entries()).map(([name, value]) => ({
      name,
      value: value / 100,
      percentage: totalFeesForBreakdown > 0 ? (value / totalFeesForBreakdown) * 100 : 0
    }))
    
    // Fetch payouts for the selected date range
    // HIGH PRIORITY FIX: Add pagination to prevent memory issues
    const payouts = await prisma.payoutSummary.findMany({
      where: {
        churchId: church.id,
        payoutDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      orderBy: { payoutDate: 'desc' },
      take: 100, // Limit for frontend display
      select: {
        id: true,
        stripePayoutId: true,
        payoutDate: true,
        arrivalDate: true,
        amount: true,
        status: true,
        reconciledAt: true,
        transactionCount: true,
        grossVolume: true,
        totalFees: true,
        netAmount: true
      }
    })
    
    // Format payouts for response
    const formattedPayouts = payouts.map(payout => ({
      id: payout.id,
      payoutDate: payout.payoutDate.toISOString(),
      arrivalDate: payout.arrivalDate.toISOString(),
      amount: payout.amount,
      status: payout.status,
      reconciledAt: payout.reconciledAt?.toISOString() || null,
      transactionCount: payout.transactionCount,
      grossVolume: payout.grossVolume,
      totalFees: payout.totalFees,
      netAmount: payout.netAmount
    }))
    
    // Prepare fee coverage analytics
    const feeCoverageAnalytics = {
      coverageRate,
      totalDonations: stripeDonations.length,
      donationsWithCoverage: donationsWithCoverage.length,
      estimatedFeesWithoutCoverage: estimatedFeesWithoutCoverage / 100,
      actualFees: currentProcessingFees / 100,
      savedByDonorCoverage: totalSavedByCoverage / 100,
      savingsPercentage: estimatedFeesWithoutCoverage > 0 
        ? (totalSavedByCoverage / estimatedFeesWithoutCoverage) 
        : 0,
      coverageByType: coverageBreakdown
    }
    
    return NextResponse.json({
      summary,
      revenueVsExpenses, // NEW: Daily revenue vs expenses data
      feeBreakdown,
      feeCoverageAnalytics,
      payouts: formattedPayouts
    })
    
  } catch (error) {
    // Structured error logging with context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[Financial API Error]', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      // Don't log sensitive data in production
      ...(process.env.NODE_ENV === 'development' && {
        requestBody: JSON.stringify({ hasDateRange: !!request.body })
      })
    })

    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}