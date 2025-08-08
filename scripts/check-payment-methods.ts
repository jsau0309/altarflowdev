import prisma from '@/lib/db'

async function checkPaymentMethods() {
  const donations = await prisma.donationTransaction.findMany({
    where: {
      status: 'succeeded',
      paymentMethodType: { not: null }
    },
    select: {
      paymentMethodType: true,
      amount: true,
      processingFeeCoveredByDonor: true
    },
    take: 20
  })
  
  console.log('Sample payment method types:')
  donations.forEach(d => {
    console.log(`- ${d.paymentMethodType}: $${d.amount/100} (fee covered: $${(d.processingFeeCoveredByDonor || 0)/100})`)
  })
  
  // Count by type
  const types = new Map<string, number>()
  donations.forEach(d => {
    const type = d.paymentMethodType || 'unknown'
    types.set(type, (types.get(type) || 0) + 1)
  })
  
  console.log('\nPayment method distribution:')
  types.forEach((count, type) => {
    console.log(`${type}: ${count}`)
  })
  
  process.exit(0)
}

checkPaymentMethods().catch(console.error)