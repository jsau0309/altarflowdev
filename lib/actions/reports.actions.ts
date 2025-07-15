"use server"

import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns'

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

// Get top donors this month
export async function getTopDonorsThisMonth(churchId: string) {
  try {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    
    const topDonors = await prisma.donationTransaction.groupBy({
      by: ['donorId'],
      where: {
        churchId,
        transactionDate: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        },
        status: { in: ['succeeded', 'succeeded\n'] },
        donorId: { not: null }
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 3
    })
    
    // Get donor details
    const donorDetails = await Promise.all(
      topDonors.map(async (donor) => {
        const donorInfo = await prisma.donor.findUnique({
          where: { id: donor.donorId! },
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        })
        
        return {
          donorId: donor.donorId,
          name: donorInfo ? `${donorInfo.firstName} ${donorInfo.lastName}` : 'Anonymous',
          email: donorInfo?.email || '',
          totalAmount: (donor._sum.amount || 0) / 100,
          donationCount: donor._count.id
        }
      })
    )
    
    return donorDetails
  } catch (error) {
    console.error('Error fetching top donors:', error)
    return []
  }
}

// Get most used payment method this month
export async function getMostUsedPaymentMethodThisMonth(churchId: string) {
  try {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    
    const paymentMethods = await prisma.donationTransaction.groupBy({
      by: ['paymentMethodType'],
      where: {
        churchId,
        transactionDate: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        },
        status: { in: ['succeeded', 'succeeded\n'] }
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })
    
    if (paymentMethods.length === 0) return null
    
    const totalTransactions = paymentMethods.reduce((sum, pm) => sum + pm._count.id, 0)
    
    return {
      paymentMethod: paymentMethods[0].paymentMethodType || 'Unknown',
      count: paymentMethods[0]._count.id,
      percentage: Math.round((paymentMethods[0]._count.id / totalTransactions) * 100),
      allMethods: paymentMethods.map(pm => ({
        method: pm.paymentMethodType || 'Unknown',
        count: pm._count.id,
        percentage: Math.round((pm._count.id / totalTransactions) * 100)
      }))
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return null
  }
}

// Get biggest donation this month
export async function getBiggestDonationThisMonth(churchId: string) {
  try {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    
    const biggestDonation = await prisma.donationTransaction.findFirst({
      where: {
        churchId,
        transactionDate: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        },
        status: { in: ['succeeded', 'succeeded\n'] }
      },
      orderBy: {
        amount: 'desc'
      },
      include: {
        donor: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        donationType: {
          select: {
            name: true
          }
        }
      }
    })
    
    if (!biggestDonation) return null
    
    return {
      amount: parseFloat(biggestDonation.amount.toString()) / 100,
      donorName: biggestDonation.donor 
        ? `${biggestDonation.donor.firstName} ${biggestDonation.donor.lastName}`
        : biggestDonation.donorName || 'Anonymous',
      donationType: biggestDonation.donationType.name,
      date: biggestDonation.transactionDate,
      paymentMethod: biggestDonation.paymentMethodType
    }
  } catch (error) {
    console.error('Error fetching biggest donation:', error)
    return null
  }
}

// Get expense trend data for last 6 months
export async function getExpenseTrendData(churchId: string) {
  try {
    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5) // 5 because we include current month
    
    const expenses = await prisma.expense.findMany({
      where: {
        churchId,
        expenseDate: {
          gte: startOfMonth(sixMonthsAgo)
        },
        status: { in: ['APPROVED', 'PENDING'] }
      },
      select: {
        expenseDate: true,
        amount: true,
        category: true
      }
    })
    
    // Group by month
    const monthlyData: Record<string, { total: number; count: number; categories: Record<string, number> }> = {}
    
    expenses.forEach(expense => {
      const monthKey = format(expense.expenseDate, 'yyyy-MM')
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0, categories: {} }
      }
      
      const amount = parseFloat(expense.amount.toString())
      monthlyData[monthKey].total += amount
      monthlyData[monthKey].count += 1
      
      if (!monthlyData[monthKey].categories[expense.category]) {
        monthlyData[monthKey].categories[expense.category] = 0
      }
      monthlyData[monthKey].categories[expense.category] += amount
    })
    
    // Generate all months (including empty ones)
    const trendData = []
    const currentDate = new Date(sixMonthsAgo)
    
    while (currentDate <= now) {
      const monthKey = format(currentDate, 'yyyy-MM')
      const monthLabel = format(currentDate, 'MMM yyyy')
      const data = monthlyData[monthKey] || { total: 0, count: 0, categories: {} }
      
      trendData.push({
        month: monthLabel,
        totalExpenses: data.total,
        expenseCount: data.count,
        topCategory: Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
        categories: data.categories
      })
      
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    return trendData
  } catch (error) {
    console.error('Error fetching expense trend:', error)
    return []
  }
}

