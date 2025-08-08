import prisma from '@/lib/db'

async function checkCoveredFees() {
  // Get a donation with covered fees
  const donations = await prisma.donationTransaction.findMany({
    where: {
      processingFeeCoveredByDonor: { gt: 0 },
      status: 'succeeded'
    },
    select: {
      amount: true,
      processingFeeCoveredByDonor: true,
      paymentMethodType: true,
      transactionDate: true
    },
    take: 5
  })
  
  console.log('Donations with covered fees:')
  donations.forEach(d => {
    console.log(`Amount stored: $${d.amount/100}`)
    console.log(`Fee covered: $${(d.processingFeeCoveredByDonor || 0)/100}`)
    
    // Calculate what the base donation would be
    const baseDonation = d.amount - (d.processingFeeCoveredByDonor || 0)
    console.log(`Base donation (amount - fee): $${baseDonation/100}`)
    console.log('---')
  })
  
  process.exit(0)
}

checkCoveredFees().catch(console.error)