"use client"


import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { safeStorage } from "@/lib/safe-storage"

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    
    // Use safe storage with error handling
    const result = safeStorage.setItem('i18nextLng', lang)
    if (!result.success) {
      // Language changed for this session, but preference won't persist
      console.log('Language preference will not persist across sessions', { operation: 'ui.language.info' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={i18n.language === 'en' ? 'bg-gray-100' : ''}
        >
          🇺🇸 English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('es')}
          className={i18n.language === 'es' ? 'bg-gray-100' : ''}
        >
          🇪🇸 Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}