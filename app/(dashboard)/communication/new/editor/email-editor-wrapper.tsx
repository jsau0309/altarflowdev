"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { TopolPlugin } from "@topol.io/editor-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, ArrowRight, Loader2 } from "lucide-react";
import { useTopolConfig } from "@/lib/topol-config";

const TopolEditor = dynamic(
  () => import("@topol.io/editor-react"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading email editor...</p>
        </div>
      </div>
    ),
  }
);

interface Campaign {
  id: string;
  subject: string;
  previewText: string;
  design: Record<string, unknown>;
  htmlContent?: string;
  status: string;
}


export function EmailEditorWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation(['communication']);
  const [templateData, setTemplateData] = useState<Record<string, unknown> | null>(null);
  
  const campaignId = searchParams.get("campaignId");
  const returnTo = searchParams.get("returnTo");
  const isPreview = searchParams.get("preview") === "true";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  // Call hook before any conditionals
  const topolConfig = useTopolConfig(
    organization?.id || user?.id || 'anonymous',
    user?.primaryEmailAddress?.emailAddress,
    i18n.language,
    resolvedTheme
  );

  // Load campaign and auth token
  useEffect(() => {
    if (!campaignId) {
      toast.error(t('communication:emailEditor.noCampaignId'));
      router.push("/communication/new/details");
      return;
    }

    const loadCampaign = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load campaign");
        }

        const data = await response.json();
        setCampaign(data);
      } catch (error) {
        console.error("Error loading campaign:", error);
        toast.error(t('communication:emailEditor.failedToLoadCampaign'));
        router.push("/communication/new/details");
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, getToken, router, t]);

  // Create a stable key for the editor
  const editorKey = campaign?.id || 'new';

  // Auto-save functionality
  const saveDesign = useCallback(async (template: Record<string, unknown>, html: string) => {
    if (!campaignId) return;

    setIsSaving(true);
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          design: template, // This is already a JSON object from Topol
          content: html,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save design");
      }

      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error(t('communication:emailEditor.failedToAutoSave'));
    } finally {
      setIsSaving(false);
    }
  }, [campaignId, getToken, t]);

  const handleEditorSave = useCallback((json: Record<string, unknown>, html: string) => {
    // Store the template data for manual save actions
    setTemplateData({ json, html });
    setHasUnsavedChanges(false); // Mark as saved after successful save
    
    // Save the design
    saveDesign(json, html);
  }, [saveDesign]);

  const handleSaveAndClose = useCallback(async (json: Record<string, unknown>, html: string) => {
    console.log('handleSaveAndClose called');
    
    // Store the template data
    setTemplateData({ json, html });
    setHasUnsavedChanges(false);
    
    // Dismiss any existing toasts first
    toast.dismiss();
    const loadingToast = toast.loading(t('communication:emailEditor.savingAndClosing'));
    
    try {
      // Save the design first
      await saveDesign(json, html);
      toast.success(t('communication:emailEditor.emailSavedSuccess'), { id: loadingToast });
      
      // Small delay to ensure toast is visible
      setTimeout(() => {
        router.push("/communication");
      }, 500);
    } catch (error) {
      console.error('Error in handleSaveAndClose:', error);
      toast.error(t('communication:emailEditor.failedToSave'), { id: loadingToast });
    }
  }, [saveDesign, router, t]);

  const handleEditorLoaded = useCallback(() => {
    // Editor is ready
    console.log('Editor loaded');
  }, []);

  // Warn users about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // For modern browsers (returnValue is deprecated but still required for older browsers)
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);


  const handleTestSend = useCallback(async (email: string | string[], _json: Record<string, unknown>, html: string) => {
    const loadingToast = toast.loading(t('communication:emailEditor.sendingTestEmail'));
    
    try {
      const token = await getToken();
      // Topol can send to multiple emails, but our API expects one at a time
      const emails = Array.isArray(email) ? email : [email];
      
      // Send to each email address
      const promises = emails.map(async (to) => {
        const response = await fetch('/api/communication/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to,
            subject: campaign?.subject || t('communication:emailEditor.testEmail'),
            html,
            previewText: campaign?.previewText,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send test email');
        }

        return response.json();
      });

      await Promise.all(promises);
      toast.success(`${t('communication:emailEditor.testEmailSent')} ${emails.join(', ')}`, { id: loadingToast });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error instanceof Error ? error.message : t('communication:emailEditor.failedToSendTest'), { id: loadingToast });
    }
  }, [campaign, getToken, t]);

  const handleSaveDraft = () => {
    if (isProcessingSave) return; // Prevent multiple clicks
    
    setIsProcessingSave(true);
    const loadingToast = toast.loading(t('communication:emailEditor.savingDraft'));
    
    // Trigger Topol's save
    if (typeof TopolPlugin !== 'undefined' && TopolPlugin.save) {
      TopolPlugin.save();
      
      // Wait 3 seconds for save to complete, then redirect
      setTimeout(() => {
        toast.dismiss(loadingToast);
        toast.success(t('communication:emailEditor.draftSavedSuccess'));
        router.push("/communication");
        setIsProcessingSave(false);
      }, 3000);
    } else {
      // Fallback: use last known template data
      if (templateData) {
        saveDesign(templateData.json as Record<string, unknown>, templateData.html as string)
          .then(() => {
            toast.success(t('communication:emailEditor.draftSavedSuccess'), { id: loadingToast });
            router.push("/communication");
          })
          .catch(() => {
            toast.error(t('communication:emailEditor.failedToSaveDraft'), { id: loadingToast });
          })
          .finally(() => {
            setIsProcessingSave(false);
          });
      } else {
        toast.dismiss(loadingToast);
        router.push("/communication");
        setIsProcessingSave(false);
      }
    }
  };

  const handleContinue = () => {
    if (isProcessingSave) return; // Prevent multiple clicks
    
    setIsProcessingSave(true);
    const loadingToast = toast.loading(t('communication:emailEditor.savingAndContinuing'));
    
    // Trigger Topol's save
    if (typeof TopolPlugin !== 'undefined' && TopolPlugin.save) {
      TopolPlugin.save();
      
      // Wait 2 seconds for save to complete, then continue
      setTimeout(() => {
        toast.dismiss(loadingToast);
        toast.success(t('communication:emailEditor.designSaved'));
        // If returnTo is set, go back to review page
        if (returnTo === "review") {
          router.push(`/communication/new/review?campaignId=${campaignId}`);
        } else {
          router.push(`/communication/new/recipients?campaignId=${campaignId}`);
        }
        setIsProcessingSave(false);
      }, 2000);
    } else {
      // Fallback: use last known template data
      if (templateData) {
        saveDesign(templateData.json as Record<string, unknown>, templateData.html as string)
          .then(() => {
            toast.success(t('communication:emailEditor.designSaved'), { id: loadingToast });
            // If returnTo is set, go back to review page
            if (returnTo === "review") {
              router.push(`/communication/new/review?campaignId=${campaignId}`);
            } else {
              router.push(`/communication/new/recipients?campaignId=${campaignId}`);
            }
          })
          .catch(() => {
            toast.error(t('communication:emailEditor.failedToSaveDesign'), { id: loadingToast });
          })
          .finally(() => {
            setIsProcessingSave(false);
          });
      } else {
        toast.dismiss(loadingToast);
        // If returnTo is set, go back to review page
        if (returnTo === "review") {
          router.push(`/communication/new/review?campaignId=${campaignId}`);
        } else {
          router.push(`/communication/new/recipients?campaignId=${campaignId}`);
        }
        setIsProcessingSave(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t('communication:emailEditor.loadingCampaign')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="overflow-hidden shadow-sm">
        <div className="border-b bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{isPreview ? t('communication:emailEditor.previewTitle') : t('communication:emailEditor.title')}</h2>
              <p className="text-sm text-muted-foreground">{isPreview ? t('communication:emailEditor.previewDescription') : t('communication:emailEditor.description')}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
          <TopolEditor
            key={editorKey}
            options={topolConfig.options}
            onInit={() => {
              console.log('TopolEditor onInit fired');
              if (campaign?.design && Object.keys(campaign.design).length > 0) {
                const jsonString = typeof campaign.design === 'object' 
                  ? JSON.stringify(campaign.design) 
                  : campaign.design;
                console.log('Loading template via TopolPlugin.load()...');
                try {
                  TopolPlugin.load(jsonString);
                  console.log('Template loaded successfully');
                } catch (error) {
                  console.error('Error loading template:', error);
                }
              }
            }}
            onSave={isPreview ? undefined : handleEditorSave}
            onSaveAndClose={isPreview ? undefined : handleSaveAndClose}
            onLoaded={handleEditorLoaded}
            onTestSend={isPreview ? undefined : handleTestSend}
            onEdittedWithoutSaveChanged={(hasChanges: boolean) => !isPreview && setHasUnsavedChanges(hasChanges)}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isPreview ? (
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              {t('communication:emailEditor.backToDetails')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || isProcessingSave}
              >
                <Save className="mr-2 h-4 w-4" />
                {t('communication:emailEditor.saveDraftAndExit')}
              </Button>
              
              <div className="flex items-center gap-4 text-sm">
                {lastAutoSave && (
                  <p className="text-muted-foreground">
                    {t('communication:emailEditor.autoSaved')} {lastAutoSave.toLocaleTimeString()}
                  </p>
                )}
                
                {hasUnsavedChanges && !isSaving && (
                  <p className="text-orange-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    {t('communication:emailEditor.unsavedChanges')}
                  </p>
                )}
                
                {isSaving && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('communication:emailEditor.saving')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        
        {!isPreview && (
          <Button onClick={handleContinue} disabled={isProcessingSave}>
            {returnTo === "review" ? t('communication:emailEditor.saveAndReturn') : t('communication:emailEditor.nextSelectRecipients')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}