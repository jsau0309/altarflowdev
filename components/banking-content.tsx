"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  ArrowDownToLine,
  BanknoteIcon as BankIcon,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  RefreshCw,
  Shield,
} from "lucide-react"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Unused imports

export function BankingContent() {
  const [activeTab, setActiveTab] = useState("account")

  return (
    <div className="flex flex-col gap-8 pb-8 px-6 md:px-8 lg:px-10 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banking</h1>
          <p className="text-muted-foreground mt-2">
            Manage your church&apos;s financial accounts, payouts, and tax information
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" size="sm" className="w-full sm:w-auto">
            <BankIcon className="mr-2 h-4 w-4" />
            Connect Bank Account
          </Button>
        </div>
      </div>

      <Alert className="mb-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Account Verification Required</AlertTitle>
        <AlertDescription>
          Please complete your account verification to enable all banking features and receive payouts.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="account" className="w-full space-y-6" onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full min-w-max mb-2">
            <TabsTrigger value="account" className="flex-1 whitespace-nowrap">
              Account
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 whitespace-nowrap">
              Payouts
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex-1 whitespace-nowrap">
              Tax Information
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 whitespace-nowrap">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>Banking Account Overview</CardTitle>
              <CardDescription>View and manage your connected bank accounts and balance information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">Available Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="text-3xl font-bold">$4,285.00</div>
                    <p className="text-sm text-muted-foreground mt-1">Available for payout</p>
                    <div className="flex mt-4">
                      <Button size="sm">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Withdraw
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">Pending Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="text-3xl font-bold">$1,250.00</div>
                    <p className="text-sm text-muted-foreground mt-1">Processing and will be available soon</p>
                    <div className="flex mt-4 items-center text-sm text-muted-foreground">
                      <Info className="mr-2 h-4 w-4" />
                      Funds typically clear in 2-7 business days
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Connected Bank Accounts</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border rounded-md gap-4">
                    <div className="flex items-center">
                      <Landmark className="h-8 w-8 mr-4 text-primary" />
                      <div>
                        <p className="font-medium">First Community Bank</p>
                        <p className="text-sm text-muted-foreground">Account ending in 4589</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Badge variant="outline" className="mr-2">
                        Default
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 border border-dashed rounded-md text-center">
                    <p className="text-muted-foreground mb-2">Add another bank account for payouts</p>
                    <Button variant="outline">
                      <BankIcon className="mr-2 h-4 w-4" />
                      Add Bank Account
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">Stripe Connect Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This section will contain the embedded Stripe Connect components for account management.
                </p>
                <div className="h-48 border border-dashed rounded-md flex items-center justify-center my-4">
                  <p className="text-muted-foreground">Stripe Connect Account Dashboard will be embedded here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>Payout History</CardTitle>
              <CardDescription>View and manage your payouts to connected bank accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    All Payouts
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    Scheduled
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    Completed
                  </Button>
                </div>
                <Button size="sm" className="w-full sm:w-auto">
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Request Payout
                </Button>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">Stripe Connect Payouts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This section will contain the embedded Stripe Connect components for payout management.
                </p>
                <div className="h-60 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Stripe Connect Payouts Dashboard will be embedded here</p>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="p-5 border-b">
                  <h3 className="font-medium">Recent Payouts</h3>
                </div>
                <div className="divide-y">
                  {[
                    { date: "Mar 15, 2025", amount: "$1,250.00", status: "Completed" },
                    { date: "Mar 1, 2025", amount: "$2,340.00", status: "Completed" },
                    { date: "Feb 15, 2025", amount: "$1,890.00", status: "Completed" },
                  ].map((payout, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-2">
                      <div>
                        <p className="font-medium">{payout.date}</p>
                        <p className="text-sm text-muted-foreground">Standard payout</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-medium">{payout.amount}</p>
                        <Badge variant="outline" className="bg-green-50">
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Information Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>Tax Information</CardTitle>
              <CardDescription>Manage your tax documents and reporting information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">Stripe Connect Tax Reporting</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This section will contain the embedded Stripe Connect components for tax information management.
                </p>
                <div className="h-40 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Stripe Connect Tax Dashboard will be embedded here</p>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="p-5 border-b">
                  <h3 className="font-medium">Tax Documents</h3>
                </div>
                <div className="divide-y">
                  {[
                    { year: "2024", type: "1099-K", status: "Available" },
                    { year: "2023", type: "1099-K", status: "Available" },
                    { year: "2022", type: "1099-K", status: "Available" },
                  ].map((doc, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {doc.type} - {doc.year}
                          </p>
                          <p className="text-sm text-muted-foreground">Annual tax document</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader className="px-6 py-5 pb-2">
                  <CardTitle className="text-lg">Tax Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-6 py-5">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Tax ID Type</p>
                      <p>EIN</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Tax ID</p>
                      <p>XX-XXXXXXX</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Legal Entity Name</p>
                      <p>First Community Church</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Tax Exempt Status</p>
                      <Badge variant="outline" className="bg-green-50">
                        501(c)(3)
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    Update Tax Information
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="px-6 py-5">
              <CardTitle>Banking Settings</CardTitle>
              <CardDescription>Configure your banking preferences and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">Payout Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Current Schedule</p>
                          <p className="text-sm text-muted-foreground">Bi-weekly payouts</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Next Payout Date</p>
                          <p className="text-sm text-muted-foreground">March 30, 2025</p>
                        </div>
                        <Badge>Scheduled</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-6 py-5 pb-2">
                    <CardTitle className="text-lg">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 py-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">For banking operations</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          Enabled
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Payout Notifications</p>
                          <p className="text-sm text-muted-foreground">Email and SMS alerts</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          Enabled
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Shield className="mr-2 h-4 w-4" />
                        Manage Security Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-2">Stripe Connect Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This section will contain the embedded Stripe Connect components for account settings.
                </p>
                <div className="h-40 border border-dashed rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Stripe Connect Settings Dashboard will be embedded here</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">API Access</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage API keys and webhooks for your banking integration
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Webhook Status</p>
                    <Badge variant="outline" className="bg-green-50">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">API Mode</p>
                    <Badge>Live</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  Manage API Settings
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border rounded-lg gap-4">
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Need Help?</p>
                    <p className="text-sm text-muted-foreground">Contact our support team for banking assistance</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
