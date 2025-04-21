"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import type { FormConfiguration } from "../member-form/types"
import { PlusCircle, Trash2, ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

// Sample configuration for demonstration
const defaultConfig: FormConfiguration = {
  churchId: "default",
  formVersion: "1.0.0",
  serviceTimes: [
    { id: "1", day: "Sunday", time: "9:30 AM", isActive: true },
    { id: "2", day: "Sunday", time: "11:00 AM", isActive: true },
    { id: "3", day: "Thursday", time: "7:00 PM", isActive: true },
  ],
  ministries: [
    { id: "1", name: "Starting Point", isActive: true },
    { id: "2", name: "Growth Group", isActive: true },
    { id: "3", name: "Talking to a Pastor", isActive: true },
    { id: "4", name: "Partnership Workshop", isActive: true },
    { id: "5", name: "Baptism", isActive: true },
  ],
  customFields: [],
  settings: {
    enablePrayerRequests: true,
    enableReferralTracking: true,
    notificationEmails: [],
  },
}

export function FormSettings() {
  const [config, setConfig] = useState<FormConfiguration>(defaultConfig)
  const [newServiceDay, setNewServiceDay] = useState("")
  const [newServiceTime, setNewServiceTime] = useState("")
  const [newMinistryName, setNewMinistryName] = useState("")
  const { t } = useTranslation(['settings', 'common'])
  const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/connect` : '';

  const handleAddService = () => {
    if (newServiceDay && newServiceTime) {
      setConfig({
        ...config,
        serviceTimes: [
          ...config.serviceTimes,
          {
            id: Date.now().toString(),
            day: newServiceDay,
            time: newServiceTime,
            isActive: true,
          },
        ],
      })
      setNewServiceDay("")
      setNewServiceTime("")
    }
  }

  const handleRemoveService = (id: string) => {
    setConfig({
      ...config,
      serviceTimes: config.serviceTimes.filter((service) => service.id !== id),
    })
  }

  const handleToggleService = (id: string) => {
    setConfig({
      ...config,
      serviceTimes: config.serviceTimes.map((service) =>
        service.id === id ? { ...service, isActive: !service.isActive } : service,
      ),
    })
  }

  const handleAddMinistry = () => {
    if (newMinistryName) {
      setConfig({
        ...config,
        ministries: [
          ...config.ministries,
          {
            id: Date.now().toString(),
            name: newMinistryName,
            isActive: true,
          },
        ],
      })
      setNewMinistryName("")
    }
  }

  const handleRemoveMinistry = (id: string) => {
    setConfig({
      ...config,
      ministries: config.ministries.filter((ministry) => ministry.id !== id),
    })
  }

  const handleToggleMinistry = (id: string) => {
    setConfig({
      ...config,
      ministries: config.ministries.map((ministry) =>
        ministry.id === id ? { ...ministry, isActive: !ministry.isActive } : ministry,
      ),
    })
  }

  const handleToggleSetting = (setting: keyof typeof config.settings) => {
    setConfig({
      ...config,
      settings: {
        ...config.settings,
        [setting]: !config.settings[setting as keyof typeof config.settings],
      },
    })
  }

  const copyToClipboard = () => {
    if(formUrl){
        navigator.clipboard.writeText(formUrl)
        alert(t('settings:formSettings.urlCopied', "Form URL copied to clipboard!"))
    }
  }

  const openPreview = () => {
    if(formUrl) window.open(formUrl, "_blank");
  }

  return (
    <div className="w-full overflow-x-hidden">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('settings:formSettings.title')}</CardTitle>
          <CardDescription>{t('settings:formSettings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="form-url">{t('settings:formSettings.formUrlLabel')}</Label>
            <div className="flex mt-1.5">
              <Input id="form-url" value={formUrl} readOnly className="flex-1" />
              <Button variant="outline" className="ml-2" onClick={copyToClipboard}>
                {t('common:copy')}
              </Button>
              <Button variant="outline" className="ml-2" onClick={openPreview}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('common:preview')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t('settings:formSettings.formUrlDescription')}
            </p>
          </div>

          <Tabs defaultValue="services">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">{t('settings:formSettings.tabs.services')}</TabsTrigger>
              <TabsTrigger value="ministries">{t('settings:formSettings.tabs.ministries')}</TabsTrigger>
              <TabsTrigger value="settings">{t('settings:formSettings.tabs.settings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.services.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings:formSettings.services.description')}
                </p>
              </div>

              <div className="space-y-4">
                {config.serviceTimes.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={service.isActive} onCheckedChange={() => handleToggleService(service.id)} />
                      <span>
                        {service.day} {service.time}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveService(service.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t('settings:formSettings.services.dayPlaceholder')}
                  value={newServiceDay}
                  onChange={(e) => setNewServiceDay(e.target.value)}
                />
                <Input
                  placeholder={t('settings:formSettings.services.timePlaceholder')}
                  value={newServiceTime}
                  onChange={(e) => setNewServiceTime(e.target.value)}
                />
                <Button onClick={handleAddService}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ministries" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.ministries.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings:formSettings.ministries.description')}
                </p>
              </div>

              <div className="space-y-4">
                {config.ministries.map((ministry) => (
                  <div key={ministry.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={ministry.isActive} onCheckedChange={() => handleToggleMinistry(ministry.id)} />
                      <span>{ministry.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMinistry(ministry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t('settings:formSettings.ministries.namePlaceholder')}
                  value={newMinistryName}
                  onChange={(e) => setNewMinistryName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMinistry}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.settings.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.description')}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prayer-requests">{t('settings:formSettings.settings.prayerLabel')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.prayerDescription')}</p>
                  </div>
                  <Switch
                    id="prayer-requests"
                    checked={config.settings.enablePrayerRequests}
                    onCheckedChange={() => handleToggleSetting("enablePrayerRequests")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="referral-tracking">{t('settings:formSettings.settings.referralLabel')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.referralDescription')}</p>
                  </div>
                  <Switch
                    id="referral-tracking"
                    checked={config.settings.enableReferralTracking}
                    onCheckedChange={() => handleToggleSetting("enableReferralTracking")}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button>{t('common:saveChanges', 'Save Changes')}</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
