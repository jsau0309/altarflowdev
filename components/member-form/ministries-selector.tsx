"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"

// Mock ministry data (replace with actual fetching later)
const MOCK_MINISTRIES = [
  { id: "m1", name: "Youth Group", description: "Weekly meetings for teens", isActive: true },
  { id: "m2", name: "Worship Team", description: "Singers and musicians", isActive: true },
  { id: "m3", name: "Community Outreach", description: "Serving the local area", isActive: true },
  { id: "m4", name: "Seniors Club", description: "", isActive: false }, // Example of inactive
];

export function MinistriesSelector() {
  // Load members namespace
  const { t } = useTranslation('members')
  const form = useFormContext<MemberFormValues>()

  // Use mock data for now
  const activeMinistries = MOCK_MINISTRIES.filter((ministry) => ministry.isActive);

  if (activeMinistries.length === 0) {
    return null // Or some placeholder if desired
  }

  return (
    <div className="space-y-4">
      {/* Use members namespace */}
      <h2 className="text-lg font-medium">{t("members:memberForm.ministries.title", "Interested Ministries")}</h2>
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
                              const currentValue = Array.isArray(field.value) ? field.value : []
                              return checked
                                ? field.onChange([...currentValue, ministry.id])
                                : field.onChange(currentValue.filter((value) => value !== ministry.id))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {/* Revert to using hardcoded mock data directly */}
                          {ministry.name}
                          {ministry.description && (
                            <span className="text-sm text-muted-foreground">
                              {/* Revert to using hardcoded mock data directly */}
                              {' - '}{ministry.description}
                            </span>
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
