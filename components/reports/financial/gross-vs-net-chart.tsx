"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export interface GrossVsNetData {
  date: string
  gross: number
  net: number
  fees: number
}

interface GrossVsNetChartProps {
  data: GrossVsNetData[]
  isLoading?: boolean
}

export function GrossVsNetChart({ data, isLoading }: GrossVsNetChartProps) {
  const { t } = useTranslation(['reports'])
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{format(new Date(label), 'MMM d, yyyy')}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="text-blue-500">Gross:</span> {formatCurrency(payload[0].value)}
            </p>
            <p className="text-sm">
              <span className="text-green-500">Net:</span> {formatCurrency(payload[1].value)}
            </p>
            <p className="text-sm text-muted-foreground">
              Fees: {formatCurrency(payload[0].value - payload[1].value)}
            </p>
          </div>
        </div>
      )
    }
    return null
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports:financial.grossVsNet')}</CardTitle>
        <CardDescription>{t('reports:financial.grossVsNetSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('reports:financial.noDataAvailable')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gross" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Gross Revenue"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Net Revenue"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}