"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock, Send, Sunrise, Sun, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@clerk/nextjs";

interface ScheduleSelectorProps {
  sendOption: "now" | "schedule";
  onSendOptionChange: (option: "now" | "schedule") => void;
  scheduledDate: Date | null;
  onScheduledDateChange: (date: Date | null) => void;
}

export function ScheduleSelector({
  sendOption,
  onSendOptionChange,
  scheduledDate,
  onScheduledDateChange,
}: ScheduleSelectorProps) {
  const { getToken } = useAuth();
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedTime, setSelectedTime] = useState({ hour: "10", minute: "00", period: "AM" });
  const [suggestedTimes] = useState([
    { time: "10:00 AM", label: "Best open rate", icon: Sunrise, color: "text-orange-600 bg-orange-50 border-orange-200" },
    { time: "2:00 PM", label: "Good engagement", icon: Sun, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    { time: "6:00 PM", label: "Evening readers", icon: Sunset, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ]);

  // Load church timezone from settings
  useEffect(() => {
    const loadTimezone = async () => {
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
        console.error("Error loading timezone:", error);
      }
    };

    loadTimezone();
  }, [getToken]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      let hour24 = parseInt(selectedTime.hour);
      if (selectedTime.period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (selectedTime.period === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      
      const newDate = setMinutes(
        setHours(date, hour24), 
        parseInt(selectedTime.minute)
      );
      onScheduledDateChange(newDate);
    } else {
      onScheduledDateChange(null);
    }
  };

  const handleTimeChange = (type: "hour" | "minute" | "period", value: string) => {
    const newTime = { ...selectedTime, [type]: value };
    setSelectedTime(newTime);
    
    if (scheduledDate) {
      let hour24 = parseInt(newTime.hour);
      if (newTime.period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (newTime.period === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      
      const newDate = setMinutes(
        setHours(scheduledDate, hour24), 
        parseInt(newTime.minute)
      );
      onScheduledDateChange(newDate);
    }
  };

  const handleQuickTime = (time: string) => {
    const [hourMin, period] = time.split(" ");
    const [hour, minute] = hourMin.split(":");
    
    setSelectedTime({ hour, minute, period });
    
    if (scheduledDate) {
      let hour24 = parseInt(hour);
      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      
      const newDate = setMinutes(setHours(scheduledDate, hour24), parseInt(minute));
      onScheduledDateChange(newDate);
    }
  };

  const maxDate = addDays(new Date(), 14);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Send Options</CardTitle>
          <CardDescription>
            Choose when to send your email campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={sendOption}
            onValueChange={(value) => onSendOptionChange(value as "now" | "schedule")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="send-now" />
              <Label htmlFor="send-now" className="flex items-center gap-2 cursor-pointer">
                <Send className="h-4 w-4" />
                Send immediately
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="schedule" id="send-later" />
              <Label htmlFor="send-later" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-4 w-4" />
                Schedule for later
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {sendOption === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
            <CardDescription>
              Emails will be sent in {timezone} timezone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate || undefined}
                    onSelect={handleDateSelect}
                    disabled={(date) =>
                      date < new Date() || date > maxDate
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                You can schedule up to 14 days in advance
              </p>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex gap-2 items-center">
                <Select
                  value={selectedTime.hour}
                  onValueChange={(value) => handleTimeChange("hour", value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i === 0 ? 12 : i;
                      return (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                <span className="text-lg font-medium">:</span>
                
                <Select
                  value={selectedTime.minute}
                  onValueChange={(value) => handleTimeChange("minute", value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["00", "15", "30", "45"].map((min) => (
                      <SelectItem key={min} value={min}>
                        {min}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={selectedTime.period}
                  onValueChange={(value) => handleTimeChange("period", value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Suggested Times</Label>
              <div className="grid grid-cols-3 gap-3">
                {suggestedTimes.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <Button
                      key={suggestion.time}
                      variant="outline"
                      onClick={() => handleQuickTime(suggestion.time)}
                      className={cn(
                        "h-auto flex flex-col items-center gap-2 p-4 hover:scale-105 transition-transform",
                        suggestion.color
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <div className="text-center">
                        <span className="font-semibold block">{suggestion.time}</span>
                        <span className="text-xs opacity-80">
                          {suggestion.label}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Click a suggested time for optimal engagement
              </p>
            </div>

            {scheduledDate && (
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Your email will be sent on{" "}
                  <strong>{format(scheduledDate, "PPPP 'at' h:mm a")}</strong>
                  <br />
                  <span className="text-sm text-blue-700">
                    {timezone.replace("America/", "").replace("_", " ")} timezone
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}