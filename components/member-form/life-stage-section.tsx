"use client"

import { useFormContext } from "react-hook-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import { translations } from "./translations"
import type { MemberFormValues } from "./validation-schema"

export function LifeStageSection() {
  const { language } = useFormConfig()
  const t = translations[language]
  const form = useFormContext<MemberFormValues>()

  const lifeStages = [
    { value: "teens", label: t.lifeStage.teens },
    { value: "20s", label: t.lifeStage["20s"] },
    { value: "30s", label: t.lifeStage["30s"] },
    { value: "40s", label: t.lifeStage["40s"] },
    { value: "50s", label: t.lifeStage["50s"] },
    { value: "60s", label: t.lifeStage["60s"] },
    { value: "70plus", label: t.lifeStage["70plus"] },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t.lifeStage.title} *</h2>
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
