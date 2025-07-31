"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Loader2, Send, Save, TestTube, HelpCircle, Sparkles } from "lucide-react";
import { MemberSelector } from "../member-selector";
import { ScheduleSelector } from "../schedule-selector";
import LoaderOne from "@/components/ui/loader-one";
import { AISuggestionsDialog } from "../ai-suggestions-dialog";
import { TestEmailDialog } from "../test-email-dialog";
import { getUnlayerConfig } from "@/lib/unlayer-config";

// Dynamically import the email editor to avoid SSR issues
import type { EditorRef } from "react-email-editor";
const EmailEditor = dynamic(() => import("react-email-editor"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] border rounded-lg bg-muted/10">
      <LoaderOne />
    </div>
  ),
});

/**
 * React component providing a multi-step form for composing, testing, saving, scheduling, and sending email campaigns.
 *
 * Integrates a rich email editor, recipient selection, scheduling options, AI-assisted subject and preview generation, and test email functionality. Handles validation, asynchronous API interactions, and user feedback through dialogs and toast notifications.
 *
 * @returns The rendered campaign creation form UI.
 */
export function NewCampaignForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const emailEditorRef = useRef<EditorRef | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [activeTab, setActiveTab] = useState("compose");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sendOption, setSendOption] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [emailContentHtml, setEmailContentHtml] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  

  const onEmailEditorReady = () => {
    // Editor is ready
    console.log("Email editor is ready");
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Set up auto-save to capture content
    intervalRef.current = setInterval(() => {
      if (emailEditorRef.current?.editor) {
        emailEditorRef.current.editor.exportHtml((data: { design: any; html: string }) => {
          setEmailContentHtml(data.html);
        });
      }
    }, 2000); // Update every 2 seconds
  };
  
  // Clean up interval on unmount and get auth token
  useEffect(() => {
    getToken().then(token => setAuthToken(token));
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getToken]);

  const handleSaveAsDraft = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }

    // Prevent multiple clicks
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    
    try {
      const token = await getToken();
      
      // Show loading toast
      const loadingToast = toast.loading("Saving draft...");
      
      // Get the email design and HTML
      emailEditorRef.current?.editor?.exportHtml(async (data: { design: any; html: string }) => {
        try {
          const response = await fetch("/api/communication/campaigns", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              subject,
              previewText,
              contentJson: data.design,
              htmlContent: data.html,
              status: "DRAFT",
            }),
          });

          if (response.ok) {
            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success("Draft saved successfully!");
            
            // Small delay before redirect for better UX
            setTimeout(() => {
              router.push("/communication");
            }, 500);
          } else {
            throw new Error("Failed to save draft");
          }
        } catch (error) {
          // Dismiss loading toast on error
          toast.dismiss(loadingToast);
          console.error("Error saving draft:", error);
          toast.error("Failed to save draft. Please try again.");
          setIsSaving(false);
        }
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft. Please try again.");
      setIsSaving(false);
    }
    // Note: We don't set isSaving to false on success because we're redirecting
  };

  const handleSendTest = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }
    setShowTestEmailDialog(true);
  };

  const handleSendTestEmail = async (testEmail: string) => {
    setIsSendingTest(true);

    try {
      const token = await getToken();
      
      // Get the email HTML
      emailEditorRef.current?.editor?.exportHtml(async (data: { design: any; html: string }) => {
        try {
          const response = await fetch("/api/communication/test-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              to: testEmail,
              subject: subject,
              html: data.html,
              previewText: previewText,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            toast.success(`Test email sent to ${testEmail}`);
            setShowTestEmailDialog(false);
          } else {
            throw new Error(result.error || "Failed to send test email");
          }
        } catch (error) {
          console.error("Error sending test email:", error);
          toast.error(error instanceof Error ? error.message : "Failed to send test email");
        } finally {
          setIsSendingTest(false);
        }
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
      setIsSendingTest(false);
    }
  };

  const handleSendCampaign = async () => {
    console.log("handleSendCampaign called");
    console.log("Subject:", subject);
    console.log("Selected members:", selectedMembers);
    console.log("Send option:", sendOption);
    console.log("Scheduled date:", scheduledDate);
    
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (sendOption === "schedule" && !scheduledDate) {
      toast.error("Please select a schedule date and time");
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await getToken();
      
      // Get the email design and HTML
      emailEditorRef.current?.editor?.exportHtml(async (data: { design: any; html: string }) => {
        // First, create the campaign
        const campaignResponse = await fetch("/api/communication/campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject,
            previewText,
            contentJson: data.design,
            htmlContent: data.html,
            status: sendOption === "now" ? "SENDING" : "SCHEDULED",
            scheduledFor: sendOption === "schedule" ? scheduledDate?.toISOString() : null,
          }),
        });

        if (!campaignResponse.ok) {
          throw new Error("Failed to create campaign");
        }

        const { campaign } = await campaignResponse.json();

        // Add recipients
        const recipientsResponse = await fetch(`/api/communication/campaigns/${campaign.id}/recipients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            memberIds: selectedMembers,
          }),
        });

        if (!recipientsResponse.ok) {
          throw new Error("Failed to add recipients");
        }

        // If sending now, trigger the send
        if (sendOption === "now") {
          const sendResponse = await fetch(`/api/communication/campaigns/${campaign.id}/send`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            console.error("Send campaign error:", errorData);
            throw new Error(errorData.error || "Failed to send campaign");
          }

          toast.success("Email campaign sent successfully!");
        } else {
          toast.success(`Email campaign scheduled for ${scheduledDate?.toLocaleString()}`);
        }

        router.push("/communication");
      });
    } catch (error) {
      console.error("Error sending campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send campaign";
      toast.error(errorMessage, {
        description: "Please check the console for more details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = subject.trim() && selectedMembers.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Set up your email campaign information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-muted"
                    type="button"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" side="right">
                  <div className="space-y-2">
                    <p className="font-semibold">Subject Line Tips:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Keep it under 50 characters for mobile</li>
                      <li>• Be clear and specific about content</li>
                      <li>• Avoid ALL CAPS and excessive punctuation!!!</li>
                      <li>• Personalize when possible (e.g., "Weekly Update")</li>
                      <li>• Examples: "This Week at First Baptist", "Youth Group Summer Schedule"</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              id="subject"
              placeholder="Enter your email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="preview">Preview Text</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-muted"
                    type="button"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" side="right">
                  <div className="space-y-2">
                    <p className="font-semibold">Preview Text Tips:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Complements your subject line</li>
                      <li>• 35-90 characters work best</li>
                      <li>• Provides additional context</li>
                      <li>• Don't repeat the subject line</li>
                      <li>• Examples: "Join us for worship, fellowship, and upcoming events", "Important updates and prayer requests inside"</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              id="preview"
              placeholder="Text that appears in the inbox preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This text appears after the subject line in most email clients
            </p>
          </div>
          
          {/* AI Assistant Button - placed after preview text */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={() => setShowAISuggestions(true)}
              className="text-purple-600 border-purple-200 hover:text-purple-700 hover:bg-purple-50 hover:border-purple-300"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant - Generate Subject & Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="recipients" disabled={!subject.trim()}>
            Recipients {selectedMembers.length > 0 && `(${selectedMembers.length})`}
          </TabsTrigger>
          <TabsTrigger value="schedule" disabled={!subject.trim() || selectedMembers.length === 0}>
            Schedule & Send
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[600px]">
                <EmailEditor
                  ref={emailEditorRef}
                  onReady={onEmailEditorReady}
                  options={getUnlayerConfig(authToken)}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleSaveAsDraft}
              disabled={isSaving || !subject.trim()}
              className={isSaving ? "opacity-75" : ""}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSendTest}
                disabled={!subject.trim()}
              >
                <TestTube className="mr-2 h-4 w-4" />
                Send Test
              </Button>
              
              <Button
                onClick={() => setActiveTab("recipients")}
                disabled={!subject.trim()}
              >
                Next: Select Recipients
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <MemberSelector
            selectedMembers={selectedMembers}
            onSelectionChange={setSelectedMembers}
          />
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setActiveTab("compose")}
            >
              Back
            </Button>
            
            <Button
              onClick={() => setActiveTab("schedule")}
              disabled={selectedMembers.length === 0}
            >
              Next: Schedule & Send
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <ScheduleSelector
            sendOption={sendOption}
            onSendOptionChange={setSendOption}
            scheduledDate={scheduledDate}
            onScheduledDateChange={setScheduledDate}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Review & Send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Subject:</p>
                <p className="text-sm text-muted-foreground">{subject}</p>
              </div>
              
              {previewText && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preview Text:</p>
                  <p className="text-sm text-muted-foreground">{previewText}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Recipients:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Send Time:</p>
                <p className="text-sm text-muted-foreground">
                  {sendOption === "now" 
                    ? "Immediately" 
                    : scheduledDate?.toLocaleString() || "Not scheduled"}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setActiveTab("recipients")}
            >
              Back
            </Button>
            
            <Button
              onClick={handleSendCampaign}
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sendOption === "now" ? "Send Now" : "Schedule Campaign"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <AISuggestionsDialog
        open={showAISuggestions}
        onOpenChange={setShowAISuggestions}
        currentSubject={subject}
        currentPreview={previewText}
        emailContent={emailContentHtml}
        onSelect={(newSubject, newPreview) => {
          setSubject(newSubject);
          setPreviewText(newPreview);
        }}
      />

      <TestEmailDialog
        open={showTestEmailDialog}
        onOpenChange={setShowTestEmailDialog}
        onSend={handleSendTestEmail}
        isLoading={isSendingTest}
      />
    </div>
  );
}