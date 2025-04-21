"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { FormItem, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"

// TODO: Replace this hardcoded setting check later
const ENABLE_REFERRAL_TRACKING = true; 

export function ReferralSection() {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  // Use hardcoded setting for now
  if (!ENABLE_REFERRAL_TRACKING) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("members:memberForm.referral.title", "How did you hear about us?")}</h2>
      <FormField
        control={form.control}
        name="referralSource"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder={t("members:memberForm.referral.placeholder", "Friend, website, event, etc.")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
