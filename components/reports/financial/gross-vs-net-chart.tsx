"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts"
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
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length >= 2 && label) {
      const grossValue = payload[0].value as number;
      const netValue = payload[1].value as number;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{format(new Date(label), 'MMM d, yyyy')}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="text-blue-500">Gross:</span> {formatCurrency(grossValue)}
            </p>
            <p className="text-sm">
              <span className="text-green-500">Net:</span> {formatCurrency(netValue)}
            </p>
            <p className="text-sm text-muted-foreground">
              Fees: {formatCurrency(grossValue - netValue)}
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
              <Tooltip content={CustomTooltip} />
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