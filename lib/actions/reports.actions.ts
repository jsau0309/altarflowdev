"use server"

import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export interface MonthlyReportData {
  month: string
  amount: number
  count: number
}

export interface CategoryReportData {
  category: string
  amount: number
  percentage: number
}

export interface ReportSummary {
  total: number
  average: number
  count?: number
  netIncome?: number
}

// Get monthly donation summary
export async function getMonthlyDonationSummary(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyReportData[]> {
  try {
    
    const donations = await prisma.donationTransaction.findMany({
      where: {
        church: { clerkOrgId: churchId },
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['succeeded', 'succeeded\n']
        }
      },
      select: {
        transactionDate: true,
        amount: true
      }
    })


    // Group by month
    const monthlyData = donations.reduce((acc, donation) => {
      const monthKey = format(new Date(donation.transactionDate), 'yyyy-MM')
      if (!acc[monthKey]) {
        acc[monthKey] = { total: 0, count: 0 }
      }
      acc[monthKey].total += parseFloat(donation.amount.toString()) / 100
      acc[monthKey].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    // Generate all months from start to end date
    const allMonths: MonthlyReportData[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const monthKey = format(currentDate, 'yyyy-MM')
      const data = monthlyData[monthKey] || { total: 0, count: 0 }
      
      allMonths.push({
        month: format(currentDate, 'MMM'),
        amount: data.total,
        count: data.count
      })
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return allMonths
  } catch (error) {
    console.error('Error fetching monthly donation summary:', error)
    return []
  }
}

// Get donation category breakdown
export async function getDonationCategoryBreakdown(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryReportData[]> {
  try {
    
    const donations = await prisma.donationTransaction.findMany({
      where: {
        church: { clerkOrgId: churchId },
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['succeeded', 'succeeded\n']
        }
      },
      select: {
        amount: true,
        donationType: {
          select: {
            name: true
          }
        }
      }
    })


    // Group by category
    const categoryTotals = donations.reduce((acc, donation) => {
      const category = donation.donationType.name
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += parseFloat(donation.amount.toString()) / 100
      return acc
    }, {} as Record<string, number>)

    // Calculate percentages
    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
    
    const categoryData = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))

    return categoryData
  } catch (error) {
    console.error('Error fetching donation category breakdown:', error)
    return []
  }
}

// Get donation summary
export async function getDonationSummary(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<ReportSummary> {
  try {
    const donations = await prisma.donationTransaction.findMany({
      where: {
        church: { clerkOrgId: churchId },
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['succeeded', 'succeeded\n']
        }
      },
      select: {
        amount: true,
        donorId: true
      }
    })

    const total = donations.reduce((sum, d) => sum + parseFloat(d.amount.toString()) / 100, 0)
    const uniqueDonors = new Set(donations.map(d => d.donorId).filter(Boolean)).size
    const average = donations.length > 0 ? total / donations.length : 0

    return {
      total,
      average,
      count: uniqueDonors
    }
  } catch (error) {
    console.error('Error fetching donation summary:', error)
    return { total: 0, average: 0, count: 0 }
  }
}

// Get monthly expense summary
export async function getMonthlyExpenseSummary(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyReportData[]> {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        church: { clerkOrgId: churchId },
        expenseDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['APPROVED', 'PENDING']
        }
      },
      select: {
        expenseDate: true,
        amount: true
      }
    })

    // Group by month
    const monthlyData = expenses.reduce((acc, expense) => {
      const monthKey = format(new Date(expense.expenseDate), 'yyyy-MM')
      if (!acc[monthKey]) {
        acc[monthKey] = { total: 0, count: 0 }
      }
      acc[monthKey].total += parseFloat(expense.amount.toString())
      acc[monthKey].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    // Generate all months from start to end date
    const allMonths: MonthlyReportData[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const monthKey = format(currentDate, 'yyyy-MM')
      const data = monthlyData[monthKey] || { total: 0, count: 0 }
      
      allMonths.push({
        month: format(currentDate, 'MMM'),
        amount: data.total,
        count: data.count
      })
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return allMonths
  } catch (error) {
    console.error('Error fetching monthly expense summary:', error)
    return []
  }
}

// Get expense category breakdown
export async function getExpenseCategoryBreakdown(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryReportData[]> {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        church: { clerkOrgId: churchId },
        expenseDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['APPROVED', 'PENDING']
        }
      },
      select: {
        amount: true,
        category: true
      }
    })

    // Group by category
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += parseFloat(expense.amount.toString())
      return acc
    }, {} as Record<string, number>)

    // Calculate percentages
    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
    
    const categoryData = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))

    return categoryData
  } catch (error) {
    console.error('Error fetching expense category breakdown:', error)
    return []
  }
}

// Get expense summary
export async function getExpenseSummary(
  churchId: string,
  startDate: Date,
  endDate: Date
): Promise<ReportSummary> {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        church: { clerkOrgId: churchId },
        expenseDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['APPROVED', 'PENDING']
        }
      },
      select: {
        amount: true
      }
    })

    const donations = await prisma.donationTransaction.findMany({
      where: {
        church: { clerkOrgId: churchId },
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['succeeded', 'succeeded\n']
        }
      },
      select: {
        amount: true
      }
    })

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    const totalDonations = donations.reduce((sum, d) => sum + parseFloat(d.amount.toString()) / 100, 0)
    const average = expenses.length > 0 ? totalExpenses / expenses.length : 0
    const netIncome = totalDonations - totalExpenses

    return {
      total: totalExpenses,
      average,
      netIncome
    }
  } catch (error) {
    console.error('Error fetching expense summary:', error)
    return { total: 0, average: 0, netIncome: 0 }
  }
}

// Get all transactions for export
export async function getTransactionsForExport(
  churchId: string,
  type: 'donations' | 'expenses',
  startDate: Date,
  endDate: Date
) {
  try {
    if (type === 'donations') {
      const donations = await prisma.donationTransaction.findMany({
        where: {
          church: { clerkOrgId: churchId },
          transactionDate: {
            gte: startDate,
            lte: endDate
          },
          status: {
          in: ['succeeded', 'succeeded\n']
        }
        },
        include: {
          donationType: true,
          donor: true
        },
        orderBy: {
          transactionDate: 'desc'
        }
      })

      return donations.map(d => ({
        date: d.transactionDate,
        description: d.donor ? `${d.donor.firstName} ${d.donor.lastName}` : d.donorName || 'Anonymous',
        category: d.donationType.name,
        amount: parseFloat(d.amount.toString()) / 100,
        paymentMethod: d.paymentMethodType
      }))
    } else {
      const expenses = await prisma.expense.findMany({
        where: {
          church: { clerkOrgId: churchId },
          expenseDate: {
            gte: startDate,
            lte: endDate
          },
          status: {
          in: ['APPROVED', 'PENDING']
        }
        },
        orderBy: {
          expenseDate: 'desc'
        }
      })

      return expenses.map(e => ({
        date: e.expenseDate,
        description: e.vendor || e.description || 'Expense',
        category: e.category,
        amount: parseFloat(e.amount.toString())
      }))
    }
  } catch (error) {
    console.error('Error fetching transactions for export:', error)
    return []
  }
}