"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

export interface FeeBreakdownData {
  name: string
  value: number
  percentage: number
}

interface FeeBreakdownChartProps {
  data: FeeBreakdownData[]
  isLoading?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function FeeBreakdownChart({ data, isLoading }: FeeBreakdownChartProps) {
  const { t } = useTranslation(['reports'])
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm mt-1">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.percentage.toFixed(1)}% of total fees
          </p>
        </div>
      )
    }
    return null
  }
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    if (percent < 0.05) return null // Don't show label if less than 5%
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  // Map fee types to translated names
  const getTranslatedFeeName = (name: string) => {
    const feeNameMap: { [key: string]: string } = {
      'Card Fees': t('reports:financial.cardFees'),
      'ACH Fees': t('reports:financial.achFees'),
      'International Fees': t('reports:financial.internationalFees'),
      'Dispute Fees': t('reports:financial.disputeFees'),
      'Other Fees': t('reports:financial.otherFees')
    }
    return feeNameMap[name] || name
  }
  
  const translatedData = data.map(item => ({
    ...item,
    name: getTranslatedFeeName(item.name)
  }))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports:financial.feeBreakdown')}</CardTitle>
        <CardDescription>{t('reports:financial.feeBreakdownSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('reports:financial.noDataAvailable')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={translatedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {translatedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm">
                    {value} ({formatCurrency(entry.payload.value)})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}