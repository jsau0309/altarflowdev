import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db'
import { startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { churchId, dateRange, previousPeriod } = body
    
    if (!churchId || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Parse dates
    const fromDate = startOfDay(new Date(dateRange.from))
    const toDate = endOfDay(new Date(dateRange.to))
    const prevFromDate = previousPeriod ? startOfDay(new Date(previousPeriod.from)) : null
    const prevToDate = previousPeriod ? endOfDay(new Date(previousPeriod.to)) : null
    
    // First get the actual churchId from clerkOrgId
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
        refundedAmount: true
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
        refundedAmount: true
      }
    }) : []
    
    // Get actual fees from reconciled payouts in the selected date range
    // Payouts are our source of truth for fees from Stripe
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
      }
    })
    
    // Sum up the actual fees from payouts in this date range
    const currentActualFees = reconciledPayouts.reduce((sum, p) => sum + (p.totalFees || 0), 0)
    const hasActualFees = reconciledPayouts.length > 0
    
    // Calculate REAL gross donations (what donors actually paid)
    // This includes: donation amounts + fees covered by donors (Stripe + platform fees)
    const currentDonationAmounts = currentDonations.reduce((sum, d) => sum + d.amount - (d.refundedAmount || 0), 0)
    const currentFeesCovered = currentDonations.reduce((sum, d) => sum + (d.processingFeeCoveredByDonor || 0), 0)
    const currentPlatformFees = currentDonations.reduce((sum, d) => sum + (d.platformFeeAmount || 0), 0)
    const currentGross = currentDonationAmounts + currentFeesCovered + currentPlatformFees
    
    // Use actual fees from payouts when available, otherwise estimate
    let currentProcessingFees = 0
    
    if (hasActualFees) {
      // Use actual fees from Stripe payouts (source of truth)
      currentProcessingFees = currentActualFees
    } else {
      // Only estimate if no reconciled payouts are available for this period
      // This might happen for very recent transactions not yet paid out
      const stripeDonations = currentDonations.filter(d => 
        d.paymentMethodType && 
        d.paymentMethodType !== 'cash' && 
        d.paymentMethodType !== 'check'
      )
      
      currentProcessingFees = stripeDonations.reduce((sum, d) => {
        const netDonation = d.amount - (d.refundedAmount || 0)
        const coveredFees = d.processingFeeCoveredByDonor || 0
        const totalTransaction = netDonation + coveredFees
        
        if (totalTransaction <= 0) return sum
        
        if (d.paymentMethodType === 'card' || d.paymentMethodType === 'link') {
          return sum + Math.round(totalTransaction * 0.029 + 30)
        } else if (d.paymentMethodType === 'us_bank_account' || d.paymentMethodType === 'ach_debit') {
          return sum + Math.round(totalTransaction * 0.008)
        }
        return sum + Math.round(totalTransaction * 0.029 + 30)
      }, 0)
    }
    
    // Add platform fees to total processing fees (churches see combined total)
    const currentTotalFees = currentProcessingFees + currentPlatformFees

    // Calculate net donations (gross - total fees including platform)
    const currentNet = currentGross - currentTotalFees
    
    // Calculate previous period summary
    const prevDonationAmounts = previousDonations.reduce((sum, d) => sum + d.amount - (d.refundedAmount || 0), 0)
    const prevFeesCovered = previousDonations.reduce((sum, d) => sum + (d.processingFeeCoveredByDonor || 0), 0)
    const prevGross = prevDonationAmounts + prevFeesCovered
    const prevProcessingFees = 0 // We don't have historical fee data
    const prevNet = prevGross - prevProcessingFees
    
    // Calculate effective fee rate (what percentage of gross donations goes to fees)
    const effectiveFeeRate = currentGross > 0 ? (currentTotalFees / currentGross) : 0
    const prevEffectiveFeeRate = 0 // No historical fee data
    
    // Prepare summary data
    const summary = {
      grossRevenue: currentGross / 100, // Convert cents to dollars
      totalFees: currentTotalFees / 100, // Combined Stripe + platform fees
      netRevenue: currentNet / 100,
      effectiveFeeRate,
      isUsingActualFees: hasActualFees, // Indicate if fees are actual or estimated
      previousPeriod: previousDonations.length > 0 ? {
        grossRevenue: prevGross / 100,
        totalFees: prevProcessingFees / 100,
        netRevenue: prevNet / 100,
        effectiveFeeRate: prevEffectiveFeeRate
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
    // Note: Platform fees are separate and always apply
    const estimatedFeesWithoutCoverage = currentProcessingFees + totalCoveredFees + currentPlatformFees
    
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
    
    // Generate daily gross vs net data (keeping for now but not using)
    const dailyData = new Map<string, { gross: number; fees: number }>()
    
    // If we have actual payout data, use it for the days with payouts
    const payoutsByDate = new Map<string, { grossVolume: number; totalFees: number }>()
    if (hasActualFees) {
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
        }
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
      const date = donation.transactionDate.toISOString().split('T')[0]
      const netDonation = donation.amount - (donation.refundedAmount || 0)
      const coveredFees = donation.processingFeeCoveredByDonor || 0
      const grossAmount = netDonation + coveredFees // Real amount donor paid
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { gross: 0, fees: 0 })
      }
      
      const day = dailyData.get(date)!
      day.gross += grossAmount
      
      // Skip fee calculation if we have actual payout data for this day
      if (payoutsByDate.has(date)) {
        const payoutData = payoutsByDate.get(date)!
        day.fees = payoutData.totalFees
      } else {
        // Estimate fees for this transaction
        // Skip manual donations
        if (donation.paymentMethodType === 'cash' || donation.paymentMethodType === 'check') {
          // No fees
        } else if (donation.paymentMethodType) {
          // Calculate fee on the TOTAL transaction (donation + covered fees)
          const totalTransaction = netDonation + coveredFees
          
          let transactionFee = 0
          if (donation.paymentMethodType === 'card' || donation.paymentMethodType === 'link') {
            transactionFee = Math.round(totalTransaction * 0.029 + 30)
          } else if (donation.paymentMethodType === 'us_bank_account' || donation.paymentMethodType === 'ach_debit') {
            transactionFee = Math.round(totalTransaction * 0.008)
          } else {
            transactionFee = Math.round(totalTransaction * 0.029 + 30)
          }
          
          day.fees += transactionFee
        }
      }
    })
    
    // Fill in missing days with zero values
    const allDays = eachDayOfInterval({ start: fromDate, end: toDate })
    const grossVsNet = allDays.map(day => {
      const dateStr = day.toISOString().split('T')[0]
      const data = dailyData.get(dateStr) || { gross: 0, fees: 0 }
      
      return {
        date: dateStr,
        gross: data.gross / 100,
        net: (data.gross - Math.max(0, data.fees)) / 100,
        fees: Math.max(0, data.fees) / 100
      }
    })
    
    // Calculate fee breakdown by payment method
    const feesByType = new Map<string, number>()
    let totalFeesForBreakdown = 0
    
    if (hasActualFees && currentActualFees > 0) {
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
          fee = Math.round(totalTransaction * 0.029 + 30)
        } else if (donation.paymentMethodType === 'us_bank_account' || donation.paymentMethodType === 'ach_debit') {
          type = 'ACH Fees'
          fee = Math.round(totalTransaction * 0.008)
        } else if (donation.paymentMethodType) {
          // Unknown payment type, use card fees as default
          type = 'Card Fees'
          fee = Math.round(totalTransaction * 0.029 + 30)
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
    const payouts = await prisma.payoutSummary.findMany({
      where: { 
        churchId: church.id,
        payoutDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      orderBy: { payoutDate: 'desc' },
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
      grossVsNet,
      feeBreakdown,
      feeCoverageAnalytics,
      payouts: formattedPayouts
    })
    
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}