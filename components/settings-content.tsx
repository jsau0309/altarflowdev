"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormSettings } from "./settings/form-settings"
import { UsersPermissionsContent } from "./users-permissions-content"
import { useState } from "react"
import { useTranslation } from 'react-i18next'
// Assuming react-hot-toast is used, adjust if necessary
// import toast from 'react-hot-toast'; 

// Define a type for the church profile data
interface ChurchProfileData {
  name: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
}

// Define props for the component
interface SettingsContentProps {
  initialChurchProfile: ChurchProfileData;
}

export function SettingsContent({ initialChurchProfile }: SettingsContentProps) {
  const { i18n, t } = useTranslation(['settings', 'common'])
  // Initialize state directly from the prop
  const [churchProfile, setChurchProfile] = useState<ChurchProfileData>({
    name: initialChurchProfile.name || "", 
    phone: initialChurchProfile.phone || "",
    address: initialChurchProfile.address || "",
    website: initialChurchProfile.website || "",
  })
  // Remove isLoading state
  // const [isLoading, setIsLoading] = useState(true); 
  const [isSaving, setIsSaving] = useState(false);  // Saving state for updates

  // Remove useEffect for fetching data
  /*
  useEffect(() => {
    const fetchProfile = async () => {
      // ... fetch logic removed ...
    };
    fetchProfile();
  }, [t]);
  */

  const handleChurchProfileChange = (field: keyof ChurchProfileData, value: string) => {
    setChurchProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveChurchProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/church-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(churchProfile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const updatedData: ChurchProfileData = await response.json();
      setChurchProfile({
        name: updatedData.name || "",
        phone: updatedData.phone || "",
        address: updatedData.address || "",
        website: updatedData.website || "",
      });

      // Remove success alert
      // alert(t('settings:settingsContent.churchProfile.saveSuccess', 'Church profile saved successfully!'));
    } catch (error) {
      console.error("Failed to save church profile:", error);
      const message = error instanceof Error ? error.message : 'Failed to save church profile.';
      // Remove error alert
      // alert(t('settings:settingsContent.churchProfile.saveError', message));
    } finally {
      setIsSaving(false);
    }
  }

  // Remove loading state return
  /*
  if (isLoading) {
    return <div className="container mx-auto py-6">{t('common:loading', 'Loading...')}</div>; 
  }
  */

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('settings:title')}</h1>
        <p className="text-muted-foreground">{t('settings:settingsContent.subtitle')}</p>
      </div>

      <Tabs defaultValue="church-profile">
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full">
            <TabsTrigger value="church-profile" className="flex-1 whitespace-nowrap">
              {t('settings:settingsContent.tabs.churchProfile')}
            </TabsTrigger>
            <TabsTrigger value="users-permissions" className="flex-1 whitespace-nowrap">
              {t('settings:users')}
            </TabsTrigger>
            <TabsTrigger value="visitor-form" className="flex-1 whitespace-nowrap">
              {t('settings:settingsContent.tabs.visitorForm')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="church-profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:church')}</CardTitle>
              <CardDescription>{t('settings:settingsContent.churchProfile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="church-name">{t('settings:churchName')}</Label>
                  <Input
                    id="church-name"
                    value={churchProfile.name}
                    onChange={(e) => handleChurchProfileChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings:churchPhone')}</Label>
                  <Input
                    id="phone"
                    value={churchProfile.phone ?? ''}
                    onChange={(e) => handleChurchProfileChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">{t('settings:churchAddress')}</Label>
                  <Input
                    id="address"
                    value={churchProfile.address ?? ''}
                    onChange={(e) => handleChurchProfileChange("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">{t('settings:settingsContent.churchProfile.websiteLabel', 'Website')}</Label>
                  <Input
                    id="website"
                    value={churchProfile.website ?? ''}
                    onChange={(e) => handleChurchProfileChange("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <Button onClick={handleSaveChurchProfile} className="mt-4" disabled={isSaving}>
                {isSaving ? t('common:saving', 'Saving...') : t('settings:settingsContent.churchProfile.saveButton')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users-permissions">
          <UsersPermissionsContent />
        </TabsContent>

        <TabsContent value="visitor-form">
          <FormSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
