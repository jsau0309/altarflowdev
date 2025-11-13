'use client'

import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryReportData } from '@/lib/actions/reports.actions'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

ChartJS.register(ArcElement, Tooltip, Legend)

interface CategoryPieChartProps {
  data: CategoryReportData[]
  title: string
  loading?: boolean
  type?: 'donations' | 'expenses'
}

// Define a color palette for the pie chart with Altarflow blue theme
const CHART_COLORS = [
  'rgba(59, 130, 246, 0.9)',   // Primary Altarflow Blue
  'rgba(96, 165, 250, 0.8)',   // Light Blue
  'rgba(37, 99, 235, 0.8)',    // Dark Blue
  'rgba(147, 197, 253, 0.8)',  // Lighter Blue
  'rgba(29, 78, 216, 0.8)',    // Darker Blue
  'rgba(191, 219, 254, 0.8)',  // Very Light Blue
  'rgba(30, 64, 175, 0.8)',    // Very Dark Blue
  'rgba(219, 234, 254, 0.8)'   // Ultra Light Blue
]

const CHART_BORDER_COLORS = [
  'rgb(59, 130, 246)',   // Primary Altarflow Blue
  'rgb(96, 165, 250)',   // Light Blue
  'rgb(37, 99, 235)',    // Dark Blue
  'rgb(147, 197, 253)',  // Lighter Blue
  'rgb(29, 78, 216)',    // Darker Blue
  'rgb(191, 219, 254)',  // Very Light Blue
  'rgb(30, 64, 175)',    // Very Dark Blue
  'rgb(219, 234, 254)'   // Ultra Light Blue
]

export function CategoryPieChart({ data, title, loading, type = 'donations' }: CategoryPieChartProps) {
  const { t } = useTranslation(['donations', 'expenses', 'settings'])

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    if (type === 'donations') {
      // Convert to lowercase and replace spaces with underscores for translation key
      const fundKey = category.toLowerCase().replace(/\s+/g, '_')
      // Try to translate as a fund first, fallback to original category name
      return t(`donations:funds.${fundKey}`, { defaultValue: category })
    } else {
      // For expenses, use the system expense categories translation
      return t(`settings:systemCategories.expenseCategories.${category}`, { defaultValue: category })
    }
  }

  // Helper function to convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number = 0.9): string => {
    // Remove # if present
    hex = hex.replace('#', '')

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // Use stored colors for expenses, default colors for donations
  const backgroundColor = type === 'expenses' && data.every(d => d.color)
    ? data.map(d => hexToRgba(d.color!, 0.9))
    : CHART_COLORS.slice(0, data.length)

  const borderColor = type === 'expenses' && data.every(d => d.color)
    ? data.map(d => d.color!)
    : CHART_BORDER_COLORS.slice(0, data.length)

  const chartData: ChartData<'pie'> = {
    labels: data.map(d => translateCategory(d.category)),
    datasets: [
      {
        data: data.map(d => d.amount),
        backgroundColor,
        borderColor,
        borderWidth: 1
      }
    ]
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          generateLabels: function(chart) {
            const data = chart.data
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0]
                const value = dataset.data[i] as number
                const percentage = data.datasets[0].data.reduce((a, b) => (a as number) + (b as number), 0) as number
                const percent = percentage > 0 ? Math.round((value / percentage) * 100) : 0
                
                return {
                  text: `${label} (${percent}%)`,
                  fillStyle: dataset.backgroundColor ? 
                    Array.isArray(dataset.backgroundColor) ? 
                      dataset.backgroundColor[i] : 
                      dataset.backgroundColor : 
                    'rgba(0,0,0,0)',
                  strokeStyle: dataset.borderColor ? 
                    Array.isArray(dataset.borderColor) ? 
                      dataset.borderColor[i] : 
                      dataset.borderColor : 
                    'rgba(0,0,0,0)',
                  lineWidth: dataset.borderWidth as number || 1,
                  hidden: false,
                  index: i
                }
              })
            }
            return []
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = formatCurrency(context.parsed)
            const dataset = context.dataset
            const total = dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number
            const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="relative w-[200px] h-[200px]">
              <Skeleton className="absolute inset-0 rounded-full" />
              <div className="absolute inset-8 bg-background rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Pie data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}