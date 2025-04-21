"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormSettings } from "./settings/form-settings"
import { UsersPermissionsContent } from "./users-permissions-content"
import { useState } from "react"
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function SettingsContent() {
  const { i18n, t } = useTranslation(['settings', 'common'])
  const [churchProfile, setChurchProfile] = useState({
    name: "Faith Community Church",
    phone: "(555) 123-4567",
    address: "123 Faith Street",
    city: "New Hope",
    state: "CA",
    zip: "95123",
    about:
      "Faith Community Church is a welcoming congregation dedicated to serving our community through faith and action.",
  })

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)

  const handleChurchProfileChange = (field: string, value: string) => {
    setChurchProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
  }

  const handleSaveChanges = () => {
    console.log("Saving general settings...")
    // TODO: Add toast notification for success/failure
  }

  const handleSaveChurchProfile = () => {
    console.log("Saving church profile:", churchProfile)
    // TODO: Add toast notification for success/failure
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('settings:title')}</h1>
        <p className="text-muted-foreground">{t('settings:settingsContent.subtitle')}</p>
      </div>

      <Tabs defaultValue="general">
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full">
            <TabsTrigger value="general" className="flex-1 whitespace-nowrap">
              {t('settings:general')}
            </TabsTrigger>
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

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:general')}</CardTitle>
              <CardDescription>{t('settings:settingsContent.general.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{t('settings:defaultLanguage')}</h3>
                <RadioGroup 
                  value={i18n.language} 
                  onValueChange={handleLanguageChange} 
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="english" />
                    <Label htmlFor="english">{t('settings:languages.english')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="es" id="spanish" />
                    <Label htmlFor="spanish">{t('settings:languages.spanish')}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">{t('settings:notifications')}</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="email-notifications" 
                    checked={emailNotificationsEnabled} 
                    onCheckedChange={setEmailNotificationsEnabled} 
                  />
                  <Label htmlFor="email-notifications">{t('settings:settingsContent.general.emailLabel')}</Label>
                </div>
              </div>

              <Button onClick={handleSaveChanges}>{t('common:save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

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
                    value={churchProfile.phone}
                    onChange={(e) => handleChurchProfileChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t('settings:churchAddress')}</Label>
                  <Input
                    id="address"
                    value={churchProfile.address}
                    onChange={(e) => handleChurchProfileChange("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('settings:settingsContent.churchProfile.cityLabel')}</Label>
                  <Input
                    id="city"
                    value={churchProfile.city}
                    onChange={(e) => handleChurchProfileChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">{t('settings:settingsContent.churchProfile.stateLabel')}</Label>
                  <Input
                    id="state"
                    value={churchProfile.state}
                    onChange={(e) => handleChurchProfileChange("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">{t('settings:settingsContent.churchProfile.zipLabel')}</Label>
                  <Input
                    id="zip"
                    value={churchProfile.zip}
                    onChange={(e) => handleChurchProfileChange("zip", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="about">{t('settings:settingsContent.churchProfile.aboutLabel')}</Label>
                <textarea
                  id="about"
                  className="w-full p-2 border rounded h-24"
                  value={churchProfile.about}
                  onChange={(e) => handleChurchProfileChange("about", e.target.value)}
                />
              </div>
              <Button onClick={handleSaveChurchProfile} className="mt-4">
                {t('settings:settingsContent.churchProfile.saveButton')}
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
