"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon, Filter, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { DateRange } from "./reports-page"
import type { DonationTypeForFilter } from "@/lib/actions/reports.actions"

interface ReportFiltersProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  donationTypes: DonationTypeForFilter[]
  selectedDonationType: string | null
  onDonationTypeChange: (donationTypeId: string | null) => void
  isLoading?: boolean
}

export function ReportFilters({
  dateRange,
  onDateRangeChange,
  donationTypes,
  selectedDonationType,
  onDonationTypeChange,
  isLoading = false
}: ReportFiltersProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange>(dateRange)
  const [tempDonationType, setTempDonationType] = useState<string | null>(selectedDonationType)
  const [wasApplyClicked, setWasApplyClicked] = useState(false)
  
  // Close popover when loading completes after Apply was clicked
  useEffect(() => {
    if (!isLoading && wasApplyClicked) {
      setIsOpen(false)
      setWasApplyClicked(false)
    }
  }, [isLoading, wasApplyClicked])
  
  const handleApply = () => {
    setWasApplyClicked(true)
    onDateRangeChange(tempRange)
    onDonationTypeChange(tempDonationType)
    // Don't close immediately - wait for loading to complete
  }

  const handleReset = () => {
    const defaultRange = {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    }
    setTempRange(defaultRange)
    setTempDonationType(null)
    onDateRangeChange(defaultRange)
    onDonationTypeChange(null)
    setIsOpen(false)
  }
  
  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return t('reports:selectDateRange')
    
    // If selecting a whole month (first day to last day of same month)
    const fromDate = dateRange.from
    const toDate = dateRange.to
    
    if (fromDate.getMonth() === toDate.getMonth() && 
        fromDate.getFullYear() === toDate.getFullYear() &&
        fromDate.getDate() === 1) {
      // Check if toDate is the last day of the month
      const lastDayOfMonth = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0)
      if (toDate.getDate() === lastDayOfMonth.getDate()) {
        return format(fromDate, 'MMMM yyyy')
      }
    }
    
    return `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d, yyyy')}`
  }
  
  // Separate donation types into system types and campaigns
  const systemTypes = donationTypes.filter(dt => dt.isSystemType)
  const campaigns = donationTypes.filter(dt => dt.isCampaign && !dt.isSystemType)

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (open) {
        setTempRange(dateRange)
        setTempDonationType(selectedDonationType)
      }
      setIsOpen(open)
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <Filter className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t('reports:dateRange')}</h4>
            
            {/* Quick month selection */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setTempRange({
                    from: startOfMonth(now),
                    to: endOfMonth(now)
                  })
                }}
              >
                {t('reports:timeFrames.thisMonth')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastMonth = subMonths(new Date(), 1)
                  setTempRange({
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth)
                  })
                }}
              >
                {t('reports:timeFrames.lastMonth')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  const yearStart = new Date(now.getFullYear(), 0, 1) // January 1st of current year
                  setTempRange({
                    from: yearStart,
                    to: now
                  })
                }}
              >
                YTD
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-sm text-muted-foreground">{t('common:from')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempRange.from ? format(tempRange.from, "PPP") : t('reports:pickDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempRange.from || undefined}
                      onSelect={(date) => setTempRange(prev => ({ ...prev, from: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">{t('common:to')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempRange.to ? format(tempRange.to, "PPP") : t('reports:pickDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempRange.to || undefined}
                      onSelect={(date) => setTempRange(prev => ({ ...prev, to: date || null }))}
                      initialFocus
                      disabled={(date) => tempRange.from ? date < tempRange.from : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Donation Type Filter */}
          <div className="space-y-2 border-t pt-3">
            <h4 className="font-medium text-sm">{t('reports:donationType')}</h4>
            <Select
              value={tempDonationType || 'all'}
              onValueChange={(value) => setTempDonationType(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('reports:allDonationTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports:allDonationTypes')}</SelectItem>

                {systemTypes.length > 0 && (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>{t('reports:systemTypes')}</SelectLabel>
                      {systemTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}

                {campaigns.length > 0 && (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>{t('reports:campaigns')}</SelectLabel>
                      {campaigns.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t('common:reset')}
            </Button>
            <Button size="sm" onClick={handleApply} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:loading')}
                </>
              ) : (
                t('common:apply')
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}