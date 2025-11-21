"use client"


import React, { useEffect, useState } from "react"
import { Loader2 } from "lucide-react" // CalendarIcon might be used by sections
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// cn might be used by sections or for styling, keep if necessary
// import { cn } from "@/lib/utils" 
import type { MemberFormValues, PhoneValidationMessages } from "../member-form/member-form";
import { createFormSchema } from "../member-form/member-form";
import { PersonalInfoSection } from '../member-form/personal-info-section'
import { AddressSection } from '../member-form/address-section'
import { LifeStageSection } from '../member-form/life-stage-section'
import { MembershipInfoSection } from "../member-form/membership-info-section"
import { MinistriesSelector } from '../member-form/ministries-selector'
import { ServiceTimesSelector } from '../member-form/service-times-selector'
import { getFlowConfiguration } from "@/lib/actions/flows.actions"
import type { Ministry, ServiceTime } from "@/components/member-form/types"

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newMember: unknown) => void;
}

export function AddMemberModal({ open, onClose, onSuccess }: AddMemberModalProps) {
  const [ministryOptions, setMinistryOptions] = useState<Ministry[]>([]);
  const [serviceTimeOptions, setServiceTimeOptions] = useState<ServiceTime[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const { t } = useTranslation(['members', 'common'])
  const [isApiSubmitting, setIsApiSubmitting] = useState(false);

  const commonErrors = t('errors', { ns: 'common', returnObjects: true }) as { invalidPhoneNumeric: string; invalidPhoneDigits: string; [key: string]: string };

  const phoneMessages: PhoneValidationMessages = {
    invalidPhoneNumeric: commonErrors.invalidPhoneNumeric || 'common:errors.invalidPhoneNumeric', // Fallback for safety
    invalidPhoneDigits: commonErrors.invalidPhoneDigits || 'common:errors.invalidPhoneDigits'      // Fallback for safety
  };

  const formSchemaInstance = createFormSchema(t, phoneMessages);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(formSchemaInstance),
    defaultValues: {
      // These defaults MUST align with MemberFormValues from member-form.tsx's schema
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
      lifeStage: "", // Or undefined, depending on preference
      interestedMinistries: [],
      serviceTimes: [],
      referralSource: "",
      prayerRequested: false,
      prayerRequest: "",
      memberNotes: "",
      preferredContactMethod: "email",
    },
    mode: 'onChange', 
  });

  const { handleSubmit, reset, formState } = form;
  const { isSubmitting: isFormProcessing } = formState; // isSubmitting from RHF includes validation and async submit

  useEffect(() => {
    async function fetchConfig() {
      if (!open) return; // Only fetch if modal is open
      setIsLoadingConfig(true);
      setConfigError(null);
      try {
        const config = await getFlowConfiguration(); // Assumes NEW_MEMBER flow by default
        if (config) {
          setMinistryOptions(config.ministries || []);
          setServiceTimeOptions(config.serviceTimes || []);
        } else {
          setConfigError(t("common:errors.failedToLoadConfig", "Failed to load configuration."));
        }
      } catch (error) {
        console.error('Error fetching flow configuration:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        setConfigError(t("common:errors.failedToLoadConfig", "Failed to load configuration."));
      } finally {
        setIsLoadingConfig(false);
      }
    }

    fetchConfig();
  }, [open, t]);

  const onSubmit = async (data: MemberFormValues) => {
    setIsApiSubmitting(true);

    const dataToSend = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      joinDate: data.joinDate ? new Date(data.joinDate).toISOString() : null,
      membershipStatus: data.membershipStatus || "visitor", 
      language: data.language,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      // New member interest fields
      life_stage: data.lifeStage || null,
      ministry_interests: data.interestedMinistries || [],
      preferred_service_times: data.serviceTimes || [],
      // Other optional fields (ensure these are correctly handled if included)
      // referralSource: data.referralSource || null,
      // prayerRequested: data.prayerRequested || false, // Assuming boolean
      // prayerRequest: data.prayerRequest || null,
      // memberNotes: data.memberNotes || null,
      // preferredContactMethod: data.preferredContactMethod || null,
    };

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        onSuccess?.(data); // Pass new member data to onSuccess callback
        onClose(); 
        toast.success(t('members:modal.addSuccessTitle', 'Member Added'), {
          description: t('members:modal.addSuccessMessage', 'The new member has been added successfully.'),
        });
        reset(); 
      } else {
        let errorMessage = t('members:modal.addErrorMessage', 'Failed to add member. Please check the details and try again.');
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || (errorData.details ? JSON.stringify(errorData.details) : errorMessage);
        } catch {
          errorMessage = `${t('common:httpError', 'HTTP error!')} status: ${response.status}`;
        }
        toast.error(t('members:modal.addErrorTitle', 'Error Adding Member'), {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('Error submitting form:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t('members:modal.addErrorTitle', 'Error Adding Member'), {
        description: t('common:networkError', 'A network error occurred. Please try again.'),
      });
    } finally {
      setIsApiSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isApiSubmitting && !isFormProcessing) { 
      reset(); 
      onClose(); 
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseDialog();
        }
      }}
    >
      <DialogContent className="w-full h-full sm:max-w-[700px] sm:max-h-[90vh] sm:h-auto overflow-hidden flex flex-col p-0 sm:p-6 sm:rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-0 sm:pt-0 sm:pb-4">
          <DialogTitle className="mb-2">{t('members:newMember')}</DialogTitle>
          <DialogDescription>
            {t('members:modal.description')}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <div className="overflow-y-auto overflow-x-hidden px-6 sm:px-1 flex-grow"> {/* Added scroll for content overflow */}
            <form id="add-member-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
              <PersonalInfoSection />
              <AddressSection />
              <MembershipInfoSection />
              {configError && <p className="text-sm text-red-500 py-2">{configError}</p>}
              <LifeStageSection />
              <MinistriesSelector options={ministryOptions} isLoading={isLoadingConfig} />
              <ServiceTimesSelector options={serviceTimeOptions} isLoading={isLoadingConfig} />
              {/* Add other sections like RelationshipSection, etc., if needed for this modal */}
            </form>
          </div>
        </FormProvider>
        
        <DialogFooter className="pt-4 pb-6 px-6 mt-auto border-t sm:px-0 sm:pb-0 flex-col-reverse sm:flex-row gap-2"> {/* Ensure footer is at bottom */}
          <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isApiSubmitting || isFormProcessing} className="w-full sm:w-auto">
            {t('common:cancel')}
          </Button>
          <Button type="submit" form="add-member-form" disabled={isApiSubmitting || isFormProcessing} className="w-full sm:w-auto">
            {(isApiSubmitting || isFormProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:addMember')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}