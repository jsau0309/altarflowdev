"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle, Sparkles, ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";
import { AISuggestionsDialog } from "@/components/communication/ai-suggestions-dialog";
import LoaderOne from "@/components/ui/loader-one";

/**
 * Renders a form for creating or editing the details of an email campaign, including subject and preview text, with support for loading existing campaign data, AI suggestions, and saving as draft or continuing to the next step.
 *
 * The form validates required fields, manages loading and saving states, and navigates appropriately based on user actions and campaign status.
 */
export function CampaignDetailsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication', 'common']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // Get campaign ID and return destination from URL
  const campaignId = searchParams.get("campaignId");
  const returnTo = searchParams.get("returnTo");

  // Load existing campaign data if campaignId is present
  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    setIsLoadingCampaign(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubject(data.subject || "");
        setPreviewText(data.previewText || "");
      }
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error(t('communication:campaignDetails.toast.failedToLoad'));
    } finally {
      setIsLoadingCampaign(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!subject.trim()) {
      toast.error(t('communication:campaignDetails.subject.error'));
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await getToken();
      
      if (campaignId) {
        // Update existing campaign
        const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject,
            previewText,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update campaign");
        }

        toast.success(t('communication:campaignDetails.toast.campaignUpdated'));
        
        // If returnTo is set, go back to review page
        if (returnTo === "review") {
          router.push(`/communication/new/review?campaignId=${campaignId}`);
        } else {
          router.push(`/communication/new/editor?campaignId=${campaignId}`);
        }
      } else {
        // Create new campaign
        const response = await fetch("/api/communication/campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject,
            previewText,
            status: "DRAFT",
            contentJson: {}, // Empty design initially
            htmlContent: "", // Empty HTML initially
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create campaign");
        }

        const { campaign } = await response.json();
        
        // Navigate to editor with campaign ID
        router.push(`/communication/new/editor?campaignId=${campaign.id}`);
      }
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(t('communication:campaignDetails.toast.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      toast.error(t('communication:campaignDetails.subject.error'));
      return;
    }

    setIsSaving(true);
    
    try {
      const token = await getToken();
      
      // Create campaign as draft
      const response = await fetch("/api/communication/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          previewText,
          status: "DRAFT",
          contentJson: {}, // Empty design initially
          htmlContent: "", // Empty HTML initially
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      toast.success(t('communication:campaignDetails.toast.savedAsDraft'));
      router.push("/communication");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(t('communication:campaignDetails.toast.failedToSaveDraft'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingCampaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('communication:campaignDetails.title')}</CardTitle>
          <CardDescription>
            {t('communication:campaignDetails.loadingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <LoaderOne />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('communication:campaignDetails.title')}</CardTitle>
          <CardDescription>
            {campaignId ? t('communication:campaignDetails.updateDescription') : t('communication:campaignDetails.createDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="subject">{t('communication:campaignDetails.subject.label')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4">
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{t('communication:campaignDetails.subject.helpTitle')}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• {t('communication:campaignDetails.subject.helpTips.0')}</li>
                      <li>• {t('communication:campaignDetails.subject.helpTips.1')}</li>
                      <li>• {t('communication:campaignDetails.subject.helpTips.2')}</li>
                      <li>• {t('communication:campaignDetails.subject.helpTips.3')}</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="relative">
              <Input
                id="subject"
                placeholder={t('communication:campaignDetails.subject.placeholder')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                {t('communication:campaignDetails.subject.characterCount', { count: subject.length })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="preview">{t('communication:campaignDetails.preview.label')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4">
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{t('communication:campaignDetails.preview.helpTitle')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('communication:campaignDetails.preview.helpDescription')}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              id="preview"
              placeholder={t('communication:campaignDetails.preview.placeholder')}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('communication:campaignDetails.preview.characterCount', { count: previewText.length })}
            </p>
          </div>

          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={() => setShowAISuggestions(true)}
              size="sm"
            >
              <Sparkles className="mr-2 h-3 w-3" />
              {t('communication:campaignDetails.ai.buttonText')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving || !subject.trim()}
        >
          <Save className="mr-2 h-4 w-4" />
          {t('communication:campaignDetails.actions.saveAsDraft')}
        </Button>
        
        <Button
          onClick={handleSaveAndContinue}
          disabled={isLoading || !subject.trim()}
        >
          {returnTo === "review" ? t('communication:campaignDetails.actions.saveAndReturn') : t('communication:campaignDetails.actions.nextDesignEmail')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <AISuggestionsDialog
        open={showAISuggestions}
        onOpenChange={setShowAISuggestions}
        currentSubject={subject}
        currentPreview={previewText}
        emailContent=""
        onSelect={(newSubject, newPreview) => {
          setSubject(newSubject);
          setPreviewText(newPreview);
          setShowAISuggestions(false);
        }}
      />
    </>
  );
}