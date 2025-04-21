"use client"

import type React from "react"
import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useFormConfig } from "./form-config-context"
import { PersonalInfoSection } from "./personal-info-section"
import { RelationshipSection } from "./relationship-section"
import { LifeStageSection } from "./life-stage-section"
import { MinistriesSelector } from "./ministries-selector"
import { ServiceTimesSelector } from "./service-times-selector"
import { ReferralSection } from "./referral-section"
import { PrayerRequestSection } from "./prayer-request-section"
import { CustomFieldsSection } from "./custom-fields-section"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

// Define the schema using a function to access translations
const createFormSchema = (t: (key: string) => string) => z.object({
  // Use common namespace for errors
  firstName: z.string().min(1, { message: t('common:errors.required') }),
  lastName: z.string().min(1, { message: t('common:errors.required') }),
  email: z.string().email({ message: t('common:errors.invalidEmail') }),
  phone: z.string().optional(),
  smsConsent: z.boolean().optional(),
  relationshipStatus: z.string().optional(),
  // Add other fields from validation-schema.ts here, internationalizing messages
  lifeStage: z.string().optional(),
  referralSource: z.string().optional(),
  prayerRequested: z.boolean().optional(),
  prayerRequest: z.string().optional(),
  // Arrays for checkboxes
  interestedMinistries: z.array(z.string()).optional(), 
  serviceTimes: z.array(z.string()).optional(),
  // Custom fields need dynamic validation setup if required, skipped for now
  // customFields: z.record(z.any()).optional(), 
})

type MemberFormValues = z.infer<ReturnType<typeof createFormSchema>>

export function MemberForm() {
  const { showToast } = useToast()
  // Load members and common namespaces
  const { t } = useTranslation(['members', 'common']);

  // Create the schema instance inside the component where t is available
  const formSchema = createFormSchema(t);

  const methods = useForm<MemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      smsConsent: false,
      relationshipStatus: "visitor",
    },
  })

  const { handleSubmit, formState: { isSubmitting }, reset } = methods

  const onSubmit = async (data: MemberFormValues) => {
    console.log("Form submitted:", data)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      // Use members namespace for form-specific messages
      showToast(`${t("members:memberForm.successTitle")}: ${t("members:memberForm.successMessage")}`, "success")
      reset()
    } catch (error) {
      console.error("Error submitting form:", error)
       // Use members namespace
      showToast(`${t("members:memberForm.errorTitle")}: ${t("members:memberForm.errorMessage")}`, "error")
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="mb-6">
          {/* Use members namespace */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("members:memberForm.formTitle")}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t("members:memberForm.formSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <PersonalInfoSection />
          <RelationshipSection />
          <LifeStageSection />
          <MinistriesSelector />
          <ServiceTimesSelector />
          <ReferralSection />
          <PrayerRequestSection />
          <CustomFieldsSection />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {/* Use members namespace */}
              {isSubmitting ? t("members:memberForm.submitting") : t("members:memberForm.submit")}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  )
}
