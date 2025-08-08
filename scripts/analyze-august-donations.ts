import prisma from '@/lib/db'

async function analyzeAugustDonations() {
  // Get the church
  const church = await prisma.church.findFirst({
    where: { clerkOrgId: { not: null } },
    select: { id: true, name: true }
  })
  
  if (!church) {
    console.log('No church found')
    process.exit(1)
  }
  
  console.log(`Analyzing donations for: ${church.name}`)
  console.log('=' .repeat(50))
  
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
      paymentMethodType: true,
      processingFeeCoveredByDonor: true,
      source: true,
      refundedAmount: true,
      transactionDate: true
    },
    orderBy: { transactionDate: 'asc' }
  })
  
  // Calculate totals
  let totalGross = 0
  let totalFeesCovered = 0
  let stripeGross = 0
  let manualGross = 0
  const paymentTypes = new Map<string, { count: number; amount: number; feesCovered: number }>()
  
  donations.forEach(d => {
    const netAmount = d.amount - (d.refundedAmount || 0)
    totalGross += netAmount
    totalFeesCovered += d.processingFeeCoveredByDonor || 0
    
    if (d.source === 'stripe') {
      stripeGross += netAmount
    } else {
      manualGross += netAmount
    }
    
    const type = d.paymentMethodType || 'unknown'
    if (!paymentTypes.has(type)) {
      paymentTypes.set(type, { count: 0, amount: 0, feesCovered: 0 })
    }
    const stats = paymentTypes.get(type)!
    stats.count++
    stats.amount += netAmount
    stats.feesCovered += d.processingFeeCoveredByDonor || 0
  })
  
  console.log('\n📊 AUGUST TOTALS:')
  console.log(`Total Gross Revenue: $${(totalGross / 100).toFixed(2)}`)
  console.log(`  - Stripe Donations: $${(stripeGross / 100).toFixed(2)}`)
  console.log(`  - Manual Donations: $${(manualGross / 100).toFixed(2)}`)
  console.log(`Total Fees Covered by Donors: $${(totalFeesCovered / 100).toFixed(2)}`)
  
  console.log('\n💳 PAYMENT METHOD BREAKDOWN:')
  paymentTypes.forEach((stats, type) => {
    console.log(`${type}:`)
    console.log(`  Count: ${stats.count}`)
    console.log(`  Amount: $${(stats.amount / 100).toFixed(2)}`)
    console.log(`  Fees Covered: $${(stats.feesCovered / 100).toFixed(2)}`)
  })
  
  // Get reconciled payout data
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
      payoutDate: true,
      grossVolume: true,
      totalFees: true,
      netAmount: true,
      status: true
    }
  })
  
  console.log('\n💰 RECONCILED PAYOUTS:')
  let totalPayoutGross = 0
  let totalPayoutFees = 0
  
  payouts.forEach(p => {
    console.log(`Date: ${p.payoutDate.toISOString().split('T')[0]}`)
    console.log(`  Gross: $${((p.grossVolume || 0) / 100).toFixed(2)}`)
    console.log(`  Fees: $${((p.totalFees || 0) / 100).toFixed(2)}`)
    console.log(`  Net: $${((p.netAmount || 0) / 100).toFixed(2)}`)
    totalPayoutGross += p.grossVolume || 0
    totalPayoutFees += p.totalFees || 0
  })
  
  console.log('\n📈 FINANCIAL ANALYSIS:')
  console.log(`Total Gross (from donations): $${(totalGross / 100).toFixed(2)}`)
  console.log(`Total Gross (from payouts): $${(totalPayoutGross / 100).toFixed(2)}`)
  console.log(`Actual Stripe Fees: $${(totalPayoutFees / 100).toFixed(2)}`)
  console.log(`Fees Covered by Donors: $${(totalFeesCovered / 100).toFixed(2)}`)
  console.log(`Net Amount Church Receives: $${((totalGross - totalPayoutFees) / 100).toFixed(2)}`)
  console.log(`Effective Fee Rate: ${totalGross > 0 ? ((totalPayoutFees / totalGross) * 100).toFixed(2) : 0}%`)
  
  process.exit(0)
}

analyzeAugustDonations().catch(console.error)