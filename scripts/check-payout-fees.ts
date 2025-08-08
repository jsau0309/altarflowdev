import prisma from '@/lib/db'

async function checkPayoutFees() {
  const payouts = await prisma.payoutSummary.findMany({
    where: {
      reconciledAt: { not: null }
    },
    select: {
      payoutDate: true,
      grossVolume: true,
      totalFees: true,
      netAmount: true,
      transactionCount: true
    },
    orderBy: { payoutDate: 'desc' },
    take: 5
  })
  
  console.log('Recent reconciled payouts with actual fee data:')
  payouts.forEach(p => {
    const effectiveRate = p.grossVolume ? (p.totalFees! / p.grossVolume) * 100 : 0
    console.log(`Date: ${p.payoutDate.toISOString().split('T')[0]}`)
    console.log(`  Gross: $${(p.grossVolume || 0)/100}`)
    console.log(`  Fees: $${(p.totalFees || 0)/100}`)
    console.log(`  Net: $${(p.netAmount || 0)/100}`)
    console.log(`  Effective rate: ${effectiveRate.toFixed(2)}%`)
    console.log(`  Transactions: ${p.transactionCount}`)
    console.log('---')
  })
  
  // Calculate total fees for August
  const augustPayouts = await prisma.payoutSummary.findMany({
    where: {
      payoutDate: {
        gte: new Date('2025-08-01'),
        lt: new Date('2025-09-01')
      },
      reconciledAt: { not: null }
    },
    select: {
      grossVolume: true,
      totalFees: true
    }
  })
  
  const totalGross = augustPayouts.reduce((sum, p) => sum + (p.grossVolume || 0), 0)
  const totalFees = augustPayouts.reduce((sum, p) => sum + (p.totalFees || 0), 0)
  
  console.log('\nAugust totals from reconciled payouts:')
  console.log(`Total Gross: $${totalGross/100}`)
  console.log(`Total Fees: $${totalFees/100}`)
  console.log(`Effective rate: ${totalGross ? ((totalFees/totalGross) * 100).toFixed(2) : 0}%`)
  
  process.exit(0)
}

checkPayoutFees().catch(console.error)