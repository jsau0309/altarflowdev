"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"
import type { ServiceTime } from "./types"; // Import ServiceTime type


interface ServiceTimesSelectorProps {
  options?: ServiceTime[];
  isLoading?: boolean;
}

export function ServiceTimesSelector({ options = [], isLoading = false }: ServiceTimesSelectorProps) {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  const activeServiceTimes = options.filter((service) => service.isActive);

    if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium">{t("members:memberForm.serviceAttended.title", "Service Usually Attended")}</h2>
        <p>{t("common:loading", "Loading service times...")}</p>
      </div>
    );
  }

  if (activeServiceTimes.length === 0 && !isLoading) {
    return null; // Or some placeholder if no active service times and not loading
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
                              const currentValue = Array.isArray(field.value) ? field.value : [];
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
