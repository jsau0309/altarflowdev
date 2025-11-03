"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LanguageSwitcher({
  variant = 'compact',
  className = ''
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  // Update local state when i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lang: string) => {
      setCurrentLang(lang);
    };

    // Subscribe to language change events
    i18n.on('languageChanged', handleLanguageChanged);

    // Set initial language
    setCurrentLang(i18n.language);

    // Cleanup: unsubscribe on unmount
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Languages className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            currentLang === 'en'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Switch to English"
        >
          EN
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={() => handleLanguageChange('es')}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            currentLang === 'es'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Cambiar a Español"
        >
          ES
        </button>
      </div>
    );
  }

  // Full variant with labels
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Languages className="h-4 w-4" />
        Language / Idioma
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            currentLang === 'en'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
          aria-label="Switch to English"
        >
          English
        </button>
        <button
          onClick={() => handleLanguageChange('es')}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            currentLang === 'es'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
          aria-label="Cambiar a Español"
        >
          Español
        </button>
      </div>
    </div>
  );
}
