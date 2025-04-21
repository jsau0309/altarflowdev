"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTranslation } from 'react-i18next'

export default function PreferencesStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding()
  const { t } = useTranslation()

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
        <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step3.title', 'Customize your experience')}</h2>
        <p className="text-gray-600 mb-8">{t('onboarding.step3.subtitle', 'Set your preferences for language and appearance.')}</p>

        <div className="max-w-2xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings.defaultLanguage', 'Language')}</h3>
              <p className="text-sm text-gray-600">{t('onboarding.step3.languageDescription', 'Select your preferred language for the application.')}</p>

              <RadioGroup value={data.language} onValueChange={handleLanguageChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="english" />
                  <Label htmlFor="english">{t('settings.languages.english', 'English')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spanish" id="spanish" />
                  <Label htmlFor="spanish">{t('settings.languages.spanish', 'Spanish')}</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings.theme', 'Theme')}</h3>
              <p className="text-sm text-gray-600">{t('onboarding.step3.themeDescription', 'Choose the theme for your application.')}</p>

              <RadioGroup
                value={data.theme === 'light' || data.theme === 'dark' ? data.theme : 'light'}
                onValueChange={handleThemeChange}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light">{t('layout.lightMode', 'Light')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark">{t('layout.darkMode', 'Dark')}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex justify-between pt-8">
            <Button type="button" variant="outline" onClick={prevStep}>
              {t('back', 'Back')}
            </Button>
            <Button onClick={nextStep}>{t('saveAndContinue', 'Save and Continue')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
