"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Copy, Loader2, Mail, Eye } from "lucide-react";
import { toast } from "sonner";

interface AISuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubject: string;
  currentPreview: string;
  emailContent: string;
  onSelect: (subject: string, preview: string) => void;
}

interface Suggestion {
  subject: string;
  previewText: string;
}

export function AISuggestionsDialog({
  open,
  onOpenChange,
  currentSubject,
  currentPreview,
  emailContent,
  onSelect,
}: AISuggestionsDialogProps) {
  const { getToken } = useAuth();
  const { t, i18n } = useTranslation(['communication']);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedTone, setSelectedTone] = useState<string>("friendly");

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      const token = await getToken();
      
      // Generate complete email suggestions (subject + preview) in one call
      const response = await fetch("/api/ai/generate-email-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailContent: emailContent || "",
          currentSubject,
          currentPreview,
          tone: selectedTone,
          language: i18n.language, // Pass current language
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate suggestions");
      }

      const { suggestions: emailSuggestions } = await response.json();
      
      // Transform to our Suggestion interface
      const combinedSuggestions: Suggestion[] = emailSuggestions.map((suggestion: any) => ({
        subject: suggestion.subject || "",
        previewText: suggestion.preview || "",
      }));
      
      // Take all 5 suggestions
      setSuggestions(combinedSuggestions.slice(0, 5));
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error(t('communication:aiAssistant.failedToGenerate'));
      // Provide fallback suggestions
      setSuggestions([
        {
          subject: t('communication:aiAssistant.fallbackSuggestions.subject1'),
          previewText: t('communication:aiAssistant.fallbackSuggestions.preview1'),
        },
        {
          subject: t('communication:aiAssistant.fallbackSuggestions.subject2'),
          previewText: t('communication:aiAssistant.fallbackSuggestions.preview2'),
        },
        {
          subject: t('communication:aiAssistant.fallbackSuggestions.subject3'),
          previewText: t('communication:aiAssistant.fallbackSuggestions.preview3'),
        },
        {
          subject: t('communication:aiAssistant.fallbackSuggestions.subject4'),
          previewText: t('communication:aiAssistant.fallbackSuggestions.preview4'),
        },
        {
          subject: t('communication:aiAssistant.fallbackSuggestions.subject5'),
          previewText: t('communication:aiAssistant.fallbackSuggestions.preview5'),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && suggestions.length === 0) {
      generateSuggestions();
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion.subject, suggestion.previewText);
    toast.success(t('communication:aiAssistant.suggestionApplied'));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{t('communication:aiAssistant.title')}</DialogTitle>
              <DialogDescription>
                {t('communication:aiAssistant.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
          {/* Tone Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t('communication:aiAssistant.selectTone')}</Label>
            <RadioGroup value={selectedTone} onValueChange={setSelectedTone} className="grid grid-cols-2 gap-3">
              <label htmlFor="friendly" className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedTone === 'friendly' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}>
                <RadioGroupItem value="friendly" id="friendly" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium">{t('communication:aiAssistant.tones.friendly.label')}</p>
                  <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.tones.friendly.description')}</p>
                </div>
              </label>
              <label htmlFor="formal" className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedTone === 'formal' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}>
                <RadioGroupItem value="formal" id="formal" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium">{t('communication:aiAssistant.tones.formal.label')}</p>
                  <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.tones.formal.description')}</p>
                </div>
              </label>
              <label htmlFor="urgent" className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedTone === 'urgent' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}>
                <RadioGroupItem value="urgent" id="urgent" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium">{t('communication:aiAssistant.tones.urgent.label')}</p>
                  <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.tones.urgent.description')}</p>
                </div>
              </label>
              <label htmlFor="celebratory" className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedTone === 'celebratory' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}>
                <RadioGroupItem value="celebratory" id="celebratory" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium">{t('communication:aiAssistant.tones.celebratory.label')}</p>
                  <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.tones.celebratory.description')}</p>
                </div>
              </label>
              <label htmlFor="informative" className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedTone === 'informative' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}>
                <RadioGroupItem value="informative" id="informative" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium">{t('communication:aiAssistant.tones.informative.label')}</p>
                  <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.tones.informative.description')}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Generate Button - Show when no suggestions yet */}
          {suggestions.length === 0 && !isLoading && (
            <div className="flex justify-center pt-2">
              <Button onClick={generateSuggestions} className="w-full max-w-xs">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('communication:aiAssistant.generateButton')}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('communication:aiAssistant.generating')}</p>
            </div>
          ) : (
            <>
              {suggestions.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-medium text-base">{t('communication:aiAssistant.generatedSuggestions')}</h3>
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <Card
                          key={index}
                          className="relative overflow-hidden cursor-pointer border-2 hover:border-primary hover:shadow-md transition-all group"
                          onClick={() => handleSelect(suggestion)}
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('communication:aiAssistant.labels.subjectLine')}</p>
                                </div>
                                <p className="font-semibold text-base">{suggestion.subject}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('communication:aiAssistant.labels.previewText')}</p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.previewText}</p>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(suggestion);
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1.5" />
                                {t('communication:aiAssistant.useThisSuggestion')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={generateSuggestions}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('communication:aiAssistant.generateNew')}
                    </Button>
                    
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                      {t('communication:aiAssistant.close')}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}