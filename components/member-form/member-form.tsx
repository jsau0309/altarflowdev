"use client"

import type React from "react"
import { useState } from "react"
import { useFormConfig } from "./form-config-context"
import { PersonalInfoSection } from "./personal-info-section"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { translations } from "./translations"

export function MemberForm() {
  const { config } = useFormConfig()
  const { toast } = useToast()
  const [formData, setFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [language, setLanguage] = useState("en")

  // Ensure we have a valid language or fallback to English
  const t = translations[language as keyof typeof translations] || translations.en

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("Form submitted:", formData)

      toast({
        title: t.successTitle,
        description: t.successMessage,
        variant: "default",
      })

      // Reset form
      setFormData({})
      const form = e.target as HTMLFormElement
      form.reset()
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: t.errorTitle,
        description: t.errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.formTitle}</h1>
        <p className="text-gray-600 dark:text-gray-300">{t.formSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <PersonalInfoSection handleChange={handleChange} language={language} />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </div>
      </form>
    </div>
  )
}
