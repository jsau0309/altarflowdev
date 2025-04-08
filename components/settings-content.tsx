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

export function SettingsContent() {
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

  const handleChurchProfileChange = (field: string, value: string) => {
    setChurchProfile({
      ...churchProfile,
      [field]: value,
    })
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="general">
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full">
            <TabsTrigger value="general" className="flex-1 whitespace-nowrap">
              General
            </TabsTrigger>
            <TabsTrigger value="church-profile" className="flex-1 whitespace-nowrap">
              Church Profile
            </TabsTrigger>
            <TabsTrigger value="users-permissions" className="flex-1 whitespace-nowrap">
              Users & Permissions
            </TabsTrigger>
            <TabsTrigger value="visitor-form" className="flex-1 whitespace-nowrap">
              Visitor Form
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Language</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="english" name="language" defaultChecked />
                    <Label htmlFor="english">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="spanish" name="language" />
                    <Label htmlFor="spanish">Spanish</Label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Email Notifications</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="email-notifications" defaultChecked />
                  <Label htmlFor="email-notifications">Receive email notifications for important events</Label>
                </div>
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="church-profile">
          <Card>
            <CardHeader>
              <CardTitle>Church Profile</CardTitle>
              <CardDescription>Update your church information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="church-name">Church Name</Label>
                  <Input
                    id="church-name"
                    value={churchProfile.name}
                    onChange={(e) => handleChurchProfileChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={churchProfile.phone}
                    onChange={(e) => handleChurchProfileChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={churchProfile.address}
                    onChange={(e) => handleChurchProfileChange("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={churchProfile.city}
                    onChange={(e) => handleChurchProfileChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={churchProfile.state}
                    onChange={(e) => handleChurchProfileChange("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={churchProfile.zip}
                    onChange={(e) => handleChurchProfileChange("zip", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="about">About</Label>
                <textarea
                  id="about"
                  className="w-full p-2 border rounded h-24"
                  value={churchProfile.about}
                  onChange={(e) => handleChurchProfileChange("about", e.target.value)}
                />
              </div>
              <Button className="mt-4">Save Church Profile</Button>
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
