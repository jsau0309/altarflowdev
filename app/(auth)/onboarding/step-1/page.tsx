"use client"

import { Building2, ArrowRight, Check, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function WelcomeStep() {
  const { nextStep } = useOnboarding()

  return (
    <div>
      <Stepper />

      <div className="p-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary" />
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">Welcome, there!</h2>
        <p className="text-gray-600 text-center mb-10 max-w-md">
          Let's set up your church on Altarflow. This will only take a few minutes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg mb-10">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <h3 className="text-center font-medium mb-1">Your account</h3>
            <p className="text-sm text-gray-500 text-center">You've created your personal account</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
            </div>
            <h3 className="text-center font-medium mb-1">Church details</h3>
            <p className="text-sm text-gray-500 text-center">Add information about your church</p>
          </div>
        </div>

        <Button onClick={nextStep} className="px-6">
          Continue to Church Details <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>

      <div className="p-8 flex flex-col items-center">
        <h3 className="text-2xl font-semibold text-center mb-2">Language</h3>
        <RadioGroup defaultValue="es" className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="es" id="es" />
            <Label htmlFor="es">Español</Label>
          </div>
        </RadioGroup>

        <p className="text-sm text-muted-foreground mt-2">
          This helps us tailor the experience to your church&apos;s primary language.
        </p>
      </div>

      <div className="p-8 flex flex-col items-center">
        <h3 className="text-2xl font-semibold text-center mb-2">Contact Information</h3>
        <p className="text-muted-foreground">
          Provide the primary contact information for your church. We&apos;ll use this for important communications.
        </p>
      </div>
    </div>
  )
}
