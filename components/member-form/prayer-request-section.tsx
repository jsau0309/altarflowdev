"use client"

import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"

interface PrayerRequestSectionProps {
  isPrayerEnabledByFlow: boolean;
}

export function PrayerRequestSection({ isPrayerEnabledByFlow }: PrayerRequestSectionProps) {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  const prayerRequested = form.watch("prayerRequested")

  // Reset prayer request text when checkbox is unchecked
  useEffect(() => {
    if (!prayerRequested) {
      form.setValue("prayerRequest", "")
    }
  }, [prayerRequested, form])

  // Use the prop from flow configuration
  if (!isPrayerEnabledByFlow) {
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
              <FormLabel>{t("members:memberForm.prayer.checkboxLabel", "I would like prayer")}</FormLabel>
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
              <FormLabel>{t("members:memberForm.prayer.requestLabel", "Prayer Request Details")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("members:memberForm.prayer.placeholder", "Please share your prayer request here...")} className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
