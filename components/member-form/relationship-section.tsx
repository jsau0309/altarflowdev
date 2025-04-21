"use client"

import { useFormContext } from "react-hook-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"

export function RelationshipSection() {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("members:memberForm.relationship.title")} *</h2>
      <FormField
        control={form.control}
        name="relationshipStatus"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="visitor" />
                  </FormControl>
                  <FormLabel className="font-normal">{t("members:memberForm.relationship.visitor")}</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="regular" />
                  </FormControl>
                  <FormLabel className="font-normal">{t("members:memberForm.relationship.regular")}</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
