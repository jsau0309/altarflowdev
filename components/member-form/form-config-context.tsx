"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import type { FormConfig } from "./types"

// Default configuration
const defaultConfig: FormConfig = {
  formTitle: "Connect Card",
  formSubtitle: "We're glad you're here! Please fill out this card so we can get to know you better.",
  language: "en",
  showPersonalInfo: true,
  showRelationship: true,
  showLifeStage: true,
  showReferral: true,
  showPrayerRequest: true,
  showCustomFields: false,
  customFields: [],
  submitButtonText: "Submit",
  successMessage: "Thank you for connecting with us!",
  errorMessage: "There was an error submitting your form. Please try again.",
  churchName: "Your Church",
  churchLogo: "/placeholder.svg?height=100&width=100",
  primaryColor: "#4F46E5",
  secondaryColor: "#10B981",
  fontFamily: "Inter, sans-serif",
}

// Create context
const FormConfigContext = createContext<{
  config: FormConfig
  updateConfig: (newConfig: Partial<FormConfig>) => void
}>({
  config: defaultConfig,
  updateConfig: () => {},
})

// Provider component
export function FormConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<FormConfig>(defaultConfig)

  const updateConfig = (newConfig: Partial<FormConfig>) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      ...newConfig,
    }))
  }

  return <FormConfigContext.Provider value={{ config, updateConfig }}>{children}</FormConfigContext.Provider>
}

// Hook for using the context
export function useFormConfig() {
  const context = useContext(FormConfigContext)
  if (!context) {
    throw new Error("useFormConfig must be used within a FormConfigProvider")
  }
  return context
}
