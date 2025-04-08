"use client"

import { useState } from "react"
import { Check, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// This is a mockup component to show the auto-filled form
export function AutoFilledForm() {
  // Mock extracted data
  const [formData, setFormData] = useState({
    vendor: "Office Depot",
    amount: "125.47",
    date: "2025-03-24",
    category: "",
    paymentMethod: "",
    description: "Office supplies - printer paper, ink cartridges, pens",
  })

  return (
    <div className="p-6 border rounded-lg max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">New Expense</h2>
      </div>

      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md mb-6">
        <Check className="h-5 w-5" />
        <span className="font-medium">Receipt data applied to form</span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-8 border-green-500 bg-green-50/50"
              />
              <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
                Auto-filled
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border-green-500 bg-green-50/50"
              />
              <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
                Auto-filled
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor/Payee</Label>
          <div className="relative">
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="border-green-500 bg-green-50/50"
            />
            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
              Auto-filled
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="salaries">Salaries</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-method">Payment Method</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
          >
            <SelectTrigger id="payment-method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="credit-card">Credit Card</SelectItem>
              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <div className="relative">
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="border-green-500 bg-green-50/50"
            />
            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
              Auto-filled
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Receipt Image</Label>
          <div className="border rounded-md p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Receipt_Office_Depot.jpg</p>
                <p className="text-xs text-muted-foreground">Scanned on Mar 24, 2025</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8">
              View
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline">Cancel</Button>
        <Button>Save Expense</Button>
      </div>
    </div>
  )
}
