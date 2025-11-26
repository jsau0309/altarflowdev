"use client"


import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { useOrganization } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { ReportFilters } from "./report-filters"
import { ReportSummary } from "./report-summary"
import { MonthlyBarChart } from "./monthly-bar-chart"
import { CategoryPieChart } from "./category-pie-chart"
import { exportToPDF } from "./export/pdf-exporter"
import { exportToCSV } from "./export/csv-exporter"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { FinancialAnalysisContent } from "./financial/financial-analysis-content"
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
  getDonationTypesForFilter,
  getExpenseCategoriesForFilter,
  type MonthlyReportData,
  type CategoryReportData,
  type ReportSummary as ReportSummaryType,
  type DonationTypeForFilter,
  type ExpenseCategoryForFilter
} from "@/lib/actions/reports.actions"
import { startOfYear, endOfDay } from "date-fns"
import { toast } from "sonner"

// Types
export interface DateRange {
  from: Date | null
  to: Date | null
}

export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common', 'donations', 'settings'])
  const { organization } = useOrganization()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL or default to 'donations'
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'expenses' || tabParam === 'financial') {
      return tabParam
    }
    return 'donations'
  }
  
  // State
  const [activeTab, setActiveTab] = useState<'donations' | 'expenses' | 'financial'>(getInitialTab())
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: endOfDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)) // Last day of current month at 23:59:59.999
  })
  const [donationTypes, setDonationTypes] = useState<DonationTypeForFilter[]>([])
  const [selectedDonationType, setSelectedDonationType] = useState<string | null>(null)
  const [selectedDonationTypeName, setSelectedDonationTypeName] = useState<string | null>(null)

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryForFilter[]>([])
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null)
  const [selectedExpenseCategoryName, setSelectedExpenseCategoryName] = useState<string | null>(null)

  // Fetch donation types and expense categories on mount
  useEffect(() => {
    const fetchFilters = async () => {
      if (organization?.id) {
        const [types, categories] = await Promise.all([
          getDonationTypesForFilter(organization.id),
          getExpenseCategoriesForFilter(organization.id)
        ])
        setDonationTypes(types)
        setExpenseCategories(categories)
      }
    }
    fetchFilters()
  }, [organization?.id])

  // Sync tab state with URL when using browser navigation
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl === 'donations' || tabFromUrl === 'expenses' || tabFromUrl === 'financial') {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(true) // Start with loading to show skeletons on mount
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [isFinancialLoading, setIsFinancialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryReportData[]>([])
  const [summaryData, setSummaryData] = useState<ReportSummaryType>({
    total: 0,
    average: 0,
    count: 0
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[]>([]) // For exports
  
  // Track if data has been loaded for current parameters
  const [lastFetchParams, setLastFetchParams] = useState<string>('')
  const [lastActiveTab, setLastActiveTab] = useState<string>(activeTab)
  
  // Fetch data when tab or date range changes
  useEffect(() => {
    if (organization && dateRange.from && dateRange.to) {
      // Skip fetching for financial tab - it manages its own data
      if (activeTab === 'financial') {
        setLastActiveTab(activeTab)
        return
      }
      
      // Create a unique key for the current fetch parameters
      const filterParam = activeTab === 'donations' ? selectedDonationType : selectedExpenseCategory
      const fetchKey = `${organization.id}-${activeTab}-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}-${filterParam || 'all'}`

      // Check if tab changed
      const tabChanged = activeTab !== lastActiveTab

      // Only fetch if parameters have changed
      if (fetchKey !== lastFetchParams) {
        fetchReportData(tabChanged)
        setLastFetchParams(fetchKey)
        setLastActiveTab(activeTab)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange, organization, selectedDonationType, selectedExpenseCategory, lastFetchParams, lastActiveTab]) // fetchReportData intentionally excluded to prevent infinite loop
  
  const fetchReportData = async (_isTabChange: boolean = false) => {
    // Always show loading when fetching new data
    setIsLoading(true)
    setError(null)
    
    try {
      if (!organization?.slug || !dateRange.from || !dateRange.to) {
        // Debug logging removed: missing required data for report generation
        return
      }
      
      
      // For YTD bar chart, always fetch from January of current year
      const yearStart = startOfYear(new Date())
      
      // Skip data fetching for financial tab - it has its own data fetching
      if (activeTab === 'financial') {
        return
      }
      
      if (activeTab === 'donations') {
        // Fetch all donation data in parallel
        const [monthly, categories, summary, exportData] = await Promise.all([
          getMonthlyDonationSummary(organization.id, yearStart, dateRange.to, selectedDonationType || undefined),
          getDonationCategoryBreakdown(organization.id, dateRange.from, dateRange.to, selectedDonationType || undefined),
          getDonationSummary(organization.id, dateRange.from, dateRange.to, selectedDonationType || undefined),
          getTransactionsForExport(organization.id, 'donations', dateRange.from, dateRange.to, selectedDonationType || undefined)
        ])
        
        
        setMonthlyData(monthly)
        setCategoryData(categories)
        setSummaryData(summary)
        setTransactions(exportData)
      } else {
        // Fetch all expense data in parallel
        const [monthly, categories, summary, exportData] = await Promise.all([
          getMonthlyExpenseSummary(organization.id, yearStart, dateRange.to, selectedExpenseCategory || undefined),
          getExpenseCategoryBreakdown(organization.id, dateRange.from, dateRange.to, selectedExpenseCategory || undefined),
          getExpenseSummary(organization.id, dateRange.from, dateRange.to, selectedExpenseCategory || undefined),
          getTransactionsForExport(organization.id, 'expenses', dateRange.from, dateRange.to, undefined, selectedExpenseCategory || undefined)
        ])


        setMonthlyData(monthly)
        setCategoryData(categories)
        setSummaryData(summary)
        setTransactions(exportData)
      }
    } catch (err) {
      console.error('Error fetching report data', { operation: 'ui.report.fetch_error' }, err instanceof Error ? err : new Error(String(err)))
      setError(t('common:errors.fetchFailed'))
    } finally {
      setIsLoading(false)
      setIsFilterLoading(false)
    }
  }
  
  const handleDateRangeChange = (newRange: DateRange) => {
    // Set loading for all tabs to keep date picker open
    if (activeTab === 'financial') {
      setIsFinancialLoading(true)
    } else {
      setIsFilterLoading(true)
    }
    setDateRange(newRange)
  }

  const handleDonationTypeChange = (donationTypeId: string | null) => {
    setSelectedDonationType(donationTypeId)
    // Find and store the donation type name for export filename
    if (donationTypeId) {
      const donationType = donationTypes.find(dt => dt.id === donationTypeId)
      setSelectedDonationTypeName(donationType?.name || null)
    } else {
      setSelectedDonationTypeName(null)
    }

    // Set loading when filter changes
    if (activeTab !== 'financial') {
      setIsFilterLoading(true)
    }
  }

  const handleExpenseCategoryChange = (categoryId: string | null) => {
    setSelectedExpenseCategory(categoryId)
    // Find and store the expense category name for export filename
    if (categoryId) {
      const category = expenseCategories.find(cat => cat.id === categoryId)
      setSelectedExpenseCategoryName(category?.name || null)
    } else {
      setSelectedExpenseCategoryName(null)
    }

    // Set loading when filter changes
    if (activeTab !== 'financial') {
      setIsFilterLoading(true)
    }
  }
  
  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!organization?.name || !dateRange.from || !dateRange.to) return
    
    // Handle Financial tab export
    if (activeTab === 'financial') {
      // Import the financial exporters dynamically
      const { exportFinancialToPDF } = await import('./export/financial-pdf-exporter')
      const { exportFinancialToCSV } = await import('./export/financial-csv-exporter')
      
      // Fetch financial data for export
      try {
        const response = await fetch('/api/reports/financial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            churchId: organization.id,
            dateRange: {
              from: dateRange.from.toISOString(),
              to: dateRange.to.toISOString()
            }
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch financial data')
        }
        
        const data = await response.json()
        
        const exportData = {
          summary: data.summary || {},
          feeCoverageAnalytics: data.feeCoverageAnalytics || {},
          payouts: data.payouts || [],
          dateRange,
          churchName: organization.name,
          t
        }
        
        if (format === 'pdf') {
          exportFinancialToPDF(exportData)
        } else {
          exportFinancialToCSV(exportData)
        }
        
        toast.success(t('reports:exportSuccess'))
      } catch (error) {
        console.error('Error exporting financial data:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        toast.error(t('reports:exportError'))
      }
      return
    }
    
    // Handle Donations/Expenses export (existing code)
    const exportData = {
      data: transactions,
      summary: summaryData,
      type: activeTab as 'donations' | 'expenses',
      dateRange,
      churchName: organization.name,
      donationTypeName: activeTab === 'donations' ? selectedDonationTypeName : selectedExpenseCategoryName,
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
            donationTypes={donationTypes}
            selectedDonationType={selectedDonationType}
            onDonationTypeChange={handleDonationTypeChange}
            expenseCategories={expenseCategories}
            selectedExpenseCategory={selectedExpenseCategory}
            onExpenseCategoryChange={handleExpenseCategoryChange}
            activeTab={activeTab}
            isLoading={activeTab === 'financial' ? isFinancialLoading : isFilterLoading}
          />

          {/* Only show export button on Donations and Expenses tabs */}
          {activeTab !== 'financial' && (
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
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => {
    setActiveTab(v as 'donations' | 'expenses' | 'financial')
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', v)
    router.push(`?${params.toString()}`, { scroll: false })
  }} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="donations">{t('reports:donationReports')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('reports:expenseReports')}</TabsTrigger>
          <TabsTrigger value="financial">{t('reports:financialAnalysis')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-6">
          {activeTab === 'financial' ? (
            <FinancialAnalysisContent 
              dateRange={dateRange} 
              onLoadingChange={setIsFinancialLoading}
            />
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : (
            <>
              <ReportSummary 
                type={activeTab as 'donations' | 'expenses'}
                data={summaryData}
                loading={isLoading || isFilterLoading}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyBarChart 
                  data={monthlyData}
                  title={activeTab === 'donations' ? t('reports:donationTrends') : t('reports:expenseTrends')}
                  loading={isLoading || isFilterLoading}
                />
                
                <CategoryPieChart
                  data={categoryData}
                  title={activeTab === 'donations' ? t('reports:donationsByFund') : t('reports:expenseCategories')}
                  loading={isLoading || isFilterLoading}
                  type={activeTab as 'donations' | 'expenses'}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}