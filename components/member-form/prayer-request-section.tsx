"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"
import { useEffect } from "react"

export function PrayerRequestSection() {
  const { config, language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  const prayerRequested = form.watch("prayerRequested")

  // Reset prayer request text when checkbox is unchecked
  useEffect(() => {
    if (!prayerRequested) {
      form.setValue("prayerRequest", "")
    }
  }, [prayerRequested, form])

  if (!config.settings.enablePrayerRequests) {
    return null
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="prayerRequested"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>{t.prayer.checkboxLabel}</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {prayerRequested && (
        <FormField
          control={form.control}
          name="prayerRequest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.prayer.requestLabel}</FormLabel>
              <FormControl>
                <Textarea placeholder={t.prayer.placeholder} className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
