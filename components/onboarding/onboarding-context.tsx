"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

type OnboardingData = {
  // Church details
  churchName: string
  address: string
  phone: string
  email: string
  website: string

  // Preferences
  language: "english" | "spanish"
  theme: "light" | "dark"
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

type OnboardingContextType = {
  currentStep: number
  data: OnboardingData
  updateData: (newData: Partial<OnboardingData>) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  isStepComplete: (step: number) => boolean
  showToast: (message: string) => void
}

const defaultData: OnboardingData = {
  churchName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  language: "english",
  theme: "light",
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { showToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(defaultData)

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }))
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1)
      router.push(`/onboarding/step-${currentStep + 1}`)

      // Show success toast when moving to next step
      if (currentStep === 2) {
        showToast(t('onboarding.context.churchDetailsSaved', "Church details saved successfully"), "success")
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      router.push(`/onboarding/step-${currentStep - 1}`)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4 && isStepComplete(step - 1)) {
      setCurrentStep(step)
      router.push(`/onboarding/step-${step}`)
    }
  }

  const isStepComplete = (step: number) => {
    switch (step) {
      case 0: // Before first step
        return true
      case 1: // First step is always complete
        return true
      case 2: // Church details
        return !!data.churchName && !!data.address && !!data.phone && !!data.email
      case 3: // Preferences
        return true
      default:
        return false
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        data,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        isStepComplete,
        showToast: (message) => showToast(message, "success"),
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider")
  }
  return context
}
