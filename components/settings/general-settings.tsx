"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Globe, Moon, Sun } from "lucide-react";

// Helper to set a cookie
const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') {
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
};

export function GeneralSettings() {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedTheme, setSelectedTheme] = useState(theme || "light");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === i18n.language) return;
    
    try {
      setIsChangingLanguage(true);
      setCookie('NEXT_LOCALE', newLanguage, 365);
      await i18n.changeLanguage(newLanguage);
      router.refresh();
      toast.success(t('settings:general.languageChanged', 'Language updated successfully'));
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error(t('settings:general.languageChangeFailed', 'Failed to update language'));
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const handleThemeChange = async () => {
    if (selectedTheme === theme) return;
    
    try {
      setIsSavingTheme(true);
      setTheme(selectedTheme);
      toast.success(t('settings:general.themeChanged', 'Theme updated successfully'));
    } catch (error) {
      console.error('Failed to change theme:', error);
      toast.error(t('settings:general.themeChangeFailed', 'Failed to update theme'));
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings:general.language', 'Language')}
          </CardTitle>
          <CardDescription>
            {t('settings:general.languageDescription', 'Choose your preferred language for the interface')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language-select">
              {t('settings:general.displayLanguage', 'Display Language')}
            </Label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              disabled={isChangingLanguage}
            >
              <SelectTrigger id="language-select" className="w-full md:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🇺🇸</span>
                    {t('settings:languages.english', 'English')}
                  </span>
                </SelectItem>
                <SelectItem value="es">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🇪🇸</span>
                    {t('settings:languages.spanish', 'Español')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => handleLanguageChange(selectedLanguage)}
              disabled={isChangingLanguage || selectedLanguage === i18n.language}
            >
              {isChangingLanguage 
                ? t('settings:general.saving', 'Saving...') 
                : t('settings:general.saveChanges', 'Save Changes')}
            </Button>
            {selectedLanguage !== i18n.language && (
              <p className="text-sm text-muted-foreground">
                {t('settings:general.unsavedChanges', 'You have unsaved changes')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            {t('settings:general.appearance', 'Appearance')}
          </CardTitle>
          <CardDescription>
            {t('settings:general.appearanceDescription', 'Customize how Altarflow looks on your device')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-select">
              {t('settings:general.theme', 'Theme')}
            </Label>
            <Select
              value={selectedTheme}
              onValueChange={setSelectedTheme}
              disabled={isSavingTheme}
            >
              <SelectTrigger id="theme-select" className="w-full md:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t('settings:general.lightTheme', 'Light')}
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t('settings:general.darkTheme', 'Dark')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={handleThemeChange}
              disabled={isSavingTheme || selectedTheme === theme}
            >
              {isSavingTheme 
                ? t('settings:general.saving', 'Saving...') 
                : t('settings:general.saveChanges', 'Save Changes')}
            </Button>
            {selectedTheme !== theme && (
              <p className="text-sm text-muted-foreground">
                {t('settings:general.unsavedChanges', 'You have unsaved changes')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}