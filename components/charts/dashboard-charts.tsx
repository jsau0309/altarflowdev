"use client"

import { useEffect, useRef } from "react"
import { format, subDays } from "date-fns"
import Chart from "chart.js/auto"
import { useTranslation } from "react-i18next"

// Define basic types if not already defined elsewhere
interface Donation {
    date: string | Date;
    amount: number;
    method?: string;
}

interface Expense {
    date: string | Date;
    amount: number;
    category?: string;
}

// interface Campaign {
//     id: string;
//     name: string;
//     isActive: boolean;
// }

interface DashboardChartsProps {
    donations: Donation[];
    expenses: Expense[];
    // campaigns: Campaign[];
    timeRange: string;
    onTimeRangeChange?: (value: string) => void;
}

export function DashboardCharts({ donations: initialDonations, expenses: initialExpenses, /* campaigns, */ timeRange }: DashboardChartsProps) {
  // Load charts namespace
  const { t } = useTranslation('charts');
  const financialChartRef = useRef<HTMLCanvasElement | null>(null)
  const campaignChartRef = useRef<HTMLCanvasElement | null>(null)
  const financialChartInstance = useRef<Chart | null>(null)
  const campaignChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    // Use passed-in props, filter based on timeRange
    // TODO: Implement actual filtering based on timeRange prop
    const donations: Donation[] = initialDonations;
    const expenses: Expense[] = initialExpenses;

    // Get dates for the last 7 days (or based on timeRange)
    // This logic needs adjustment based on timeRange
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      return format(date, "MMM d")
    })

    // Format dates as "Apr 1", "Apr 2", etc. (Adjust based on timeRange)
    const formattedDates = dates.map((_, i) => `Apr ${i + 1}`) // Placeholder

    // Prepare data for financial chart (donations vs expenses)
    const donationsByDate = Array(formattedDates.length).fill(0)
    const expensesByDate = Array(formattedDates.length).fill(0)

    // Fill in actual data (using prop data)
    donations.forEach((donation: Donation) => {
      const date = new Date(donation.date)
      // TODO: Improve date mapping based on formattedDates/timeRange
      const dayIndex = date.getDate() % formattedDates.length // Simple mapping for demo
      if (dayIndex >= 0 && dayIndex < formattedDates.length) {
        donationsByDate[dayIndex] += donation.amount
      }
    })

    expenses.forEach((expense: Expense) => {
      const date = new Date(expense.date)
      // TODO: Improve date mapping based on formattedDates/timeRange
      const dayIndex = date.getDate() % formattedDates.length // Simple mapping for demo
      if (dayIndex >= 0 && dayIndex < formattedDates.length) {
        expensesByDate[dayIndex] += expense.amount
      }
    })

    // Campaign data - Needs real data source
    // const campaigns = [] // Placeholder
    const campaignNames = [t('charts:dashboardCharts.campaign.ofrendas'), t('charts:dashboardCharts.campaign.diezmo')]
    const campaignProgress = [60, 100] // Example progress values for MVP

    // Create financial chart
    if (financialChartRef.current) {
      if (financialChartInstance.current) {
        financialChartInstance.current.destroy()
      }

      const ctx = financialChartRef.current.getContext("2d")

      if (ctx) {
        // Add gradient for donations line
        const donationsGradient = ctx.createLinearGradient(0, 0, 0, 400)
        donationsGradient.addColorStop(0, "rgba(75, 192, 192, 0.2)")
        donationsGradient.addColorStop(1, "rgba(75, 192, 192, 0)")

        // Add gradient for expenses line
        const expensesGradient = ctx.createLinearGradient(0, 0, 0, 400)
        expensesGradient.addColorStop(0, "rgba(255, 99, 132, 0.2)")
        expensesGradient.addColorStop(1, "rgba(255, 99, 132, 0)")

        financialChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: formattedDates,
            datasets: [
              {
                label: t('charts:dashboardCharts.donations'),
                data: donationsByDate,
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: donationsGradient,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "rgb(75, 192, 192)",
              },
              {
                label: t('charts:dashboardCharts.expenses'),
                data: expensesByDate,
                borderColor: "rgb(255, 99, 132)",
                backgroundColor: expensesGradient,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "rgb(255, 99, 132)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                align: "center",
                labels: {
                  boxWidth: 15,
                  usePointStyle: true,
                  pointStyle: "circle",
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
              title: {
                display: true,
                text: t('charts:dashboardCharts.donVsExpTitle'),
                font: {
                  size: 14,
                  weight: "normal",
                },
                padding: {
                  top: 10,
                  bottom: 20,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value: number | string) => "$" + value,
                  font: {
                    size: 12,
                  },
                },
                grid: {
                  color: "rgba(0, 0, 0, 0.05)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.05)",
                },
                ticks: {
                  font: {
                    size: 12,
                  },
                },
              },
            },
          },
        })
      }
    }

    // Create campaign chart
    if (campaignChartRef.current) {
      if (campaignChartInstance.current) {
        campaignChartInstance.current.destroy()
      }

      campaignChartInstance.current = new Chart(campaignChartRef.current, {
        type: "bar",
        data: {
          labels: campaignNames,
          datasets: [
            {
              label: t('charts:dashboardCharts.progress'),
              data: campaignProgress,
              backgroundColor: campaignProgress.map((progress) => {
                if (progress >= 100) return "rgba(75, 192, 192, 0.7)" // Teal for 100%
                return "rgba(255, 206, 86, 0.7)" // Yellow for others
              }),
              borderColor: campaignProgress.map((progress) => {
                if (progress >= 100) return "rgba(75, 192, 192, 1)" // Teal for 100%
                return "rgba(255, 206, 86, 1)" // Yellow for others
              }),
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: t('charts:dashboardCharts.campaignTitle'),
              font: {
                size: 14,
                weight: "normal",
              },
              padding: {
                top: 10,
                bottom: 20,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value: number | string) => value + "%",
                font: {
                  size: 12,
                },
              },
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  size: 10,
                },
                maxRotation: 45,
                minRotation: 45,
              },
            },
          },
        },
      })
    }

    return () => {
      if (financialChartInstance.current) {
        financialChartInstance.current.destroy()
      }
      if (campaignChartInstance.current) {
        campaignChartInstance.current.destroy()
      }
    }
  }, [initialDonations, initialExpenses, timeRange, t]) // Add t to dependency array

  return (
    <>
      <div className="w-full h-[200px]">
        <canvas ref={financialChartRef} />
      </div>
      <div className="w-full h-[200px] mt-6">
        <canvas ref={campaignChartRef} />
      </div>
    </>
  )
}
