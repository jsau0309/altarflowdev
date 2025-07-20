"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { useOrganization } from "@clerk/nextjs"
import { ReportFilters } from "./report-filters"
import { ReportSummary } from "./report-summary"
import { MonthlyBarChart } from "./monthly-bar-chart"
import { CategoryPieChart } from "./category-pie-chart"
import { exportToPDF } from "./export/pdf-exporter"
import { exportToCSV } from "./export/csv-exporter"
import LoaderOne from "@/components/ui/loader-one"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getMonthlyDonationSummary,
  getDonationCategoryBreakdown,
  getDonationSummary,
  getMonthlyExpenseSummary,
  getExpenseCategoryBreakdown,
  getExpenseSummary,
  getTransactionsForExport,
  type MonthlyReportData,
  type CategoryReportData,
  type ReportSummary as ReportSummaryType
} from "@/lib/actions/reports.actions"
import { startOfYear } from "date-fns"

// Types
export interface DateRange {
  from: Date | null
  to: Date | null
}

export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const { organization } = useOrganization()
  
  // State
  const [activeTab, setActiveTab] = useState<'donations' | 'expenses'>('donations')
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date() // Today
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryReportData[]>([])
  const [summaryData, setSummaryData] = useState<ReportSummaryType>({
    total: 0,
    average: 0,
    count: 0
  })
  const [transactions, setTransactions] = useState<any[]>([]) // For exports
  
  // Track if data has been loaded for current parameters
  const [lastFetchParams, setLastFetchParams] = useState<string>('')
  const [lastActiveTab, setLastActiveTab] = useState<string>(activeTab)
  
  // Fetch data when tab or date range changes
  useEffect(() => {
    if (organization && dateRange.from && dateRange.to) {
      // Create a unique key for the current fetch parameters
      const fetchKey = `${organization.id}-${activeTab}-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`
      
      // Check if tab changed
      const tabChanged = activeTab !== lastActiveTab
      
      // Only fetch if parameters have changed
      if (fetchKey !== lastFetchParams) {
        fetchReportData(tabChanged)
        setLastFetchParams(fetchKey)
        setLastActiveTab(activeTab)
      }
    }
  }, [activeTab, dateRange, organization, lastFetchParams, lastActiveTab])
  
  const fetchReportData = async (isTabChange: boolean = false) => {
    // Always show loading when switching tabs, otherwise only if no data
    if (isTabChange) {
      setIsLoading(true)
    } else {
      const hasData = monthlyData.length > 0 || categoryData.length > 0
      setIsLoading(!hasData)
    }
    setError(null)
    
    try {
      if (!organization?.slug || !dateRange.from || !dateRange.to) {
        // Debug logging removed: missing required data for report generation
        return
      }
      
      
      // For YTD bar chart, always fetch from January of current year
      const yearStart = startOfYear(new Date())
      
      if (activeTab === 'donations') {
        // Fetch all donation data in parallel
        const [monthly, categories, summary, exportData] = await Promise.all([
          getMonthlyDonationSummary(organization.id, yearStart, dateRange.to),
          getDonationCategoryBreakdown(organization.id, dateRange.from, dateRange.to),
          getDonationSummary(organization.id, dateRange.from, dateRange.to),
          getTransactionsForExport(organization.id, 'donations', dateRange.from, dateRange.to)
        ])
        
        
        setMonthlyData(monthly)
        setCategoryData(categories)
        setSummaryData(summary)
        setTransactions(exportData)
      } else {
        // Fetch all expense data in parallel
        const [monthly, categories, summary, exportData] = await Promise.all([
          getMonthlyExpenseSummary(organization.id, yearStart, dateRange.to),
          getExpenseCategoryBreakdown(organization.id, dateRange.from, dateRange.to),
          getExpenseSummary(organization.id, dateRange.from, dateRange.to),
          getTransactionsForExport(organization.id, 'expenses', dateRange.from, dateRange.to)
        ])
        
        
        setMonthlyData(monthly)
        setCategoryData(categories)
        setSummaryData(summary)
        setTransactions(exportData)
      }
    } catch (err) {
      console.error('Error fetching report data:', err)
      setError(t('common:errors.fetchFailed'))
    } finally {
      setIsLoading(false)
      setIsFilterLoading(false)
    }
  }
  
  const handleDateRangeChange = (newRange: DateRange) => {
    setIsFilterLoading(true)
    setDateRange(newRange)
  }
  
  const handleExport = (format: 'pdf' | 'csv') => {
    if (!organization?.name || !dateRange.from || !dateRange.to) return
    
    const exportData = {
      data: transactions,
      summary: summaryData,
      type: activeTab,
      dateRange,
      churchName: organization.name,
      t
    }
    
    if (format === 'pdf') {
      exportToPDF(exportData)
    } else {
      exportToCSV(exportData)
    }
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports:title')}</h1>
          <p className="text-muted-foreground">{t('reports:subtitle')}</p>
        </div>
        
        <div className="flex gap-2">
          <ReportFilters 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            isLoading={isFilterLoading}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                {t('common:export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                {t('reports:exportPDF')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t('reports:exportCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'donations' | 'expenses')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="donations">{t('reports:donationReports')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('reports:expenseReports')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <LoaderOne />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : (
            <>
              <ReportSummary 
                type={activeTab}
                data={summaryData}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyBarChart 
                  data={monthlyData}
                  title={activeTab === 'donations' ? t('reports:donationTrends') : t('reports:expenseTrends')}
                />
                
                <CategoryPieChart 
                  data={categoryData}
                  title={activeTab === 'donations' ? t('reports:donationsByFund') : t('reports:expenseCategories')}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}