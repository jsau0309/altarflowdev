"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"

export function ServiceTimesSelector() {
  const { config, language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  const activeServiceTimes = config.serviceTimes.filter((service) => service.isActive)

  if (activeServiceTimes.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t.serviceAttended.title}</h2>
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
                              const currentValue = field.value || []
                              return checked
                                ? field.onChange([...currentValue, service.id])
                                : field.onChange(currentValue.filter((value) => value !== service.id))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {service.day} {service.time}
                          {service.description && (
                            <span className="text-sm text-muted-foreground"> - {service.description}</span>
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
