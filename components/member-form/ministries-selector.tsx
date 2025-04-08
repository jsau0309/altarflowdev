"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"

export function MinistriesSelector() {
  const { config, language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  const activeMinistries = config.ministries.filter((ministry) => ministry.isActive)

  if (activeMinistries.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t.nextSteps.title}</h2>
      <FormField
        control={form.control}
        name="interestedMinistries"
        render={() => (
          <FormItem>
            <div className="space-y-2">
              {activeMinistries.map((ministry) => (
                <FormField
                  key={ministry.id}
                  control={form.control}
                  name="interestedMinistries"
                  render={({ field }) => {
                    return (
                      <FormItem key={ministry.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(ministry.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || []
                              return checked
                                ? field.onChange([...currentValue, ministry.id])
                                : field.onChange(currentValue.filter((value) => value !== ministry.id))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {ministry.name}
                          {ministry.description && (
                            <span className="text-sm text-muted-foreground"> - {ministry.description}</span>
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
