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
  const formUrl = `${window.location.origin}/connect`

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
    navigator.clipboard.writeText(formUrl)
    alert("Form URL copied to clipboard!")
  }

  return (
    <div className="w-full overflow-x-hidden">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visitor Form Settings</CardTitle>
          <CardDescription>Configure the visitor information collection form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="form-url">Form URL</Label>
            <div className="flex mt-1.5">
              <Input id="form-url" value={formUrl} readOnly className="flex-1" />
              <Button variant="outline" className="ml-2" onClick={copyToClipboard}>
                Copy
              </Button>
              <Button variant="outline" className="ml-2" onClick={() => window.open(formUrl, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this link with visitors or use it to generate QR codes
            </p>
          </div>

          <Tabs defaultValue="services">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">Service Times</TabsTrigger>
              <TabsTrigger value="ministries">Ministries</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Service Times</h3>
                <p className="text-sm text-muted-foreground">
                  Add the service times that visitors can select on the form
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
                  placeholder="Day (e.g., Sunday)"
                  value={newServiceDay}
                  onChange={(e) => setNewServiceDay(e.target.value)}
                />
                <Input
                  placeholder="Time (e.g., 10:00 AM)"
                  value={newServiceTime}
                  onChange={(e) => setNewServiceTime(e.target.value)}
                />
                <Button onClick={handleAddService}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ministries" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Ministries & Next Steps</h3>
                <p className="text-sm text-muted-foreground">
                  Add the ministries or next steps that visitors can express interest in
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
                  placeholder="Ministry name"
                  value={newMinistryName}
                  onChange={(e) => setNewMinistryName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMinistry}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Form Settings</h3>
                <p className="text-sm text-muted-foreground">Configure general settings for the visitor form</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prayer-requests">Prayer Requests</Label>
                    <p className="text-sm text-muted-foreground">Allow visitors to submit prayer requests</p>
                  </div>
                  <Switch
                    id="prayer-requests"
                    checked={config.settings.enablePrayerRequests}
                    onCheckedChange={() => handleToggleSetting("enablePrayerRequests")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="referral-tracking">Referral Tracking</Label>
                    <p className="text-sm text-muted-foreground">Ask visitors how they heard about your church</p>
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
          <Button>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
