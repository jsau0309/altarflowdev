"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import type { FormConfig } from "./types"
import { defaultSettings } from "./types"; // Import defaultSettings

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
  ministries: [
    { id: "m1", name: "Youth Group", description: "Weekly meetings for teens", isActive: true },
    { id: "m2", name: "Worship Team", description: "Singers and musicians", isActive: true },
    { id: "m3", name: "Community Outreach", description: "Serving the local area", isActive: true },
    { id: "m4", name: "Seniors Club", description: "", isActive: false },
  ],
  serviceTimes: [
    { id: "s1", day: "Sunday", time: "9:00 AM", description: "Main Service", isActive: true },
    { id: "s2", day: "Sunday", time: "11:00 AM", description: "Contemporary Service", isActive: true },
    { id: "s3", day: "Wednesday", time: "7:00 PM", description: "Midweek Prayer", isActive: true },
    { id: "s4", day: "Saturday", time: "5:00 PM", description: "Youth Service", isActive: false },
  ],
  submitButtonText: "Submit",
  successMessage: "Thank you for connecting with us!",
  errorMessage: "There was an error submitting your form. Please try again.",
  churchName: "Your Church",
  churchLogo: "/placeholder.svg?height=100&width=100",
  primaryColor: "#4F46E5",
  secondaryColor: "#10B981",
  fontFamily: "Inter, sans-serif",
  settings: defaultSettings, 
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
