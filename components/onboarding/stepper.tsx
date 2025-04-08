"use client"

import { Check } from "lucide-react"
import { useOnboarding } from "./onboarding-context"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, name: "Welcome" },
  { id: 2, name: "Church Details" },
  { id: 3, name: "Preferences" },
  { id: 4, name: "Complete" },
]

export function Stepper() {
  const { currentStep, goToStep, isStepComplete } = useOnboarding()

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                currentStep === step.id
                  ? "bg-primary text-white"
                  : currentStep > step.id || isStepComplete(step.id)
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-600",
              )}
              onClick={() => isStepComplete(step.id - 1) && goToStep(step.id)}
            >
              {currentStep > step.id || (step.id !== currentStep && isStepComplete(step.id)) ? (
                <Check className="w-4 h-4" />
              ) : (
                step.id
              )}
            </div>
            <div className="ml-2 text-sm text-gray-600">{step.name}</div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-4 min-w-[4rem]",
                  currentStep > index + 1 || isStepComplete(index + 2) ? "bg-primary" : "bg-gray-200",
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
