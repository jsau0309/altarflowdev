"use client"
import { Button } from "@/components/ui/button"
import { translations } from "./translations"

interface LanguageToggleProps {
  language: string
  setLanguage: (language: string) => void
}

export function LanguageToggle({ language, setLanguage }: LanguageToggleProps) {
  // Ensure we have a valid language or fallback to English
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <div className="flex space-x-2">
      <Button variant={language === "en" ? "default" : "outline"} size="sm" onClick={() => setLanguage("en")}>
        {t.language.en}
      </Button>
      <Button variant={language === "es" ? "default" : "outline"} size="sm" onClick={() => setLanguage("es")}>
        {t.language.es}
      </Button>
    </div>
  )
}
