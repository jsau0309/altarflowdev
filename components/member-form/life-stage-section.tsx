"use client"

import { useFormContext } from "react-hook-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"

export function LifeStageSection() {
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  const lifeStages = [
    { value: "teens", label: t("members:memberForm.lifeStage.teens", "Teens") },
    { value: "20s", label: t("members:memberForm.lifeStage.20s", "20s") },
    { value: "30s", label: t("members:memberForm.lifeStage.30s", "30s") },
    { value: "40s", label: t("members:memberForm.lifeStage.40s", "40s") },
    { value: "50s", label: t("members:memberForm.lifeStage.50s", "50s") },
    { value: "60s", label: t("members:memberForm.lifeStage.60s", "60s") },
    { value: "70plus", label: t("members:memberForm.lifeStage.70plus", "70+") },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("members:memberForm.lifeStage.title", "Life Stage")} *</h2>
      <FormField
        control={form.control}
        name="lifeStage"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {lifeStages.map((stage) => (
                  <FormItem key={stage.value} className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={stage.value} />
                    </FormControl>
                    <FormLabel className="font-normal">{stage.label}</FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