// Get donation trend data for last 6 months
export async function getDonationTrendData(churchId: string) {
  try {
    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5) // 5 because we include current month
    
    const donations = await prisma.donationTransaction.findMany({
      where: {
        churchId,
        transactionDate: {
          gte: startOfMonth(sixMonthsAgo)
        },
        status: { in: ['succeeded', 'succeeded\n'] }
      },
      select: {
        transactionDate: true,
        amount: true,
        isRecurring: true,
        donationType: {
          select: {
            name: true
          }
        }
      }
    })
    
    // Group by month
    const monthlyData: Record<string, { 
      total: number; 
      count: number; 
      recurringCount: number;
      types: Record<string, number> 
    }> = {}
    
    donations.forEach(donation => {
      const monthKey = format(donation.transactionDate, 'yyyy-MM')
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0, recurringCount: 0, types: {} }
      }
      
      const amount = parseFloat(donation.amount.toString()) / 100
      monthlyData[monthKey].total += amount
      monthlyData[monthKey].count += 1
      
      if (donation.isRecurring) {
        monthlyData[monthKey].recurringCount += 1
      }
      
      const typeName = donation.donationType.name
      if (!monthlyData[monthKey].types[typeName]) {
        monthlyData[monthKey].types[typeName] = 0
      }
      monthlyData[monthKey].types[typeName] += amount
    })
    
    // Generate all months (including empty ones)
    const trendData = []
    const currentDate = new Date(sixMonthsAgo)
    
    while (currentDate <= now) {
      const monthKey = format(currentDate, 'yyyy-MM')
      const monthLabel = format(currentDate, 'MMM yyyy')
      const data = monthlyData[monthKey] || { total: 0, count: 0, recurringCount: 0, types: {} }
      
      trendData.push({
        month: monthLabel,
        totalDonations: data.total,
        donationCount: data.count,
        recurringPercentage: data.count > 0 ? Math.round((data.recurringCount / data.count) * 100) : 0,
        topType: Object.entries(data.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
        types: data.types
      })
      
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    return trendData
  } catch (error) {
    console.error('Error fetching donation trend:', error)
    return []
  }
}

