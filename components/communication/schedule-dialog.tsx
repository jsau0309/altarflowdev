"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  isLoading?: boolean;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
  isLoading = false,
}: ScheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>("09");
  const [selectedMinute, setSelectedMinute] = useState<string>("00");
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("AM");

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    let hour = parseInt(selectedHour);
    if (selectedPeriod === "PM" && hour !== 12) {
      hour += 12;
    } else if (selectedPeriod === "AM" && hour === 12) {
      hour = 0;
    }

    const scheduledDate = setMinutes(
      setHours(selectedDate, hour),
      parseInt(selectedMinute)
    );

    if (scheduledDate <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    onSchedule(scheduledDate);
  };

  const hours = Array.from({ length: 12 }, (_, i) => 
    String(i + 1).padStart(2, "0")
  );
  
  const minutes = ["00", "15", "30", "45"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Email Campaign</DialogTitle>
          <DialogDescription>
            Choose when you want to send this email campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Time</Label>
            <div className="flex gap-2">
              <Select value={selectedHour} onValueChange={setSelectedHour}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="flex items-center px-2">:</span>

              <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedPeriod}
                onValueChange={(value: "AM" | "PM") => setSelectedPeriod(value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDate && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Scheduled for:{" "}
                  <strong>
                    {format(selectedDate, "MMMM d, yyyy")} at {selectedHour}:{selectedMinute} {selectedPeriod}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={!selectedDate || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Schedule Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}