"use client"

import { useState } from "react"
import { Check, Copy, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function MemberRegistrationForm() {
  const [formUrl] = useState("https://altarflow.com/register/faithcommunity")
  const [copied, setCopied] = useState(false)
  const [formFields, setFormFields] = useState({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    address: false,
    birthdate: false,
    preferredLanguage: true,
    familyMembers: false,
    howDidYouHear: false,
    customQuestion: "",
  })

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleField = (field: keyof typeof formFields) => {
    setFormFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration Form</CardTitle>
              <CardDescription>Customize the registration form that members will fill out</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formName">Form Name</Label>
                <Input id="formName" defaultValue="New Member Registration" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  defaultValue="Welcome to Faith Community Church! Please fill out this form to register as a new member."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Form Fields</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="firstName">First Name</Label>
                      <p className="text-sm text-muted-foreground">Required field</p>
                    </div>
                    <Switch id="firstName" checked disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="lastName">Last Name</Label>
                      <p className="text-sm text-muted-foreground">Required field</p>
                    </div>
                    <Switch id="lastName" checked disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email">Email Address</Label>
                      <p className="text-sm text-muted-foreground">Contact information</p>
                    </div>
                    <Switch id="email" checked={formFields.email} onCheckedChange={() => toggleField("email")} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <p className="text-sm text-muted-foreground">Required for SMS communication</p>
                    </div>
                    <Switch id="phone" checked={formFields.phone} onCheckedChange={() => toggleField("phone")} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="address">Address</Label>
                      <p className="text-sm text-muted-foreground">Physical mailing address</p>
                    </div>
                    <Switch id="address" checked={formFields.address} onCheckedChange={() => toggleField("address")} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="birthdate">Date of Birth</Label>
                      <p className="text-sm text-muted-foreground">For birthday celebrations</p>
                    </div>
                    <Switch
                      id="birthdate"
                      checked={formFields.birthdate}
                      onCheckedChange={() => toggleField("birthdate")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="preferredLanguage">Preferred Language</Label>
                      <p className="text-sm text-muted-foreground">For communication preferences</p>
                    </div>
                    <Switch
                      id="preferredLanguage"
                      checked={formFields.preferredLanguage}
                      onCheckedChange={() => toggleField("preferredLanguage")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="familyMembers">Family Members</Label>
                      <p className="text-sm text-muted-foreground">Collect information about family</p>
                    </div>
                    <Switch
                      id="familyMembers"
                      checked={formFields.familyMembers}
                      onCheckedChange={() => toggleField("familyMembers")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
                      <p className="text-sm text-muted-foreground">For outreach tracking</p>
                    </div>
                    <Switch
                      id="howDidYouHear"
                      checked={formFields.howDidYouHear}
                      onCheckedChange={() => toggleField("howDidYouHear")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customQuestion">Custom Question</Label>
                <Input
                  id="customQuestion"
                  placeholder="e.g., What ministries are you interested in?"
                  value={formFields.customQuestion}
                  onChange={(e) =>
                    setFormFields((prev) => ({
                      ...prev,
                      customQuestion: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smsConsent">SMS Consent Text</Label>
                <Textarea
                  id="smsConsent"
                  defaultValue="I consent to receive text messages from Faith Community Church. Standard message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Form Language</Label>
                <Select defaultValue="both">
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="both">Bilingual (English & Spanish)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button>Save Form</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:w-[350px] space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share Registration Form</CardTitle>
              <CardDescription>Share this form with new members to register</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formUrl">Registration URL</Label>
                <div className="flex gap-2">
                  <Input id="formUrl" value={formUrl} readOnly />
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center py-4">
                <div className="bg-white p-2 rounded-md">
                  <QrCode className="h-32 w-32" />
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm">
                  Download QR Code
                </Button>
                <Button size="sm">Print QR Code</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Preview</CardTitle>
              <CardDescription>Preview how your form will look</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mobile">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mobile">Mobile</TabsTrigger>
                  <TabsTrigger value="desktop">Desktop</TabsTrigger>
                </TabsList>
                <TabsContent value="mobile" className="pt-4">
                  <div className="border rounded-lg overflow-hidden mx-auto w-[280px] h-[500px] bg-white">
                    <div className="h-8 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                      Mobile Preview
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="text-lg font-bold">New Member Registration</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">Welcome to Faith Community Church!</p>

                      <div className="space-y-3 text-left">
                        <div className="space-y-1">
                          <Label className="text-xs">First Name *</Label>
                          <Input className="h-8 text-sm" placeholder="John" />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Last Name *</Label>
                          <Input className="h-8 text-sm" placeholder="Doe" />
                        </div>

                        {formFields.phone && (
                          <div className="space-y-1">
                            <Label className="text-xs">Phone Number *</Label>
                            <Input className="h-8 text-sm" placeholder="(555) 123-4567" />
                          </div>
                        )}

                        {formFields.email && (
                          <div className="space-y-1">
                            <Label className="text-xs">Email</Label>
                            <Input className="h-8 text-sm" placeholder="john@example.com" />
                          </div>
                        )}

                        {/* More fields would be shown here */}
                        {formFields.preferredLanguage && (
                          <div className="space-y-1">
                            <Label className="text-xs">Preferred Language</Label>
                            <Select>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="spanish">Spanish</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="pt-2">
                          <Button className="w-full text-sm">Submit</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="desktop" className="pt-4">
                  <div className="border rounded-lg overflow-hidden mx-auto w-full h-[400px] bg-white">
                    <div className="h-8 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                      Desktop Preview
                    </div>
                    <div className="p-6 text-center">
                      <h3 className="text-xl font-bold">New Member Registration</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-6">Welcome to Faith Community Church!</p>

                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                          <Label>First Name *</Label>
                          <Input placeholder="John" />
                        </div>

                        <div className="space-y-1">
                          <Label>Last Name *</Label>
                          <Input placeholder="Doe" />
                        </div>

                        {formFields.phone && (
                          <div className="space-y-1">
                            <Label>Phone Number *</Label>
                            <Input placeholder="(555) 123-4567" />
                          </div>
                        )}

                        {formFields.email && (
                          <div className="space-y-1">
                            <Label>Email</Label>
                            <Input placeholder="john@example.com" />
                          </div>
                        )}

                        {/* More fields would be shown here */}

                        <div className="col-span-2 pt-4">
                          <Button className="px-8">Submit</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
