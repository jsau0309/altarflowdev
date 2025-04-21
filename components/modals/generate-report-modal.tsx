"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Calendar, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation('reports');

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
          <DialogTitle>{t('reports:generateReportModal.title')}</DialogTitle>
          <DialogDescription>{t('reports:generateReportModal.description')}</DialogDescription>
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
              <Label htmlFor="report-type">{t('reports:generateReportModal.reportTypeLabel')}</Label>
              <Select required value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder={t('reports:generateReportModal.reportTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donations">{t('reports:generateReportModal.reportTypeOptions.donations')}</SelectItem>
                  <SelectItem value="expenses">{t('reports:generateReportModal.reportTypeOptions.expenses')}</SelectItem>
                  <SelectItem value="campaigns">{t('reports:generateReportModal.reportTypeOptions.campaigns')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('reports:generateReportModal.dateRangeLabel')}</Label>
              <RadioGroup value={dateRange} onValueChange={setDateRange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-month" id="current-month" />
                  <Label htmlFor="current-month">{t('reports:generateReportModal.dateRangeOptions.currentMonth')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="previous-month" id="previous-month" />
                  <Label htmlFor="previous-month">{t('reports:generateReportModal.dateRangeOptions.previousMonth')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current-quarter" id="current-quarter" />
                  <Label htmlFor="current-quarter">{t('reports:generateReportModal.dateRangeOptions.currentQuarter')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="year-to-date" id="year-to-date" />
                  <Label htmlFor="year-to-date">{t('reports:generateReportModal.dateRangeOptions.yearToDate')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-7-days" id="last-7-days" />
                  <Label htmlFor="last-7-days">{t('reports:generateReportModal.dateRangeOptions.last7Days')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-30-days" id="last-30-days" />
                  <Label htmlFor="last-30-days">{t('reports:generateReportModal.dateRangeOptions.last30Days')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">{t('reports:generateReportModal.dateRangeOptions.custom')}</Label>
                </div>
              </RadioGroup>

              {dateRange === "custom" && (
                <div className="grid gap-2 mt-2">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 opacity-70" />
                      <span className="text-sm">{t('reports:generateReportModal.customRange.from')}</span>
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
                          {customDateRange.from ? format(customDateRange.from, "PPP") : t('reports:generateReportModal.customRange.pickDate')}
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
                      <span className="text-sm">{t('reports:generateReportModal.customRange.to')}</span>
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
                          {customDateRange.to ? format(customDateRange.to, "PPP") : t('reports:generateReportModal.customRange.pickDate')}
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
              <Label>{t('reports:generateReportModal.optionsLabel')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeOptions.charts}
                    onCheckedChange={() => handleOptionChange("charts")}
                  />
                  <Label htmlFor="include-charts">{t('reports:generateReportModal.options.charts')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-summary"
                    checked={includeOptions.summary}
                    onCheckedChange={() => handleOptionChange("summary")}
                  />
                  <Label htmlFor="include-summary">{t('reports:generateReportModal.options.summary')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-details"
                    checked={includeOptions.details}
                    onCheckedChange={() => handleOptionChange("details")}
                  />
                  <Label htmlFor="include-details">{t('reports:generateReportModal.options.details')}</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('reports:generateReportModal.exportFormatLabel')}</Label>
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as "pdf" | "csv")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">{t('reports:generateReportModal.exportFormatOptions.pdf')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">{t('reports:generateReportModal.exportFormatOptions.csv')}</Label>
                </div>
              </RadioGroup>
            </div>
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('reports:generateReportModal.cancelButton')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !reportType}
            onClick={() => {
              (document.getElementById("report-form") as HTMLFormElement | null)?.requestSubmit()
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('reports:generateReportModal.generating')}
              </>
            ) : (
              t('reports:generateReportModal.generateButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
