"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Check, AlertCircle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ExtendedMember } from "@/lib/mock-data-extensions"

interface MassSmsModalProps {
  members: ExtendedMember[]
  open: boolean
  onClose: () => void
}

interface SmsTemplate {
  id: string
  name: string
  content: string
}

// Mock SMS templates
const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Message",
    content:
      "Welcome to our church family! We're glad to have you join us. If you have any questions, feel free to reply to this message.",
  },
  {
    id: "event",
    name: "Upcoming Event",
    content: "Don't forget about our upcoming event this Sunday at 10am. We hope to see you there!",
  },
  {
    id: "follow-up",
    name: "Follow-up",
    content: "Thank you for visiting our church last Sunday. We'd love to see you again this week!",
  },
]

export function MassSmsModal({ members, open, onClose }: MassSmsModalProps) {
  const [message, setMessage] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("compose")

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMessage("")
      setSelectedTemplate(null)
      setSendSuccess(false)
      setActiveTab("compose")
    }
  }, [open])

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate) {
      const template = SMS_TEMPLATES.find((t) => t.id === selectedTemplate)
      if (template) {
        setMessage(template.content)
      }
    }
  }, [selectedTemplate])

  const handleSend = async () => {
    if (!message.trim()) return

    setIsSending(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // In a real app, you would send the message to all selected members here

    setIsSending(false)
    setSendSuccess(true)

    // Close modal after success
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const characterCount = message.length
  const maxCharacters = 160
  const isOverLimit = characterCount > maxCharacters

  // Filter out members without SMS consent or phone number
  const eligibleMembers = members.filter((member) => member.smsConsent && member.phone)
  const ineligibleMembers = members.filter((member) => !member.smsConsent || !member.phone)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send Mass SMS
          </DialogTitle>
        </DialogHeader>

        {sendSuccess ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Messages Sent Successfully</h3>
            <p className="text-muted-foreground">Your message has been sent to {eligibleMembers.length} members.</p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="recipients">Recipients ({eligibleMembers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="space-y-4 py-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Template or Write Custom Message</label>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={!selectedTemplate ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTemplate(null)
                        setMessage("")
                      }}
                    >
                      Custom Message
                    </Badge>
                    {SMS_TEMPLATES.map((template) => (
                      <Badge
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        {template.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Message</label>
                    <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                      {characterCount}/{maxCharacters}
                    </span>
                  </div>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      !selectedTemplate ? "Type your custom message here..." : "Type or edit your message here..."
                    }
                    className="min-h-[120px]"
                  />
                </div>

                {/* Character limit warning */}
                {isOverLimit && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Your message exceeds the 160 character limit for a single SMS.</AlertDescription>
                  </Alert>
                )}

                {/* Preview */}
                {message && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview</label>
                    <div className="bg-muted p-3 rounded-md text-sm">{message}</div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recipients" className="py-4">
                <div className="space-y-4">
                  {/* Eligible Recipients */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recipients ({eligibleMembers.length})</h3>
                    <ScrollArea className="h-[180px] rounded-md border">
                      <div className="p-4 space-y-2">
                        {eligibleMembers.length > 0 ? (
                          eligibleMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between py-1">
                              <div>
                                <div className="font-medium">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">{member.phone}</div>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                SMS Consent
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">No eligible recipients selected</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Ineligible Recipients */}
                  {ineligibleMembers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Cannot Send To ({ineligibleMembers.length})</h3>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {ineligibleMembers.length} selected members cannot receive SMS messages due to missing phone
                          numbers or consent.
                        </AlertDescription>
                      </Alert>
                      <ScrollArea className="h-[100px] rounded-md border mt-2">
                        <div className="p-4 space-y-2">
                          {ineligibleMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between py-1">
                              <div>
                                <div className="font-medium">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {!member.phone ? "No phone number" : "No SMS consent"}
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {!member.phone ? "No Phone" : "No Consent"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isOverLimit || eligibleMembers.length === 0 || isSending}
                className="gap-2"
              >
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Send to {eligibleMembers.length} Members
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
