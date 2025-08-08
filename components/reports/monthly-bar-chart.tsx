'use client'

import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlyReportData } from '@/lib/actions/reports.actions'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface MonthlyBarChartProps {
  data: MonthlyReportData[]
  title: string
  loading?: boolean
}

export function MonthlyBarChart({ data, title, loading }: MonthlyBarChartProps) {
  const chartData: ChartData<'bar'> = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: title,
        data: data.map(d => d.amount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Altarflow blue
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(59, 130, 246, 1)'
      }
    ]
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(Number(value))
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
          <div className="h-[300px] space-y-4">
            <div className="flex justify-between items-end h-[250px]">
              {[...Array(12)].map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="w-[calc(100%/12-8px)]" 
                  style={{ height: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
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
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}