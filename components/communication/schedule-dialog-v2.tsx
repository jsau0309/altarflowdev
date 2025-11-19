"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Loader2, MapPin } from "lucide-react";
import { format, setHours, setMinutes, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@clerk/nextjs";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  isLoading?: boolean;
}

// Common send time suggestions
const SUGGESTED_TIMES = [
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "2:00 PM", hour: 14, minute: 0 },
  { label: "5:00 PM", hour: 17, minute: 0 },
];

// Quick dates will be populated in the component with translations

export function ScheduleDialogV2({
  open,
  onOpenChange,
  onSchedule,
  isLoading = false,
}: ScheduleDialogProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication']);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  // Default to user's browser timezone
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateInput, setCustomDateInput] = useState("");
  
  // Define quick dates with translations
  const QUICK_DATES = [
    { label: t('communication:scheduleDialog.dateSelection.tomorrow'), getDays: () => 1 },
    { label: t('communication:scheduleDialog.dateSelection.inThreeDays'), getDays: () => 3 },
    { label: t('communication:scheduleDialog.dateSelection.nextWeek'), getDays: () => 7 },
  ];

  // Load timezone from email settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/communication/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.settings?.timezone) {
            setTimezone(data.settings.timezone);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    if (open) {
      loadSettings();
    }
  }, [open, getToken]);

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);

    // The date is already in the user's local timezone
    // When we call toISOString() it will convert to UTC properly
    if (scheduledDate <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    onSchedule(scheduledDate);
  };

  const handleQuickDate = (days: number) => {
    // Set to noon to avoid timezone date shifting issues
    const date = setHours(addDays(new Date(), days), 12);
    setSelectedDate(date);
    setShowCustomDate(false);
  };

  const handleCustomDateSelect = () => {
    if (!customDateInput) return;
    
    // Parse the date input (YYYY-MM-DD format)
    const [year, month, day] = customDateInput.split('-').map(Number);
    
    // Create a date at noon in the local timezone to avoid shifting
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    if (isNaN(date.getTime())) {
      toast.error("Invalid date format");
      return;
    }
    
    setSelectedDate(date);
  };

  const getScheduledTimeDisplay = () => {
    if (!selectedDate || !selectedTime) return null;
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);
    
    try {
      // Display in the configured timezone to match what the user expects
      return formatInTimeZone(scheduledDate, timezone, "MMMM d, yyyy 'at' h:mm a zzz");
    } catch {
      return format(scheduledDate, "MMMM d, yyyy 'at' h:mm a") + ` ${timezone}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('communication:scheduleDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('communication:scheduleDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Timezone Display */}
          <Alert className="bg-muted/50 border-muted">
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              {t('communication:scheduleDialog.timezone.timesShownIn')} <strong>{timezone}</strong>
            </AlertDescription>
          </Alert>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label>{t('communication:scheduleDialog.dateSelection.selectDate')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_DATES.map((quickDate) => (
                <Button
                  key={quickDate.label}
                  variant={
                    selectedDate && 
                    format(selectedDate, "yyyy-MM-dd") === 
                    format(addDays(new Date(), quickDate.getDays()), "yyyy-MM-dd")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleQuickDate(quickDate.getDays())}
                  className="w-full"
                >
                  {quickDate.label}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={showCustomDate ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCustomDate(!showCustomDate)}
                className="w-full"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {t('communication:scheduleDialog.dateSelection.customDate')}
              </Button>
            </div>

            {showCustomDate && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customDateInput}
                  onChange={(e) => setCustomDateInput(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleCustomDateSelect}
                  disabled={!customDateInput}
                >
                  {t('communication:scheduleDialog.dateSelection.select')}
                </Button>
              </div>
            )}
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label>{t('communication:scheduleDialog.timeSelection.selectTime')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_TIMES.map((time) => (
                <Button
                  key={time.label}
                  variant={selectedTime === `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}` ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(`${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`)}
                  className="w-full"
                >
                  <Clock className="mr-2 h-3 w-3" />
                  {time.label}
                </Button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-time" className="text-sm">{t('communication:scheduleDialog.timeSelection.custom')}</Label>
              <Input
                id="custom-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Preview */}
          {selectedDate && (
            <Alert className="bg-primary/10 border-primary/20">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Scheduled for:</strong><br />
                {getScheduledTimeDisplay()}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('communication:scheduleDialog.actions.cancel')}
          </Button>
          <Button onClick={handleSchedule} disabled={!selectedDate || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('communication:scheduleDialog.actions.scheduling')}
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {t('communication:scheduleDialog.actions.schedule')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}