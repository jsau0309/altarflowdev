"use client"

import { useFormContext } from "react-hook-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"

export function RelationshipSection() {
  const { language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t.relationship.title} *</h2>
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
                  <FormLabel className="font-normal">{t.relationship.visitor}</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="regular" />
                  </FormControl>
                  <FormLabel className="font-normal">{t.relationship.regular}</FormLabel>
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
