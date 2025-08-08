import prisma from '@/lib/db'

async function verifyFinancialCalculations() {
  const church = await prisma.church.findFirst({
    where: { clerkOrgId: { not: null } },
    select: { id: true, name: true }
  })
  
  if (!church) {
    console.log('No church found')
    process.exit(1)
  }
  
  // Get August donations
  const donations = await prisma.donationTransaction.findMany({
    where: {
      churchId: church.id,
      transactionDate: {
        gte: new Date('2025-08-01'),
        lt: new Date('2025-09-01')
      },
      status: { in: ['succeeded', 'completed'] }
    },
    select: {
      amount: true,
      processingFeeCoveredByDonor: true,
      paymentMethodType: true,
      refundedAmount: true
    }
  })
  
  // Calculate REAL gross (what donors actually paid)
  let totalDonationAmounts = 0
  let totalCoveredFees = 0
  let stripeTransactionCount = 0
  
  donations.forEach(d => {
    const netDonation = d.amount - (d.refundedAmount || 0)
    const coveredFees = d.processingFeeCoveredByDonor || 0
    
    totalDonationAmounts += netDonation
    totalCoveredFees += coveredFees
    
    if (d.paymentMethodType && d.paymentMethodType !== 'cash' && d.paymentMethodType !== 'check') {
      stripeTransactionCount++
    }
  })
  
  const realGross = totalDonationAmounts + totalCoveredFees
  
  // Get actual fees from reconciliation
  const payouts = await prisma.payoutSummary.findMany({
    where: {
      churchId: church.id,
      payoutDate: {
        gte: new Date('2025-08-01'),
        lt: new Date('2025-09-01')
      },
      reconciledAt: { not: null }
    },
    select: {
      totalFees: true
    }
  })
  
  const actualFees = payouts.reduce((sum, p) => sum + (p.totalFees || 0), 0)
  const netDonations = realGross - actualFees
  const effectiveRate = realGross > 0 ? (actualFees / realGross) * 100 : 0
  
  console.log('FINANCIAL ANALYSIS VERIFICATION')
  console.log('=' .repeat(50))
  console.log('\n📊 GROSS DONATIONS (What donors actually paid):')
  console.log(`  Donation amounts: $${(totalDonationAmounts / 100).toFixed(2)}`)
  console.log(`  + Fees covered by donors: $${(totalCoveredFees / 100).toFixed(2)}`)
  console.log(`  = REAL GROSS TOTAL: $${(realGross / 100).toFixed(2)}`)
  
  console.log('\n💳 PROCESSING FEES (From Stripe reconciliation):')
  console.log(`  Actual fees charged: $${(actualFees / 100).toFixed(2)}`)
  
  console.log('\n💰 NET DONATIONS (What church receives):')
  console.log(`  Gross - Fees = $${(netDonations / 100).toFixed(2)}`)
  
  console.log('\n📈 EFFECTIVE FEE RATE:')
  console.log(`  (Fees / Gross) × 100 = ${effectiveRate.toFixed(2)}%`)
  console.log(`  Meaning: For every $100 donated, church pays $${effectiveRate.toFixed(2)} in fees`)
  
  process.exit(0)
}

verifyFinancialCalculations().catch(console.error)