"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"


// However, to decouple, using mock data for now.
const MOCK_SERVICE_TIMES = [
  { id: "s1", day: "Sunday", time: "9:00 AM", description: "Main Service", isActive: true },
  { id: "s2", day: "Sunday", time: "11:00 AM", description: "Contemporary Service", isActive: true },
  { id: "s3", day: "Wednesday", time: "7:00 PM", description: "Midweek Prayer", isActive: true },
  { id: "s4", day: "Saturday", time: "5:00 PM", description: "Youth Service", isActive: false },
];

export function ServiceTimesSelector() {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  // Use mock data for now
  const activeServiceTimes = MOCK_SERVICE_TIMES.filter((service) => service.isActive);

  if (activeServiceTimes.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("members:memberForm.serviceAttended.title", "Service Usually Attended")}</h2>
      <FormField
        control={form.control}
        name="serviceTimes"
        render={() => (
          <FormItem>
            <div className="space-y-2">
              {activeServiceTimes.map((service) => (
                <FormField
                  key={service.id}
                  control={form.control}
                  name="serviceTimes"
                  render={({ field }) => {
                    return (
                      <FormItem key={service.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(service.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = Array.isArray(field.value) ? field.value : []
                              return checked
                                ? field.onChange([...currentValue, service.id])
                                : field.onChange(currentValue.filter((value) => value !== service.id))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {service.day}{' '}
                          {service.time}
                          {service.description && (
                            <span className="text-sm text-muted-foreground">
                              {' - '}
                              {service.description}
                            </span>
                          )}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
