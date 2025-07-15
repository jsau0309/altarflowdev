import { prisma } from '../lib/prisma'

async function checkExpenseFormat() {
  try {
    // Get a few expenses to check their format
    const expenses = await prisma.expense.findMany({
      take: 5,
      orderBy: {
        expenseDate: 'desc'
      }
    })

    console.log('\n=== Expense Amount Format Check ===')
    expenses.forEach(e => {
      console.log(`Amount in DB: ${e.amount} | Type: ${typeof e.amount} | As string: ${e.amount.toString()}`)
    })

    // Also check donations for comparison
    const donations = await prisma.donationTransaction.findMany({
      take: 5,
      orderBy: {
        transactionDate: 'desc'
      }
    })

    console.log('\n=== Donation Amount Format Check (for comparison) ===')
    donations.forEach(d => {
      console.log(`Amount in DB: ${d.amount} | Type: ${typeof d.amount} | As string: ${d.amount.toString()}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExpenseFormat()