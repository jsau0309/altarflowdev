"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = React.useState(false);

  const changeLanguage = async (lng: string) => {
    try {
      setIsChanging(true);
      await i18n.changeLanguage(lng);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Get translated language name for the current language
  const currentLanguageName = i18n.language === 'es' 
    ? t('settings.languages.spanish', 'Spanish') 
    : t('settings.languages.english', 'English');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isChanging}>
          <Languages className={`h-[1.2rem] w-[1.2rem] ${isChanging ? 'animate-spin' : ''}`} />
          <span className="sr-only">{t('languageToggle.toggleLabel', { language: currentLanguageName })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage("en")}
          disabled={isChanging || i18n.language === 'en'}
          className={i18n.language === 'en' ? 'bg-accent' : ''}
        >
          {t('settings.languages.english', 'English')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage("es")}
          disabled={isChanging || i18n.language === 'es'}
          className={i18n.language === 'es' ? 'bg-accent' : ''}
        >
          {t('settings.languages.spanish', 'Spanish')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 