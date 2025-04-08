"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import DonationDetails from "./donation-details"
import DonationInfo from "./donation-info"
import DonationPayment from "./donation-payment"

export type DonationFormData = {
  amount: number
  donationType: "one-time" | "recurring"
  frequency?: "weekly" | "monthly" | "quarterly" | "annually"
  startDate?: string
  firstName?: string
  lastName?: string
  isAnonymous?: boolean
  email?: string
  phone?: string
  address?: string
  paymentMethod?: "card" | "bank" | "google-pay" | "apple-pay"
  coverFees?: boolean
  campaignId?: string
  campaignName?: string
}

const initialFormData: DonationFormData = {
  amount: 100,
  donationType: "one-time",
  campaignId: "tithe", // Default to Tithe
  campaignName: "Tithe",
}

export default function DonationForm() {
  const [formData, setFormData] = useState<DonationFormData>(initialFormData)
  const [step, setStep] = useState(1)

  const updateFormData = (data: Partial<DonationFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const nextStep = () => {
    setStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setStep((prev) => prev - 1)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <DonationDetails formData={formData} updateFormData={updateFormData} onNext={nextStep} />
      case 2:
        return <DonationInfo formData={formData} updateFormData={updateFormData} onNext={nextStep} onBack={prevStep} />
      case 3:
        return <DonationPayment formData={formData} updateFormData={updateFormData} onBack={prevStep} />
      default:
        return <div>Something went wrong.</div>
    }
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} />
      {renderStep()}
    </div>
  )
}

interface StepperProps {
  currentStep: number
}

function Stepper({ currentStep }: StepperProps) {
  const steps = [
    { id: 1, name: "Details" },
    { id: 2, name: "Info" },
    { id: 3, name: "Donate" },
  ]

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <StepIndicator step={step.id} currentStep={currentStep} label={step.name} />
          {index < steps.length - 1 && <StepConnector completed={currentStep > step.id} />}
        </div>
      ))}
    </div>
  )
}

interface StepIndicatorProps {
  step: number
  currentStep: number
  label: string
}

function StepIndicator({ step, currentStep, label }: StepIndicatorProps) {
  const isActive = step === currentStep
  const isCompleted = currentStep > step

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${isActive ? "bg-blue-600 border-4 border-gray-300 dark:border-gray-600" : ""}
        ${isCompleted ? "bg-blue-600" : ""}
        ${!isActive && !isCompleted ? "bg-gray-200 dark:bg-gray-700" : ""}
      `}
      >
        {isCompleted && <Check className="h-5 w-5 text-white" />}
        {isActive && <div className="w-4 h-4 rounded-full bg-white"></div>}
      </div>
      <span className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">{label}</span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className="flex-1 h-px mx-2 w-16">
      <div className={`h-full ${completed ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}></div>
    </div>
  )
}
