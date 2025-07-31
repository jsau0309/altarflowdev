"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CampaignProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function CampaignProgress({ currentStep }: CampaignProgressProps) {
  const { t } = useTranslation(['communication']);
  
  const steps = [
    { number: 1, title: t('communication:stepper.step1.title'), description: t('communication:stepper.step1.description') },
    { number: 2, title: t('communication:stepper.step2.title'), description: t('communication:stepper.step2.description') },
    { number: 3, title: t('communication:stepper.step3.title'), description: t('communication:stepper.step3.description') },
    { number: 4, title: t('communication:stepper.step4.title'), description: t('communication:stepper.step4.description') },
  ];
  return (
    <div className="w-full py-4 mb-2">
      <div className="bg-muted/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step.number < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.number === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.number < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      step.number <= currentStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 -mt-5 transition-colors",
                    step.number < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}