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
import { Donation, Expense, Campaign, Member } from "@/lib/types"

export function ReportsContent() {
  const [activeTab, setActiveTab] = useState("donations")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // State for data (replace mock data)
  const [donations, setDonations] = useState<Donation[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Add these state variables for pagination
  const [donationsPerPage, setDonationsPerPage] = useState(10)
  const [donationsCurrentPage, setDonationsCurrentPage] = useState(1)

  const [expensesPerPage, setExpensesPerPage] = useState(10)
  const [expensesCurrentPage, setExpensesCurrentPage] = useState(1)

  const [campaignsPerPage, setCampaignsPerPage] = useState(5)
  const [campaignsCurrentPage, setCampaignsCurrentPage] = useState(1)

  // TODO: Fetch data from API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDonations([]); // Replace with actual data fetching
      setExpenses([]);
      setCampaigns([]);
      setMembers([]);
      console.log("TODO: Fetch report data");
    }, 500);
  }, []);

  // Filter data based on date range
  const filteredDonations = donations.filter((donation) => {
    if (!dateRange.from && !dateRange.to) return true
    const donationDate = new Date(donation.date)
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

  const activeCampaigns = campaigns.filter((campaign: Campaign) => campaign.isActive && campaign.goal > 0)

  // Calculate totals
  const totalDonations = filteredDonations.reduce((sum: number, donation: Donation) => sum + donation.amount, 0)
  const totalExpenses = filteredExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0)
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
  const getDonorName = (donorId: string) => {
    const donor = members.find((member: Member) => member.id === donorId)
    return donor ? `${donor.firstName} ${donor.lastName}` : "Unknown"
  }

  // Helper function to get campaign name
  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find((campaign: Campaign) => campaign.id === campaignId)
    return campaign ? campaign.name : "General"
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy")
  }

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
    // This would be connected to actual export functionality
    console.log(`Exporting ${activeTab} report as ${exportFormat}`)
    console.log(
      `Date range: ${dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "All"} to ${
        dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "Present"
      }`,
    )
  }

  // Generate page numbers to display
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Calculate start and end of page range around current page
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if we're near the start
      if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4)
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3)
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push(-1) // -1 represents ellipsis
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push(-2) // -2 represents ellipsis
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  // Pagination component
  const TablePagination = ({
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
    // Calculate the range of items being displayed
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> items
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center">
              {getPageNumbers(currentPage, totalPages).map((page, index) => {
                if (page < 0) {
                  // Render ellipsis
                  return (
                    <span key={`ellipsis-${index}`} className="px-2">
                      ...
                    </span>
                  )
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(page)}
                    className="h-8 w-8"
                    aria-label={`Page ${page}`}
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
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and view financial reports</p>
        </div>
        <div className="flex gap-2">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Date Range</h4>
                  <div className="flex flex-col gap-2">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 opacity-70" />
                        <span className="text-sm">From</span>
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
                            {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
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
                        <span className="text-sm">To</span>
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
                            {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
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
                  <h4 className="font-medium leading-none">Export Format</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={exportFormat === "pdf" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("pdf")}
                      className="flex-1"
                    >
                      PDF
                    </Button>
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("csv")}
                      className="flex-1"
                    >
                      CSV
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={handleResetFilter}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button className="flex gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="donations" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="donations">Donation Reports</TabsTrigger>
          <TabsTrigger value="expenses">Expense Reports</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4 pt-4">
          {/* Donation Charts - Pass required donations prop */}
          <DonationCharts
            donations={filteredDonations}
            startDate={dateRange.from}
            endDate={dateRange.to}
          />

          {/* Donation Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalDonations)}</div>
                <p className="text-xs text-muted-foreground">{filteredDonations.length} donations in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(filteredDonations.length ? totalDonations / filteredDonations.length : 0)}
                </div>
                <p className="text-xs text-muted-foreground">Per donation in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(filteredDonations.map((d: Donation) => d.donorId)).size}</div>
                <p className="text-xs text-muted-foreground">Contributors in selected period</p>
              </CardContent>
            </Card>
          </div>

          {/* Donation Table */}
          <Card>
            <CardHeader>
              <CardTitle>Donation Records</CardTitle>
              <CardDescription>
                Showing {filteredDonations.length} donations
                {dateRange.from || dateRange.to
                  ? ` from ${dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "all time"} to ${
                      dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "present"
                    }`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDonations.map((donation: Donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>{formatDate(donation.date)}</TableCell>
                      <TableCell>{getDonorName(donation.donorId)}</TableCell>
                      <TableCell>{getCampaignName(donation.campaignId)}</TableCell>
                      <TableCell>
                        {donation.paymentMethod
                          .split("-")
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(donation.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredDonations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No donations found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredDonations.length > 0 && (
              <div className="border-t px-4">
                <TablePagination
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
          {/* Expense Charts - Pass required expenses prop */}
          <ExpenseCharts
            expenses={filteredExpenses}
            startDate={dateRange.from}
            endDate={dateRange.to}
          />

          {/* Expense Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(filteredExpenses.length ? totalExpenses / filteredExpenses.length : 0)}
                </div>
                <p className="text-xs text-muted-foreground">Per expense in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(netIncome)}
                </div>
                <p className="text-xs text-muted-foreground">Donations minus expenses</p>
              </CardContent>
            </Card>
          </div>

          {/* Expense Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Records</CardTitle>
              <CardDescription>
                Showing {filteredExpenses.length} expenses
                {dateRange.from || dateRange.to
                  ? ` from ${dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "all time"} to ${
                      dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "present"
                    }`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense: Expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell>{expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</TableCell>
                      <TableCell>
                        {expense.paymentMethod
                          .split("-")
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No expenses found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredExpenses.length > 0 && (
              <div className="border-t px-4">
                <TablePagination
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
          {/* Campaign Charts - Pass required props */}
          <CampaignCharts
            donations={filteredDonations}
            expenses={filteredExpenses}
            startDate={dateRange.from}
            endDate={dateRange.to}
          />

          {/* Campaign Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.filter((campaign: Campaign) => campaign.isActive).length}</div>
                <p className="text-xs text-muted-foreground">Currently running campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.raised, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Across all campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    (campaigns.filter((c: Campaign) => c.goal > 0).reduce((sum: number, campaign: Campaign) => sum + campaign.raised, 0) /
                      campaigns.filter((c: Campaign) => c.goal > 0).reduce((sum: number, campaign: Campaign) => sum + campaign.goal, 0)) *
                      100,
                  ) || 0} {/* Added || 0 to prevent NaN if denominator is 0 */}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Average across campaigns with goals</p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
              <CardDescription>Current status of active fundraising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {paginatedCampaigns.map((campaign: Campaign) => {
                  const goal = campaign.goal || 1; // Prevent division by zero
                  const progress = Math.min(100, Math.round((campaign.raised / goal) * 100))
                  return (
                    <div key={campaign.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(campaign.raised)} of {formatCurrency(campaign.goal)}
                        </div>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>{progress}% Complete</div>
                        <div>{campaign.endDate ? `Ends ${formatDate(campaign.endDate)}` : "No end date"}</div>
                      </div>
                    </div>
                  )
                })}
                {activeCampaigns.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">No active campaigns with goals found</div>
                )}
              </div>
            </CardContent>
            {activeCampaigns.length > 0 && (
              <div className="border-t px-4">
                <TablePagination
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
      </Tabs>
    </div>
  )
}
