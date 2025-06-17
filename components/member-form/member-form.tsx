"use client"

import type React from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslation } from "react-i18next"
import { TFunction } from "i18next" // For explicit t function type
import { toast as sonnerToast } from 'sonner'

import { useFormConfig } from "./form-config-context" // If used
import { PersonalInfoSection } from "./personal-info-section"
import { AddressSection } from "./address-section" // Assuming you have this for address fields
// Import other sections if MemberForm uses them:
// import { RelationshipSection } from "./relationship-section"
import { LifeStageSection } from "./life-stage-section"
import { MinistriesSelector } from "./ministries-selector"
import { ServiceTimesSelector } from "./service-times-selector"
// import { ReferralSection } from "./referral-section"
// import { PrayerRequestSection } from "./prayer-request-section"
// import { CustomFieldsSection } from "./custom-fields-section"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast" // Or sonner if that's the standard

// Interface for pre-translated messages
export interface PhoneValidationMessages {
  invalidPhoneNumeric: string;
  invalidPhoneDigits: string;
}

// Define the schema using a function to access translations
export const createFormSchema = (t: TFunction<"members" | "common">, phoneMessages: PhoneValidationMessages) => z.object({
  firstName: z.string().min(1, { message: t('common:errors.required', { ns: 'common' }) }),
  lastName: z.string().min(1, { message: t('common:errors.required', { ns: 'common' }) }),
  email: z.string().email({ message: t('common:errors.invalidEmail', { ns: 'common' }) }),
  phone: z.string()
    .optional()
    .superRefine((val, ctx) => {
      if (val === undefined || val === null || val.trim() === "") {
        return; // Allow empty or undefined values
      }

      const trimmedVal = val.trim();

      // Check for any alphabetic characters
      if (/[a-zA-Z]/.test(trimmedVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneMessages.invalidPhoneNumeric,
        });
        return; // Stop further validation if non-numeric (alpha) characters are found
      }

      // Remove all non-digit characters (keeps only numbers)
      const digits = trimmedVal.replace(/\D/g, '');

      if (digits.length !== 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneMessages.invalidPhoneDigits,
        });
      }
    }),
  // smsConsent: z.boolean().optional(),
  membershipStatus: z.string().optional(), // Example: "visitor", "member", "inactive"
  joinDate: z.date().nullable().optional(),

  // Fields from the old add-member-modal and likely needed for a new member
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  language: z.string().optional(), // Example: "english", "spanish"

  // Optional: Other fields from the more comprehensive MemberFormValues if applicable to new members
  lifeStage: z.string().optional(),
  referralSource: z.string().optional(),
  prayerRequested: z.boolean().optional(),
  prayerRequest: z.string().optional(),
  interestedMinistries: z.array(z.string()).optional(), 
  serviceTimes: z.array(z.string()).optional(),
  memberNotes: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  // Add any other fields that are part of MemberFormValues and relevant for new member creation
});

export type MemberFormValues = z.infer<ReturnType<typeof createFormSchema>>;

// Optional: If MemberForm component itself is defined in this file
// This is a basic structure; adapt if your MemberForm is more complex or defined elsewhere.
export function MemberForm({ onSubmitSuccess }: { onSubmitSuccess?: (data: MemberFormValues) => void }) {
  const { toast } = useToast(); // Or sonner's toast
  const { t } = useTranslation(['members', 'common']);
  // const { config } = useFormConfig(); // Uncomment if useFormConfig is used

  const commonErrors = t('errors', { ns: 'common', returnObjects: true }) as { invalidPhoneNumeric: string; invalidPhoneDigits: string; [key: string]: string };

  const phoneMessages: PhoneValidationMessages = {
    invalidPhoneNumeric: commonErrors.invalidPhoneNumeric || 'common:errors.invalidPhoneNumeric', // Fallback for safety
    invalidPhoneDigits: commonErrors.invalidPhoneDigits || 'common:errors.invalidPhoneDigits'      // Fallback for safety
  };

  const formSchemaInstance = createFormSchema(t, phoneMessages);

  const methods = useForm<MemberFormValues>({
    resolver: zodResolver(formSchemaInstance),
    mode: 'onChange',
    defaultValues: { // Ensure these defaults match the schema and are sensible
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      membershipStatus: "visitor",
      joinDate: null,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      language: "spanish",
      lifeStage: "",
      referralSource: "",
      prayerRequested: false,
      prayerRequest: "",
      interestedMinistries: [],
      serviceTimes: [],
      memberNotes: "",
      preferredContactMethod: "email",
    },
  });

  const { handleSubmit, formState: { isSubmitting }, reset } = methods;

  const processSubmit = async (data: MemberFormValues) => {
    console.log("MemberForm submitted:", data);
    try {
      // This is a placeholder for actual submission logic (e.g., API call)
      // For a reusable MemberForm, the actual API call might be passed in or handled by a parent.
      await new Promise((resolve) => setTimeout(resolve, 1000)); 
      
      // Using shadcn/ui toast by default, adapt if using sonner
      sonnerToast.success(t("members:memberForm.successTitle", "Success"), {
        description: t("members:memberForm.successMessage", "Form submitted successfully."),
      });
      reset();
      onSubmitSuccess?.(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      sonnerToast.error(t("members:memberForm.errorTitle", "Error"), {
        description: t("members:memberForm.errorMessage", "Failed to submit form."),
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
        {/* These sections should be designed to work within a FormProvider context */}
        <PersonalInfoSection />
        <AddressSection /> 
        <LifeStageSection />
        <MinistriesSelector />
        <ServiceTimesSelector />
        {/* Add other sections like RelationshipSection etc. as needed */}
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("members:memberForm.submitting", "Submitting...") : t("members:memberForm.submit", "Submit")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}