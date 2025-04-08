"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"

export default function PreferencesStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding()

  const handleLanguageChange = (value: string) => {
    updateData({ language: value as "english" | "spanish" })
  }

  const handleThemeChange = (value: string) => {
    updateData({ theme: value as "light" | "dark" })
  }

  return (
    <div>
      <Stepper />

      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-2">Customize your experience</h2>
        <p className="text-gray-600 mb-8">Set your preferences for language and appearance.</p>

        <div className="max-w-2xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Language</h3>
              <p className="text-sm text-gray-600">Select your preferred language for the application.</p>

              <RadioGroup value={data.language} onValueChange={handleLanguageChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="english" />
                  <Label htmlFor="english">English</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spanish" id="spanish" />
                  <Label htmlFor="spanish">Spanish</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Theme</h3>
              <p className="text-sm text-gray-600">Choose the theme for your application.</p>

              <RadioGroup
                value={data.theme === "system" ? "light" : data.theme}
                onValueChange={handleThemeChange}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark">Dark</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex justify-between pt-8">
            <Button type="button" variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Save and Continue</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
