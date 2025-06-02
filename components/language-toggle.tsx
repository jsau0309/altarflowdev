"use client";

import * as React from "react";

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
        <Button 
          size="icon" 
          disabled={isChanging}
          className="bg-white/60 dark:bg-slate-800/60 border border-slate-400/50 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
        >
          <span className={`text-base font-semibold tracking-wider ${isChanging ? 'animate-spin' : ''}`}>
            {i18n.language === 'en' ? 'ENG' : i18n.language === 'es' ? 'ESP' : 'Lang'}
          </span>
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