"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState } from "react"
// import { useRouter } from "next/navigation" // Not needed since we don't navigate
import { AlertCircle, Calendar, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useOrganization } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// import { Checkbox } from "@/components/ui/checkbox" // Not used in current implementation
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns"
import { toast } from "sonner"

// Import the actual export functions from the reports page
import { exportToPDF } from "@/components/reports/export/pdf-exporter"
import { exportToCSV } from "@/components/reports/export/csv-exporter"
import {
  getDonationSummary,
  getExpenseSummary,
  getTransactionsForExport,
} from "@/lib/actions/reports.actions"

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GenerateReportModal({ isOpen, onClose }: GenerateReportModalProps) {
  // const router = useRouter() // Not needed
  const { organization } = useOrganization()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportType, setReportType] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("current-month")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf")
  const { t } = useTranslation(['reports', 'common']);

  // Calculate date range based on selection
  const getDateRangeValues = (): { from: Date | undefined; to: Date | undefined } => {
    const today = new Date()

    switch (dateRange) {
      case "current-month":
        return {
          from: startOfMonth(today),
          to: today,
        }
      case "previous-month":
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        return {
          from: startOfMonth(prevMonth),
          to: endOfMonth(prevMonth),
        }
      case "current-quarter":
        return {
          from: startOfQuarter(today),
          to: today,
        }
      case "year-to-date":
        return {
          from: startOfYear(today),
          to: today,
        }
      case "last-7-days":
        return {
          from: subDays(today, 6),
          to: today,
        }
      case "last-30-days":
        return {
          from: subDays(today, 29),
          to: today,
        }
      case "custom":
        return customDateRange
      default:
        return { from: undefined, to: undefined }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { from, to } = getDateRangeValues()

      if (!from || !to) {
        throw new Error(t('reports:generateReportModal.errors.selectDateRange', 'Please select a valid date range'))
      }

      if (!organization?.id) {
        throw new Error(t('reports:generateReportModal.errors.noOrganization', 'No organization selected'))
      }

      // Fetch data based on report type
      let exportData: any[] = []
      let summary: any = {}

      if (reportType === "donations" || reportType === "expenses") {
        const type = reportType as 'donations' | 'expenses'
        
        // Fetch the data
        const [summaryData, transactionData] = await Promise.all([
          type === 'donations' 
            ? getDonationSummary(organization.id, from, to)
            : getExpenseSummary(organization.id, from, to),
          getTransactionsForExport(organization.id, type, from, to)
        ])

        exportData = transactionData
        summary = summaryData

        // Generate the report
        if (exportFormat === 'pdf') {
          exportToPDF({
            data: exportData,
            summary: summary,
            type: type,
            dateRange: { from, to },
            churchName: organization.name,
            t
          })
        } else {
          exportToCSV({
            data: exportData,
            summary: summary,
            type: type,
            dateRange: { from, to },
            churchName: organization.name,
            t
          })
        }

        toast.success(t('reports:generateReportModal.successMessage', 'Report generated successfully!'))
        onClose()
      } else {
        // For campaigns or other report types not yet implemented
        throw new Error(t('reports:generateReportModal.errors.notImplemented', 'This report type is not yet implemented'))
      }

    } catch (err) {
      console.error("Error generating report:", err)
      setError(err instanceof Error ? err.message : t('reports:generateReportModal.errors.failedGenerate', 'Failed to generate report'))
    } finally {
      setIsLoading(false)
    }
  }

  // const handleOptionChange = (option: keyof typeof includeOptions) => {
  //   setIncludeOptions((prev) => ({
  //     ...prev,
  //     [option]: !prev[option],
  //   }))
  // } // Not used in current implementation

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:max-w-[500px] sm:max-h-[85vh] sm:h-auto overflow-hidden flex flex-col p-0 sm:p-6 sm:rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-0 sm:pt-0 sm:pb-0">
          <DialogTitle>{t('reports:generateReportModal.title', 'Generate Report')}</DialogTitle>
          <DialogDescription>{t('reports:generateReportModal.description', 'Select the report you want to generate.')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden px-6 sm:px-1 flex-grow">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-type">{t('reports:generateReportModal.reportTypeLabel', 'Report type')}</Label>
              <Select required value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder={t('reports:generateReportModal.reportTypePlaceholder', 'Select report type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donations">{t('reports:generateReportModal.reportTypeOptions.donations', 'Donation Report')}</SelectItem>
                  <SelectItem value="expenses">{t('reports:generateReportModal.reportTypeOptions.expenses', 'Expense Report')}</SelectItem>
                  {/* <SelectItem value="campaigns" disabled>{t('reports:generateReportModal.reportTypeOptions.campaigns', 'Campaign Report')} (Coming Soon)</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('reports:generateReportModal.dateRangeLabel', 'Date range')}</Label>
              <RadioGroup value={dateRange} onValueChange={setDateRange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-month" id="current-month" />
                  <Label htmlFor="current-month">{t('reports:generateReportModal.dateRangeOptions.currentMonth', 'Current Month')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="previous-month" id="previous-month" />
                  <Label htmlFor="previous-month">{t('reports:generateReportModal.dateRangeOptions.previousMonth', 'Previous Month')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-quarter" id="current-quarter" />
                  <Label htmlFor="current-quarter">{t('reports:generateReportModal.dateRangeOptions.currentQuarter', 'Current Quarter')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="year-to-date" id="year-to-date" />
                  <Label htmlFor="year-to-date">{t('reports:generateReportModal.dateRangeOptions.yearToDate', 'Year to Date')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-7-days" id="last-7-days" />
                  <Label htmlFor="last-7-days">{t('reports:generateReportModal.dateRangeOptions.last7Days', 'Last 7 Days')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-30-days" id="last-30-days" />
                  <Label htmlFor="last-30-days">{t('reports:generateReportModal.dateRangeOptions.last30Days', 'Last 30 Days')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">{t('reports:generateReportModal.dateRangeOptions.custom', 'Custom Date Range')}</Label>
                </div>
              </RadioGroup>

              {dateRange === "custom" && (
                <div className="grid gap-2 mt-2">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 opacity-70" />
                      <span className="text-sm">{t('reports:generateReportModal.customRange.from', 'From')}</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-from"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customDateRange.from && "text-muted-foreground",
                          )}
                        >
                          {customDateRange.from ? format(customDateRange.from, "PPP") : t('reports:generateReportModal.customRange.pickDate', 'Pick a date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.from}
                          onSelect={(date) => setCustomDateRange((prev) => ({ ...prev, from: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 opacity-70" />
                      <span className="text-sm">{t('reports:generateReportModal.customRange.to', 'To')}</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-to"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customDateRange.to && "text-muted-foreground",
                          )}
                        >
                          {customDateRange.to ? format(customDateRange.to, "PPP") : t('reports:generateReportModal.customRange.pickDate', 'Pick a date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.to}
                          onSelect={(date) => setCustomDateRange((prev) => ({ ...prev, to: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Temporarily hide options that aren't implemented yet */}
            {/* <div className="space-y-2">
              <Label>{t('reports:generateReportModal.optionsLabel', 'Report options')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeOptions.charts}
                    onCheckedChange={() => handleOptionChange("charts")}
                  />
                  <Label htmlFor="include-charts">{t('reports:generateReportModal.options.charts', 'Include charts')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-summary"
                    checked={includeOptions.summary}
                    onCheckedChange={() => handleOptionChange("summary")}
                  />
                  <Label htmlFor="include-summary">{t('reports:generateReportModal.options.summary', 'Include summary')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-details"
                    checked={includeOptions.details}
                    onCheckedChange={() => handleOptionChange("details")}
                  />
                  <Label htmlFor="include-details">{t('reports:generateReportModal.options.details', 'Include details')}</Label>
                </div>
              </div>
            </div> */}

            <div className="space-y-2">
              <Label>{t('reports:generateReportModal.exportFormatLabel', 'Export format')}</Label>
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as "pdf" | "csv")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">{t('reports:generateReportModal.exportFormatOptions.pdf', 'PDF')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">{t('reports:generateReportModal.exportFormatOptions.csv', 'CSV')}</Label>
                </div>
              </RadioGroup>
            </div>
          </form>
        </div>

        <DialogFooter className="pt-4 pb-6 px-6 mt-auto border-t sm:px-0 sm:pb-0 flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t('reports:generateReportModal.cancelButton', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !reportType}
            onClick={() => {
              (document.getElementById("report-form") as HTMLFormElement | null)?.requestSubmit()
            }}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('reports:generateReportModal.generating', 'Generating...')}
              </>
            ) : (
              t('reports:generateReportModal.generateButton', 'Generate Report')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}