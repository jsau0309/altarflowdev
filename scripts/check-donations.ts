import { prisma } from '../lib/prisma'

async function checkDonations() {
  try {
    // First, get all churches to see their IDs
    const churches = await prisma.church.findMany({
      select: {
        id: true,
        name: true,
        clerkOrgId: true
      }
    })

    console.log('\n=== Churches ===')
    churches.forEach(c => {
      console.log(`- ${c.name}: clerkOrgId = ${c.clerkOrgId}`)
    })

    // Get all donations
    const donations = await prisma.donationTransaction.findMany({
      select: {
        id: true,
        amount: true,
        transactionDate: true,
        status: true,
        church: {
          select: {
            name: true,
            clerkOrgId: true
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      },
      take: 20
    })

    console.log('\n=== Recent Donations ===')
    console.log(`Total donations found: ${donations.length}`)
    
    donations.forEach(d => {
      console.log(`- ${d.transactionDate.toISOString()} | $${d.amount} | ${d.status} | Church: ${d.church.name} (clerkOrgId: ${d.church.clerkOrgId})`)
    })

    // Check specifically for June 2025
    const june2025Start = new Date('2025-06-01')
    const june2025End = new Date('2025-06-30')
    
    const juneDonations = await prisma.donationTransaction.findMany({
      where: {
        transactionDate: {
          gte: june2025Start,
          lte: june2025End
        },
        status: 'succeeded'
      },
      select: {
        church: {
          select: {
            clerkOrgId: true
          }
        }
      }
    })

    console.log(`\n=== June 2025 Donations ===`)
    console.log(`Found ${juneDonations.length} donations in June 2025`)
    
    // Group by church
    const byChurch = juneDonations.reduce((acc, d) => {
      const orgId = d.church.clerkOrgId
      acc[orgId] = (acc[orgId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\nDonations by Church:')
    Object.entries(byChurch).forEach(([orgId, count]) => {
      console.log(`- ${orgId}: ${count} donations`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDonations()