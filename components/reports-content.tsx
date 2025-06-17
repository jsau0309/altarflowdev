"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { DonationCharts } from "./charts/donation-charts"
import { ExpenseCharts } from "./charts/expense-charts"
import { CampaignCharts } from "./charts/campaign-charts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LoaderOne from "@/components/ui/loader-one";
import { Donation, Expense, Campaign, Member } from "@/lib/types"

import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export function ReportsContent() {
  const pathname = usePathname()

  const [activeTab, setActiveTab] = useState("donations")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // State for data
  const [donations, setDonations] = useState<Donation[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Pagination state
  const [donationsPerPage, setDonationsPerPage] = useState(10)
  const [donationsCurrentPage, setDonationsCurrentPage] = useState(1)
  const [expensesPerPage, setExpensesPerPage] = useState(10)
  const [expensesCurrentPage, setExpensesCurrentPage] = useState(1)
  const [campaignsPerPage, setCampaignsPerPage] = useState(5)
  const [campaignsCurrentPage, setCampaignsCurrentPage] = useState(1)
  // Load required namespaces
  const { t, i18n } = useTranslation(['reports', 'common', 'donations', 'expenses', 'campaigns']);

  // Fetch data
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // TODO: Replace with actual API calls
      // For now, we'll just simulate a fetch
      setDonations([]);
      setExpenses([]);
      setCampaigns([]);
      setMembers([]);
      console.log("TODO: Fetch report data");
      setIsLoading(false);
    }, 500);
  }, [pathname, dateRange]);

  // Filter data based on date range
  const filteredDonations = donations.filter((donation) => {
    if (!dateRange.from && !dateRange.to) return true
    const donationDate = new Date(donation.donationDate)
    if (dateRange.from && dateRange.to) {
      return donationDate >= dateRange.from && donationDate <= dateRange.to
    } else if (dateRange.from) {
      return donationDate >= dateRange.from
    } else if (dateRange.to) {
      return donationDate <= dateRange.to
    }
    return true
  })

  const filteredExpenses = expenses.filter((expense) => {
    if (!dateRange.from && !dateRange.to) return true
    const expenseDate = new Date(expense.date)
    if (dateRange.from && dateRange.to) {
      return expenseDate >= dateRange.from && expenseDate <= dateRange.to
    } else if (dateRange.from) {
      return expenseDate >= dateRange.from
    } else if (dateRange.to) {
      return expenseDate <= dateRange.to
    }
    return true
  })

  const activeCampaigns = campaigns.filter((campaign: Campaign) => campaign.isActive && parseFloat(campaign.goalAmount || '0') > 0)

  // Calculate totals
  const totalDonations = filteredDonations.reduce((sum, donation) => sum + parseFloat(donation.amount || '0'), 0)
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  // Net income calculation
  const netIncome = totalDonations - totalExpenses

  // Pagination calculations
  const donationsTotalPages = Math.max(1, Math.ceil(filteredDonations.length / donationsPerPage))
  const expensesTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / expensesPerPage))
  const campaignsTotalPages = Math.max(1, Math.ceil(activeCampaigns.length / campaignsPerPage))

  // Reset to page 1 when filters change
  useEffect(() => {
    setDonationsCurrentPage(1)
    setExpensesCurrentPage(1)
    setCampaignsCurrentPage(1)
  }, [dateRange, donationsPerPage, expensesPerPage, campaignsPerPage])

  // Ensure current page is valid
  useEffect(() => {
    if (donationsCurrentPage > donationsTotalPages) {
      setDonationsCurrentPage(donationsTotalPages)
    }
    if (expensesCurrentPage > expensesTotalPages) {
      setExpensesCurrentPage(expensesTotalPages)
    }
    if (campaignsCurrentPage > campaignsTotalPages) {
      setCampaignsCurrentPage(campaignsTotalPages)
    }
  }, [
    donationsCurrentPage,
    donationsTotalPages,
    expensesCurrentPage,
    expensesTotalPages,
    campaignsCurrentPage,
    campaignsTotalPages,
  ])

  // Paginated data
  const paginatedDonations = filteredDonations.slice(
    (donationsCurrentPage - 1) * donationsPerPage,
    donationsCurrentPage * donationsPerPage,
  )

  const paginatedExpenses = filteredExpenses.slice(
    (expensesCurrentPage - 1) * expensesPerPage,
    expensesCurrentPage * expensesPerPage,
  )

  const paginatedCampaigns = activeCampaigns.slice(
    (campaignsCurrentPage - 1) * campaignsPerPage,
    campaignsCurrentPage * campaignsPerPage,
  )

  // Helper function to get donor name
  const getDonorName = (donorId: string | null | undefined) => {
    if (!donorId) return t('common:anonymous');
    const member = members.find((m) => m.id === donorId)
    return member ? `${member.firstName} ${member.lastName}` : t('common:anonymous')
  }

  // Helper function to get campaign name
  const getCampaignName = (campaignId: string | null | undefined) => {
    if (!campaignId) {
      return t('campaigns:general', 'General');
    }
    const campaign = campaigns.find((c: Campaign) => c.id === campaignId)
    return campaign ? campaign.name : t('campaigns:general', 'General')
  }

  // Helper function to format currency using i18n locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "USD", // TODO: Make dynamic
    }).format(amount)
  }

  // Helper function to format date using i18n locale
  const formatDate = (dateString: string) => {
    // Use require dynamically for date-fns locales
    const locale = i18n.language === 'es' ? require('date-fns/locale/es') : require('date-fns/locale/en-US');
    return format(new Date(dateString), "PPP", { locale })
  }

  // Helper function to format payment method/category
  const formatDisplayString = (key: string | undefined | null, namespace: 'donations' | 'expenses', prefix: string, fallback: string) => {
    const formattedKey = key?.toLowerCase().replace(/\s+|-/g, '') || '';
    if (!formattedKey) return fallback;
    const translationKey = `${namespace}:${prefix}.${formattedKey}`;
    const translated = t(translationKey, fallback);
    return translated === translationKey ? fallback : translated;
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Handle filter reset
  const handleResetFilter = () => {
    setDateRange({ from: undefined, to: undefined })
    setExportFormat("pdf")
    setIsFilterOpen(false)
  }

  // Handle export
  const handleExport = () => {
    console.log(`Exporting ${activeTab} report as ${exportFormat}`)
    console.log(
      `Date range: ${dateRange.from ? formatDate(dateRange.from.toISOString()) : "All"} to ${
        dateRange.to ? formatDate(dateRange.to.toISOString()) : "Present"
      }`,
    )
    // TODO: Implement actual export logic using jsPDF or papaparse
  }

  // Generate page numbers to display
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)
      if (currentPage <= 3) endPage = Math.min(totalPages - 1, 4)
      if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 3)
      if (startPage > 2) pages.push(-1) // Ellipsis start
      for (let i = startPage; i <= endPage; i++) pages.push(i)
      if (endPage < totalPages - 1) pages.push(-2) // Ellipsis end
      if (totalPages > 1) pages.push(totalPages)
    }
    return pages
  }

  // Pagination component (Internal, uses parent's t function)
  const InternalTablePagination = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    itemsPerPage: number
    onItemsPerPageChange: (value: number) => void
    totalItems: number
  }) => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="text-sm text-muted-foreground">
           {/* Use common namespace */}
           {t('common:pagination.showing', 
              { start: startItem, end: endItem, total: totalItems })}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              aria-label={t('common:pagination.first')} 
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label={t('common:pagination.previous')} 
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center">
              {getPageNumbers(currentPage, totalPages).map((page, index) => {
                if (page < 0) {
                  return <span key={`ellipsis-${index}`} className="px-2">...</span>
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(page)}
                    className="h-8 w-8"
                    aria-label={t('common:pagination.page', { page })}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label={t('common:pagination.next')} 
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label={t('common:pagination.last')}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
               {/* Use common namespace */}
              <SelectItem value="5">{t('common:pagination.perPage', { count: 5 })}</SelectItem>
              <SelectItem value="10">{t('common:pagination.perPage', { count: 10 })}</SelectItem>
              <SelectItem value="20">{t('common:pagination.perPage', { count: 20 })}</SelectItem>
              <SelectItem value="50">{t('common:pagination.perPage', { count: 50 })}</SelectItem>
              <SelectItem value="100">{t('common:pagination.perPage', { count: 100 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* Use reports namespace */}
          <h1 className="text-3xl font-bold tracking-tight">{t('reports:title')}</h1>
          <p className="text-muted-foreground">{t('reports:reportsContent.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <Filter className="h-4 w-4" />
                 {/* Use common namespace */}
                {t('common:filter')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                   {/* Use reports namespace */}
                  <h4 className="font-medium leading-none">{t('reports:timeFrame')}</h4>
                  <div className="flex flex-col gap-2">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 opacity-70" />
                        {/* Use reports namespace */}
                        <span className="text-sm">{t('reports:generateReportModal.customRange.from')}</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-from"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.from && "text-muted-foreground",
                            )}
                          >
                             {/* Use reports namespace */}
                            {dateRange.from ? formatDate(dateRange.from.toISOString()) : t('reports:generateReportModal.customRange.pickDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 opacity-70" />
                         {/* Use reports namespace */}
                        <span className="text-sm">{t('reports:generateReportModal.customRange.to')}</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-to"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.to && "text-muted-foreground",
                            )}
                          >
                             {/* Use reports namespace */}
                            {dateRange.to ? formatDate(dateRange.to.toISOString()) : t('reports:generateReportModal.customRange.pickDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                   {/* Use reports namespace */}
                  <h4 className="font-medium leading-none">{t('reports:reportsContent.exportFormatTitle')}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={exportFormat === "pdf" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("pdf")}
                      className="flex-1"
                    >
                       {/* Use reports namespace */}
                      {t('reports:exportPDF')}
                    </Button>
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("csv")}
                      className="flex-1"
                    >
                       {/* Use reports namespace */}
                      {t('reports:exportCSV')}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={handleResetFilter}>
                     {/* Use common namespace */}
                    {t('common:reset')}
                  </Button>
                  <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                     {/* Use common namespace */}
                    {t('common:apply')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button className="flex gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
             {/* Use common namespace */}
            {t('common:export')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="donations" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
           {/* Use reports namespace */}
          <TabsTrigger value="donations">{t('reports:reportsContent.tabs.donations')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('reports:reportsContent.tabs.expenses')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('reports:reportsContent.tabs.campaigns')}</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex justify-center items-center h-[500px] pt-4">
            <LoaderOne />
          </div>
        ) : (
          <>
        <TabsContent value="donations" className="space-y-4 pt-4">
          <DonationCharts
            donations={filteredDonations}
            startDate={dateRange.from}
            endDate={dateRange.to}
            campaigns={campaigns}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.donations.totalTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalDonations)}</div>
                <p className="text-xs text-muted-foreground">
                   {/* Use reports namespace */}
                  {t('reports:reportsContent.donations.totalSubtitle', { count: filteredDonations.length })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.donations.averageTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(filteredDonations.length ? totalDonations / filteredDonations.length : 0)}
                </div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.donations.averageSubtitle')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.donations.uniqueDonorsTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(filteredDonations.map((d: Donation) => d.memberId)).size}</div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.donations.uniqueDonorsSubtitle')}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
               {/* Use reports namespace */}
              <CardTitle>{t('reports:reportsContent.donations.recordsTitle')}</CardTitle>
              <CardDescription>
                 {/* Use reports and common namespaces */}
                {t('reports:reportsContent.showingCount', { count: filteredDonations.length })}
                {dateRange.from || dateRange.to
                  ? t('reports:reportsContent.dateRangeSuffix', {
                      start: dateRange.from ? formatDate(dateRange.from.toISOString()) : t('common:allTime'),
                      end: dateRange.to ? formatDate(dateRange.to.toISOString()) : t('common:present')
                    })
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                     {/* Use donations namespace */}
                    <TableHead>{t('donations:date')}</TableHead>
                    <TableHead>{t('donations:donor')}</TableHead>
                    <TableHead>{t('donations:campaign')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('donations:method')}</TableHead>
                    <TableHead className="text-right">{t('donations:amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDonations.length > 0 ? (
                    paginatedDonations.map((donation: Donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>{formatDate(donation.donationDate)}</TableCell>
                        <TableCell>{getDonorName(donation.memberId)}</TableCell>
                        <TableCell>{getCampaignName(donation.campaignId)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {t('common:notAvailable')}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(donation.amount))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                         {/* Use reports namespace */}
                        {t('reports:reportsContent.noDataPeriod')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredDonations.length > 0 && (
              <div className="border-t px-4">
                <InternalTablePagination
                  currentPage={donationsCurrentPage}
                  totalPages={donationsTotalPages}
                  onPageChange={setDonationsCurrentPage}
                  itemsPerPage={donationsPerPage}
                  onItemsPerPageChange={setDonationsPerPage}
                  totalItems={filteredDonations.length}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 pt-4">
          <ExpenseCharts
            expenses={filteredExpenses}
            startDate={dateRange.from}
            endDate={dateRange.to}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.expenses.totalTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                    {/* Use reports namespace */}
                   {t('reports:reportsContent.expenses.totalSubtitle', { count: filteredExpenses.length })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.expenses.averageTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(filteredExpenses.length ? totalExpenses / filteredExpenses.length : 0)}
                </div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.expenses.averageSubtitle')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.expenses.netIncomeTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(netIncome)}
                </div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.expenses.netIncomeSubtitle')}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
               {/* Use reports namespace */}
              <CardTitle>{t('reports:reportsContent.expenses.recordsTitle')}</CardTitle>
              <CardDescription>
                 {/* Use reports and common namespaces */}
                {t('reports:reportsContent.showingCountExpenses', { count: filteredExpenses.length })}
                 {dateRange.from || dateRange.to
                  ? t('reports:reportsContent.dateRangeSuffix', {
                      start: dateRange.from ? formatDate(dateRange.from.toISOString()) : t('common:allTime'),
                      end: dateRange.to ? formatDate(dateRange.to.toISOString()) : t('common:present')
                    })
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                     {/* Use expenses namespace */}
                    <TableHead>{t('expenses:date')}</TableHead>
                    <TableHead>{t('expenses:vendor')}</TableHead>
                    <TableHead>{t('expenses:category')}</TableHead>
                    <TableHead>{t('expenses:paymentMethod')}</TableHead>
                    <TableHead className="text-right">{t('expenses:amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.length > 0 ? (
                    paginatedExpenses.map((expense: Expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.vendor}</TableCell>
                         {/* Use expenses and donations namespaces via helper */}
                        <TableCell>{formatDisplayString(expense.category, 'expenses', 'categoryOptions', expense.category)}</TableCell>
                        <TableCell>{formatDisplayString(expense.paymentMethod, 'donations', 'methods', expense.paymentMethod)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                      </TableRow>
                    ))
                   ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                         {/* Use reports namespace */}
                        {t('reports:reportsContent.noDataPeriodExpenses')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredExpenses.length > 0 && (
              <div className="border-t px-4">
                <InternalTablePagination
                  currentPage={expensesCurrentPage}
                  totalPages={expensesTotalPages}
                  onPageChange={setExpensesCurrentPage}
                  itemsPerPage={expensesPerPage}
                  onItemsPerPageChange={setExpensesPerPage}
                  totalItems={filteredExpenses.length}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <CampaignCharts 
            donations={filteredDonations} 
            expenses={filteredExpenses} 
            campaigns={campaigns} 
            startDate={dateRange.from} 
            endDate={dateRange.to} 
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.campaigns.activeTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.filter((campaign: Campaign) => campaign.isActive).length}</div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.campaigns.activeSubtitle')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.campaigns.totalRaisedTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                   {/* TODO: Add raised calculation */} 
                  {formatCurrency(filteredDonations.reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0))}
                </div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.campaigns.totalRaisedSubtitle')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 {/* Use reports namespace */}
                <CardTitle className="text-sm font-medium">{t('reports:reportsContent.campaigns.goalCompletionTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const campaignsWithGoal = campaigns.filter(c => parseFloat(c.goalAmount || '0') > 0);
                    if (campaignsWithGoal.length === 0) return 0;
                    const totalRaised = donations.filter(d => d.campaignId && campaignsWithGoal.some(c => c.id === d.campaignId)).reduce((sum, d) => sum + parseFloat(d.amount), 0);
                    const totalGoal = campaignsWithGoal.reduce((sum, c) => sum + parseFloat(c.goalAmount || '0'), 0);
                    return totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;
                  })()} 
                  %
                </div>
                 {/* Use reports namespace */}
                <p className="text-xs text-muted-foreground">{t('reports:reportsContent.campaigns.goalCompletionSubtitle')}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
               {/* Use reports namespace */}
              <CardTitle>{t('reports:reportsContent.campaigns.progressTitle')}</CardTitle>
              <CardDescription>{t('reports:reportsContent.campaigns.progressSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                 {paginatedCampaigns.length > 0 ? (
                  paginatedCampaigns.map((campaign: Campaign) => {
                    const goal = parseFloat(campaign.goalAmount || '0') || 1;
                    const raised = donations.filter(d => d.campaignId === campaign.id).reduce((sum, d) => sum + parseFloat(d.amount), 0);
                    const progress = Math.min(100, Math.round((raised / goal) * 100))
                    return (
                      <div key={campaign.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">
                             {/* Use reports and common namespaces */}
                            {t('reports:reportsContent.campaigns.goalStatus',
                              { raised: formatCurrency(raised), goal: formatCurrency(parseFloat(campaign.goalAmount || '0')) })}
                          </div>
                        </div>
                        <Progress value={progress} aria-label={t('reports:reportsContent.campaigns.progressAriaLabel', { percent: progress })} />
                        <div className="text-xs text-muted-foreground">
                            {/* Use reports and common namespaces */}
                           {t('reports:reportsContent.campaigns.progressPercent', { percent: progress })} 
                           {campaign.endDate ? t('reports:reportsContent.campaigns.endDate', { date: formatDate(campaign.endDate) }) : t('common:ongoing')} 
                        </div>
                      </div>
                    )
                  })
                ) : (
                   <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                      {/* Use reports namespace */}
                     {t('reports:reportsContent.noActiveCampaigns')}
                   </div>
                )}
              </div>
            </CardContent>
             {activeCampaigns.length > 0 && (
               <div className="border-t px-4">
                 <InternalTablePagination
                   currentPage={campaignsCurrentPage}
                   totalPages={campaignsTotalPages}
                   onPageChange={setCampaignsCurrentPage}
                   itemsPerPage={campaignsPerPage}
                   onItemsPerPageChange={setCampaignsPerPage}
                   totalItems={activeCampaigns.length}
                 />
               </div>
             )}
          </Card>
        </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
