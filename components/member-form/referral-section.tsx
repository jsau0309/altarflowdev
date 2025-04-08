"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { FormItem, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"

export function ReferralSection() {
  const { config, language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  if (!config.settings.enableReferralTracking) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t.referral.title}</h2>
      <FormField
        control={form.control}
        name="referralSource"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder={t.referral.placeholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
