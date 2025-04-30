"use client"

import type React from "react"
import { useEffect } from "react";
// Remove imports related to useFormState, useFormStatus, server action, zod, custom inputs/labels if no longer needed
// import { useFormState, useFormStatus } from "react-dom";
// import { z } from 'zod';
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Loader2 } from "lucide-react"
// import { completeOnboardingAction, type OnboardingFormState } from '../actions';

import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { useTranslation } from 'react-i18next'
import { CreateOrganization } from "@clerk/nextjs"; // Import Clerk component

// Remove state definitions and button component if no longer needed
// const initialState: OnboardingFormState = { ... };
// function SubmitButton() { ... }

export default function ChurchDetailsStep() {
  // Remove useOnboarding data/updateData if not used for this specific step anymore
  // const { data, updateData, prevStep } = useOnboarding() 
  const { prevStep } = useOnboarding() // Keep prevStep if needed
  const { t } = useTranslation()

  // Remove formState logic
  // const [state, formAction] = useFormState(completeOnboardingAction, initialState);
  // const getFieldError = (...) => { ... };

  return (
    <div>
      <Stepper />

      <div className="p-8 flex flex-col items-center"> {/* Center the component */}
        <h2 className="text-2xl font-semibold mb-2 text-center">{t('onboarding.step2.clerk_title', 'Create Your Church Organization')}</h2>
        <p className="text-gray-600 mb-8 text-center">{t('onboarding.step2.clerk_subtitle', 'This will create your organization within Altarflow using Clerk.')}</p>

        {/* Remove the old form and error message display */}
        {/* {!state.success && state.message && (...)} */}
        {/* <form action={formAction} className="space-y-6 max-w-2xl"> ... </form> */}

        {/* Add Clerk's CreateOrganization component */}
        <CreateOrganization 
          afterCreateOrganizationUrl="/onboarding/step-3" // Redirect to Step 3 after successful creation
          // Optionally hide the personal account button if you only want orgs
          // skipInvitationScreen // Optionally skip inviting members immediately
        />

        {/* Optional: Add a back button if needed, outside the Clerk component */}
        <div className="mt-6">
            <Button type="button" variant="outline" onClick={prevStep}>
              {t('back', 'Back')}
            </Button>
        </div>
      </div>
    </div>
  )
}
