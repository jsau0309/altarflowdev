"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash, MessageCircle, Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type SmsTemplate, extendedMockDataService } from "@/lib/mock-data-extensions"

export function SmsTemplatesManager() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    language: "english" as "english" | "spanish" | "both",
  })
  const [characterCount, setCharacterCount] = useState(0)
  const [variables, setVariables] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // Load templates on mount
  useEffect(() => {
    setTemplates(extendedMockDataService.getSmsTemplates())
  }, [])

  // Update character count when content changes
  useEffect(() => {
    setCharacterCount(formData.content.length)

    // Extract variables from content
    const matches = formData.content.match(/\{\{([^}]+)\}\}/g) || []
    const extractedVars = matches.map((match) => match.replace(/\{\{|\}\}/g, ""))
    setVariables([...new Set(extractedVars)])
  }, [formData.content])

  const handleAddTemplate = () => {
    setEditingTemplate(null)
    setFormData({
      name: "",
      content: "",
      language: "english",
    })
    setShowTemplateModal(true)
  }

  const handleEditTemplate = (template: SmsTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      language: template.language,
    })
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = () => {
    if (!formData.name || !formData.content) return

    if (editingTemplate) {
      // Update existing template
      const updatedTemplate = extendedMockDataService.updateSmsTemplate(editingTemplate.id, {
        name: formData.name,
        content: formData.content,
        language: formData.language,
        variables,
      })

      if (updatedTemplate) {
        setTemplates(extendedMockDataService.getSmsTemplates())
      }
    } else {
      // Add new template
      const newTemplate = extendedMockDataService.addSmsTemplate({
        name: formData.name,
        content: formData.content,
        language: formData.language,
        variables,
      })

      setTemplates([...templates, newTemplate])
    }

    setShowTemplateModal(false)
  }

  const handleInsertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + `{{${variable}}}`,
    }))
  }

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">SMS Templates</h3>
        <Button onClick={handleAddTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.characterCount} characters</CardDescription>
                  </div>
                  <Badge
                    variant={
                      template.language === "spanish"
                        ? "default"
                        : template.language === "english"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {template.language === "both"
                      ? "Bilingual"
                      : template.language === "spanish"
                        ? "Spanish"
                        : "English"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-md p-3 text-sm min-h-[100px] relative">
                  {template.content}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-50 hover:opacity-100"
                    onClick={() => handleCopyTemplate(template.content)}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>

                {template.variables.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditTemplate(template)}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold">No templates yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Create SMS templates to quickly send messages to your members.
            </p>
            <Button onClick={handleAddTemplate}>Add Template</Button>
          </div>
        </div>
      )}

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Edit your SMS template details below."
                : "Create a new SMS template for sending messages to members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Message"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="content">Message Content</Label>
                <span className={`text-xs ${characterCount > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                  {characterCount}/160 characters
                </span>
              </div>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Type your message template here..."
                rows={5}
                className={characterCount > 160 ? "border-destructive" : ""}
              />
              {characterCount > 160 && (
                <p className="text-xs text-destructive">
                  Message exceeds 160 characters and may be split into multiple messages.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Insert Variable</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleInsertVariable("churchName")}>
                  Church Name
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleInsertVariable("firstName")}>
                  First Name
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleInsertVariable("eventName")}>
                  Event Name
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleInsertVariable("eventDate")}>
                  Event Date
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleInsertVariable("eventTime")}>
                  Event Time
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Variables will be replaced with actual values when sending messages.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    language: value as "english" | "spanish" | "both",
                  }))
                }
              >
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

            <div className="border rounded-md p-4">
              <div className="text-sm font-medium mb-2">Message Preview</div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-md p-3 max-w-[80%] relative">
                  <div className="text-sm whitespace-pre-wrap">
                    {formData.content || "Your message will appear here"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!formData.name || !formData.content}>
              {editingTemplate ? "Update Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