// Get active member list
export async function getActiveMemberList(churchId: string) {
  try {
    const activeMembers = await prisma.member.findMany({
      where: {
        churchId,
        membershipStatus: { in: ['Member', 'Visitor'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        membershipStatus: true,
        joinDate: true
      },
      orderBy: {
        joinDate: 'desc'
      },
      take: 20 // Limit to 20 most recent for performance
    })
    
    return activeMembers.map(member => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      email: member.email || '',
      phone: member.phone || '',
      status: member.membershipStatus,
      joinDate: member.joinDate,
      memberSince: member.joinDate ? format(member.joinDate, 'MMM yyyy') : 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching active members:', error)
    return []
  }
}

// Get visitor list (recent visitors)
export async function getVisitorList(churchId: string) {
  try {
    const thirtyDaysAgo = subMonths(new Date(), 1)
    
    const recentVisitors = await prisma.member.findMany({
      where: {
        churchId,
        membershipStatus: 'Visitor',
        joinDate: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        joinDate: true,
        notes: true
      },
      orderBy: {
        joinDate: 'desc'
      }
    })
    
    return recentVisitors.map(visitor => ({
      id: visitor.id,
      name: `${visitor.firstName} ${visitor.lastName}`,
      email: visitor.email || '',
      phone: visitor.phone || '',
      visitDate: visitor.joinDate,
      visitDateFormatted: visitor.joinDate ? format(visitor.joinDate, 'MMM d, yyyy') : 'Unknown',
      notes: visitor.notes || ''
    }))
  } catch (error) {
    console.error('Error fetching visitors:', error)
    return []
  }
}

// Get AI summary data for the dashboard
export async function getAiSummaryData(churchId: string) {
  try {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    const thisYearStart = startOfYear(now)
    
    // Get church details
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId },
      select: { name: true, id: true }
    })
    
    if (!church) {
      throw new Error('Church not found')
    }
    
    // Fetch all data in parallel
    const [
      // Donations this month
      donationsThisMonth,
      // Donations last month
      donationsLastMonth,
      // Donations YTD
      donationsYTD,
      // Expenses this month
      expensesThisMonth,
      // Expenses last month  
      expensesLastMonth,
      // Expenses YTD
      expensesYTD,
      // New members this month
      newMembersThisMonth,
      // Total active members
      totalActiveMembers,
      // Recent donations for payment method analysis
      recentDonations
    ] = await Promise.all([
      // Donations queries
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisMonthStart, lte: thisMonthEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisYearStart },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      
      // Expenses queries
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: thisMonthStart, lte: thisMonthEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: thisYearStart },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      
      // Members queries
      prisma.member.count({
        where: {
          churchId: church.id,
          joinDate: { gte: thisMonthStart }
        }
      }),
      prisma.member.count({
        where: {
          churchId: church.id,
          membershipStatus: { in: ['Member', 'Visitor'] }
        }
      }),
      
      // Recent donations for analysis
      prisma.donationTransaction.findMany({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisMonthStart },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        select: {
          amount: true,
          paymentMethodType: true,
          isRecurring: true
        },
        take: 100
      })
    ])
    
    // Calculate donation insights
    const donationsThisMonthTotal = (donationsThisMonth._sum.amount || 0) / 100
    const donationsLastMonthTotal = (donationsLastMonth._sum.amount || 0) / 100
    const donationsYTDTotal = (donationsYTD._sum.amount || 0) / 100
    
    // Calculate expense insights
    const expensesThisMonthTotal = parseFloat(expensesThisMonth._sum.amount?.toString() || '0')
    const expensesLastMonthTotal = parseFloat(expensesLastMonth._sum.amount?.toString() || '0')
    const expensesYTDTotal = parseFloat(expensesYTD._sum.amount?.toString() || '0')
    
    // Calculate payment method breakdown
    const paymentMethodCounts = recentDonations.reduce((acc, d) => {
      const method = d.paymentMethodType || 'unknown'
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Count recurring donations
    const recurringCount = recentDonations.filter(d => d.isRecurring).length
    const recurringPercentage = recentDonations.length > 0 ? 
      Math.round((recurringCount / recentDonations.length) * 100) : 0
    
    return {
      churchName: church.name,
      currentMonth: format(now, 'MMMM yyyy'),
      donations: {
        thisMonth: {
          total: donationsThisMonthTotal,
          count: donationsThisMonth._count.id,
          changeFromLastMonth: donationsLastMonthTotal > 0 ? 
            ((donationsThisMonthTotal - donationsLastMonthTotal) / donationsLastMonthTotal) * 100 : 0,
          differenceFromLastMonth: donationsThisMonthTotal - donationsLastMonthTotal
        },
        lastMonth: {
          total: donationsLastMonthTotal,
          count: donationsLastMonth._count.id
        },
        yearToDate: {
          total: donationsYTDTotal,
          count: donationsYTD._count.id
        },
        recurringPercentage,
        paymentMethods: paymentMethodCounts
      },
      expenses: {
        thisMonth: {
          total: expensesThisMonthTotal,
          count: expensesThisMonth._count.id,
          changeFromLastMonth: expensesLastMonthTotal > 0 ?
            ((expensesThisMonthTotal - expensesLastMonthTotal) / expensesLastMonthTotal) * 100 : 0,
          differenceFromLastMonth: expensesThisMonthTotal - expensesLastMonthTotal
        },
        lastMonth: {
          total: expensesLastMonthTotal,
          count: expensesLastMonth._count.id
        },
        yearToDate: {
          total: expensesYTDTotal,
          count: expensesYTD._count.id
        },
        netIncome: donationsThisMonthTotal - expensesThisMonthTotal
      },
      members: {
        newThisMonth: newMembersThisMonth,
        totalActive: totalActiveMembers
      }
    }
  } catch (error) {
    console.error('Error fetching AI summary data:', error)
    throw error
  }
}