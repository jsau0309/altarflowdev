"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./member-form"

export function PersonalInfoSection() {
  const { t } = useTranslation('members')
  const { control } = useFormContext<MemberFormValues>()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t("members:memberForm.personalInfo.title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 px-0.5">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{t("members:memberForm.personalInfo.firstName")} *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{t("members:memberForm.personalInfo.lastName")} *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>{t("members:memberForm.personalInfo.email")} *</FormLabel>
            <FormControl>
              <Input type="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>{t("members:memberForm.personalInfo.phone")}</FormLabel>
            <FormControl>
              <Input type="tel" maxLength={10} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* <FormField
        control={control}
        name="smsConsent"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2 pt-2">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t("members:memberForm.personalInfo.smsConsentLabel", "I agree to receive text messages.")}
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      /> */}
    </div>
  )
}
