"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Calendar, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns"
import { exportDonationsReport, exportExpensesReport, exportCampaignsReport } from "@/lib/report-generators"

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GenerateReportModal({ isOpen, onClose }: GenerateReportModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportType, setReportType] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("current-month")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf")
  const [includeOptions, setIncludeOptions] = useState({
    charts: true,
    summary: true,
    details: true,
  })

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

      // Generate the appropriate report based on type
      switch (reportType) {
        case "donations":
          await exportDonationsReport(exportFormat, from, to)
          break
        case "expenses":
          await exportExpensesReport(exportFormat, from, to)
          break
        case "campaigns":
          await exportCampaignsReport(exportFormat, from, to)
          break
        default:
          throw new Error("Please select a report type")
      }

      // Navigate to reports page after successful generation
      router.push("/reports")
      onClose()
    } catch (err) {
      console.error("Error generating report:", err)
      setError(err instanceof Error ? err.message : "Failed to generate report")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptionChange = (option: keyof typeof includeOptions) => {
    setIncludeOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>Select the type of report you want to generate.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select required value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donations">Donation Report</SelectItem>
                  <SelectItem value="expenses">Expense Report</SelectItem>
                  <SelectItem value="campaigns">Campaign Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <RadioGroup value={dateRange} onValueChange={setDateRange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-month" id="current-month" />
                  <Label htmlFor="current-month">Current Month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="previous-month" id="previous-month" />
                  <Label htmlFor="previous-month">Previous Month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-quarter" id="current-quarter" />
                  <Label htmlFor="current-quarter">Current Quarter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="year-to-date" id="year-to-date" />
                  <Label htmlFor="year-to-date">Year to Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-7-days" id="last-7-days" />
                  <Label htmlFor="last-7-days">Last 7 Days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-30-days" id="last-30-days" />
                  <Label htmlFor="last-30-days">Last 30 Days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom Date Range</Label>
                </div>
              </RadioGroup>

              {dateRange === "custom" && (
                <div className="grid gap-2 mt-2">
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
                            !customDateRange.from && "text-muted-foreground",
                          )}
                        >
                          {customDateRange.from ? format(customDateRange.from, "PPP") : "Pick a date"}
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
                      <span className="text-sm">To</span>
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
                          {customDateRange.to ? format(customDateRange.to, "PPP") : "Pick a date"}
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

            <div className="space-y-2">
              <Label>Report Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeOptions.charts}
                    onCheckedChange={() => handleOptionChange("charts")}
                  />
                  <Label htmlFor="include-charts">Include Charts and Graphs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-summary"
                    checked={includeOptions.summary}
                    onCheckedChange={() => handleOptionChange("summary")}
                  />
                  <Label htmlFor="include-summary">Include Executive Summary</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-details"
                    checked={includeOptions.details}
                    onCheckedChange={() => handleOptionChange("details")}
                  />
                  <Label htmlFor="include-details">Include Detailed Breakdown</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as "pdf" | "csv")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">CSV</Label>
                </div>
              </RadioGroup>
            </div>
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !reportType}
            onClick={() => {
              document.getElementById("report-form")?.requestSubmit()
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
