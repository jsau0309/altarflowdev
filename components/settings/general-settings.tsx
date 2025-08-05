"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Globe, Moon, Sun, Building, Loader2, Lock } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";

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
  const { getToken, orgRole } = useAuth();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedTheme, setSelectedTheme] = useState(theme || "light");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [churchProfile, setChurchProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
  });
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  
  // Check if user has admin permissions
  const isAdmin = orgRole === 'org:admin';
  const canEditProfile = isAdmin;

  useEffect(() => {
    const fetchChurchProfile = async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/settings/church-profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setChurchProfile({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            website: data.website || "",
          });
        } else {
          toast.error(t('settings:general.profileLoadFailed', 'Failed to load church profile'));
        }
      } catch (error) {
        console.error('Failed to fetch church profile:', error);
        toast.error(t('settings:general.profileLoadFailed', 'Failed to load church profile'));
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchChurchProfile();
  }, [getToken, t]);

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

  const handleProfileChange = (field: string, value: string) => {
    setChurchProfile(prev => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const token = await getToken();
      
      const response = await fetch("/api/settings/church-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(churchProfile),
      });

      if (response.ok) {
        toast.success(t('settings:general.profileSaved', 'Church profile updated successfully'));
        setHasProfileChanges(false);
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          toast.error(t('settings:general.profilePermissionDenied', 'You do not have permission to update church settings. Only administrators can make these changes.'));
        } else {
          throw new Error(errorData.error || 'Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Failed to save church profile:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        toast.error(error.message);
      } else {
        toast.error(t('settings:general.profileSaveFailed', 'Failed to update church profile'));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Church Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {t('settings:general.churchProfile', 'Church Profile')}
          </CardTitle>
          <CardDescription>
            {t('settings:general.churchProfileDescription', 'Manage your church information')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <LoaderOne />
            </div>
          ) : (
            <>
              {!canEditProfile && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    {t('settings:general.profileReadOnly', 'You have view-only access to church settings. Contact an administrator to make changes.')}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="church-name">
                    {t('settings:general.churchName', 'Church Name')}
                  </Label>
                  <Input
                    id="church-name"
                    value={churchProfile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    placeholder="First Baptist Church"
                    disabled={!canEditProfile}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="church-email">
                    {t('settings:general.churchEmail', 'Email')}
                  </Label>
                  <Input
                    id="church-email"
                    type="email"
                    value={churchProfile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="contact@church.org"
                    disabled={!canEditProfile}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="church-phone">
                    {t('settings:general.churchPhone', 'Phone')}
                  </Label>
                  <Input
                    id="church-phone"
                    type="tel"
                    value={churchProfile.phone}
                    onChange={(e) => {
                      // Only allow digits and limit to 10 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      handleProfileChange('phone', value);
                    }}
                    placeholder="5551234567"
                    maxLength={10}
                    disabled={!canEditProfile}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings:general.phoneNote', 'Enter 10 digits only (no spaces or special characters)')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="church-website">
                    {t('settings:general.churchWebsite', 'Website')}
                  </Label>
                  <Input
                    id="church-website"
                    type="url"
                    value={churchProfile.website}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                    placeholder="https://yourchurch.org"
                    disabled={!canEditProfile}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="church-address">
                  {t('settings:general.churchAddress', 'Address')}
                </Label>
                <Textarea
                  id="church-address"
                  value={churchProfile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  placeholder="123 Church Street\nCity, State 12345"
                  rows={3}
                  className="resize-none"
                  disabled={!canEditProfile}
                />
                <p className="text-sm text-muted-foreground">
                  {t('settings:general.addressNote', 'This address appears on tax receipts and email communications')}
                </p>
              </div>
              
              {canEditProfile && (
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || !hasProfileChanges}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('settings:general.saving', 'Saving...')}
                      </>
                    ) : (
                      t('settings:general.saveChanges', 'Save Changes')
                    )}
                  </Button>
                  {hasProfileChanges && (
                    <p className="text-sm text-muted-foreground">
                      {t('settings:general.unsavedChanges', 'You have unsaved changes')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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