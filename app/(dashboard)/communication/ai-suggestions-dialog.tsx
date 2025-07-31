"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Sparkles, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ToneOption } from "@/lib/ai-service";

interface AISuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubject: string;
  currentPreview: string;
  emailContent?: string;
  onSelect: (subject: string, preview: string) => void;
}

const toneOptions = [
  {
    value: "friendly" as ToneOption,
    label: "Friendly & Welcoming",
    description: "Warm, conversational tone for regular updates",
    icon: "😊",
  },
  {
    value: "formal" as ToneOption,
    label: "Formal & Professional",
    description: "Traditional, respectful tone for official matters",
    icon: "🎩",
  },
  {
    value: "urgent" as ToneOption,
    label: "Urgent & Important",
    description: "Time-sensitive tone for critical announcements",
    icon: "⚡",
  },
  {
    value: "celebratory" as ToneOption,
    label: "Celebratory & Joyful",
    description: "Uplifting tone for special occasions",
    icon: "🎉",
  },
  {
    value: "informative" as ToneOption,
    label: "Informative & Educational",
    description: "Clear, teaching tone for announcements",
    icon: "📚",
  },
];

interface CombinedSuggestion {
  subject: string;
  subjectCharCount: number;
  preview: string;
  previewCharCount: number;
}

/**
 * Displays a dialog that generates and presents AI-powered suggestions for email subject lines and preview text based on user input and selected tone.
 *
 * Users can choose a tone, request AI-generated suggestions, and select a suggestion to update their email details. The dialog manages loading states, error feedback, and supports regenerating suggestions or changing tone.
 *
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Callback to control dialog visibility
 * @param currentSubject - The current email subject line
 * @param currentPreview - The current email preview text
 * @param emailContent - Optional full email content to inform suggestions
 * @param onSelect - Callback invoked with the selected subject and preview text
 */
export function AISuggestionsDialog({
  open,
  onOpenChange,
  currentSubject,
  currentPreview,
  emailContent,
  onSelect,
}: AISuggestionsDialogProps) {
  const { getToken } = useAuth();
  const [selectedTone, setSelectedTone] = useState<ToneOption>("friendly");
  const [suggestions, setSuggestions] = useState<CombinedSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tone");

  const generateSuggestions = async () => {
    // Don't require email content - we can generate suggestions based on subject alone or even without any content

    setIsLoading(true);
    setSuggestions([]); // Clear previous suggestions
    
    try {
      const token = await getToken();
      
      // Generate combined suggestions
      const response = await fetch("/api/ai/generate-email-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentSubject,
          currentPreview,
          emailContent,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate suggestions");
      }

      const data = await response.json();
      
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error("Invalid response format");
      }
      
      setSuggestions(data.suggestions);
      setActiveTab("suggestions");
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (subject: string, preview: string) => {
    onSelect(subject, preview);
    onOpenChange(false);
    toast.success("Email details updated");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Email Assistant
          </DialogTitle>
          <DialogDescription>
            {!currentSubject && !emailContent 
              ? "Get AI-powered suggestions for your email subject and preview text"
              : "Get AI-powered suggestions based on your current content"
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tone">Choose Tone</TabsTrigger>
            <TabsTrigger value="suggestions" disabled={suggestions.length === 0}>
              View Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tone" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select the tone for your email</Label>
              <RadioGroup value={selectedTone} onValueChange={(value) => setSelectedTone(value as ToneOption)}>
                <div className="grid gap-3">
                  {toneOptions.map((tone) => (
                    <Label
                      key={tone.value}
                      htmlFor={tone.value}
                      className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={tone.value} id={tone.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <span>{tone.icon}</span>
                          {tone.label}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tone.description}
                        </p>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Button 
              onClick={generateSuggestions} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                  onClick={() => handleSelect(suggestion.subject, suggestion.preview)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Subject Line */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-muted-foreground">Subject Line</Label>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.subjectCharCount} chars
                          </Badge>
                        </div>
                        <p className="font-medium text-base">
                          {suggestion.subject}
                        </p>
                      </div>
                      
                      {/* Preview Text */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-muted-foreground">Preview Text</Label>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.previewCharCount} chars
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.preview}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm text-primary flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Click to use this suggestion
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={generateSuggestions}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate More
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("tone")}
                disabled={isLoading}
                className="flex-1"
              >
                Change Tone
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}