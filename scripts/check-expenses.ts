import { prisma } from '../lib/prisma'

async function checkExpenses() {
  try {
    // Get all expenses for both churches
    const expenses = await prisma.expense.findMany({
      select: {
        id: true,
        amount: true,
        expenseDate: true,
        status: true,
        category: true,
        vendor: true,
        church: {
          select: {
            name: true,
            clerkOrgId: true
          }
        }
      },
      orderBy: {
        expenseDate: 'desc'
      },
      take: 20
    })

    console.log('\n=== Recent Expenses ===')
    console.log(`Total expenses found: ${expenses.length}`)
    
    expenses.forEach(e => {
      console.log(`- ${e.expenseDate.toISOString()} | $${e.amount} | ${e.status} | ${e.category} | ${e.vendor || 'No vendor'} | Church: ${e.church.name}`)
    })

    // Count by status
    const statusCount = await prisma.expense.groupBy({
      by: ['status'],
      _count: true
    })
    
    console.log('\n=== Expense Status Summary ===')
    statusCount.forEach(s => {
      console.log(`- ${s.status}: ${s._count} expenses`)
    })

    // Check June 2025 expenses for Iglesia Mana de Dios
    const june2025Expenses = await prisma.expense.findMany({
      where: {
        churchId: '5be2355b-9e7e-4df6-a249-fda411e10155',
        expenseDate: {
          gte: new Date('2025-06-01'),
          lt: new Date('2025-07-01')
        }
      }
    })

    console.log(`\n=== June 2025 Expenses for Iglesia Mana de Dios ===`)
    console.log(`Found ${june2025Expenses.length} expenses`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExpenses()