"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { 
  Send, 
  Clock, 
  Users, 
  Mail, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit,
  Save,
  Loader2
} from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { SendConfirmDialog } from "@/components/communication/send-confirm-dialog";
import { ScheduleDialogV2 } from "@/components/communication/schedule-dialog-v2";
import { CampaignSuccessAnimation } from "@/components/communication/campaign-success-animation";

interface Campaign {
  id: string;
  subject: string;
  previewText: string;
  contentJson: any;
  htmlContent?: string;
  recipientType: string;
  recipientIds: string[];
  status: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailSettings {
  senderName: string;
  replyToEmail: string;
  timezone?: string;
  footerAddress?: string;
}

/**
 * Displays the review and send interface for an email campaign, allowing users to review campaign details, check readiness, and perform actions such as sending, scheduling, or saving as draft.
 *
 * Loads campaign data and email settings, presents a summary and pre-send checklist, and provides UI controls for editing, sending, scheduling, or saving the campaign. Handles loading states, errors, and user feedback, and manages navigation after actions are completed.
 */
export function ReviewAndSend() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication']);
  const campaignId = searchParams.get("campaignId");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Load campaign and settings
  useEffect(() => {
    if (!campaignId) {
      toast.error(t('communication:reviewAndSend.toast.noCampaignId'));
      router.push("/communication/new/details");
      return;
    }

    const loadData = async () => {
      try {
        const token = await getToken();
        
        // Load campaign
        const campaignResponse = await fetch(`/api/communication/campaigns/${campaignId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!campaignResponse.ok) {
          throw new Error(t('communication:reviewAndSend.toast.failedToLoadCampaign'));
        }

        const campaignData = await campaignResponse.json();
        setCampaign(campaignData);

        // Load email settings
        const settingsResponse = await fetch("/api/communication/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setEmailSettings(settingsData.settings);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t('communication:reviewAndSend.toast.failedToLoadCampaignData'));
        router.push("/communication");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [campaignId, getToken, router]);

  const handleSendNow = async () => {
    setIsSending(true);
    const loadingToast = toast.loading(t('communication:reviewAndSend.toast.sendingCampaign'));
    
    try {
      const token = await getToken();
      
      const response = await fetch(`/api/communication/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sendImmediately: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('communication:reviewAndSend.toast.failedToSendCampaign'));
      }

      // Dismiss loading toast before showing success
      toast.dismiss(loadingToast);
      
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setShowSendConfirm(false);
        setShowSuccessAnimation(true);
      }, 500);
    } catch (error: any) {
      console.error("Error sending campaign:", error);
      toast.error(error.message || t('communication:reviewAndSend.toast.failedToSendCampaign'), { id: loadingToast });
      setIsSending(false);
      setShowSendConfirm(false);
    }
  };

  const handleSuccessAnimationComplete = () => {
    // Remove returnFrom parameter when redirecting after success
    // Use setTimeout to avoid React state update warning
    setTimeout(() => {
      router.push("/communication");
    }, 0);
  };

  const handleSchedule = async (scheduledDate: Date) => {
    setIsSending(true);
    
    try {
      const token = await getToken();
      
      // The scheduledDate is in the user's local time
      // We send it as ISO string (UTC) - the display will handle timezone conversion
      const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "SCHEDULED",
          scheduledAt: scheduledDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(t('communication:reviewAndSend.toast.failedToSchedule'));
      }

      toast.success(t('communication:reviewAndSend.toast.campaignScheduled', { date: format(scheduledDate, "PPP 'at' p") }));
      router.push("/communication");
    } catch (error) {
      console.error("Error scheduling campaign:", error);
      toast.error(t('communication:reviewAndSend.toast.failedToSchedule'));
    } finally {
      setIsSending(false);
      setShowSchedule(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    const loadingToast = toast.loading(t('communication:reviewAndSend.toast.savingDraft'));
    
    try {
      const token = await getToken();
      
      // Update campaign status to ensure it's saved as draft
      const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "DRAFT",
        }),
      });

      if (!response.ok) {
        throw new Error(t('communication:reviewAndSend.toast.failedToSaveDraft'));
      }

      toast.success(t('communication:reviewAndSend.toast.draftSaved'), { id: loadingToast });
      
      // Small delay to ensure database is updated
      setTimeout(() => {
        router.push("/communication?returnFrom=review");
      }, 500);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(t('communication:reviewAndSend.toast.failedToSaveDraft'), { id: loadingToast });
      setIsSavingDraft(false);
    }
  };

  const getRecipientDescription = () => {
    if (!campaign) return "";
    
    // If we have recipients but no recipientType, default to "selected"
    if (campaign.recipientIds.length > 0 && !campaign.recipientType) {
      return campaign.recipientIds.length === 1
        ? t('communication:reviewAndSend.recipientTypes.selectedMembers', { count: campaign.recipientIds.length })
        : t('communication:reviewAndSend.recipientTypes.selectedMembersPlural', { count: campaign.recipientIds.length });
    }
    
    switch (campaign.recipientType) {
      case "all":
        return t('communication:reviewAndSend.recipientTypes.allMembers');
      case "selected":
        return campaign.recipientIds.length === 1
          ? t('communication:reviewAndSend.recipientTypes.selectedMembers', { count: campaign.recipientIds.length })
          : t('communication:reviewAndSend.recipientTypes.selectedMembersPlural', { count: campaign.recipientIds.length });
      case "filtered":
        return t('communication:reviewAndSend.recipientTypes.filteredMembers', { count: campaign.recipientIds.length });
      default:
        return campaign.recipientIds.length > 0 
          ? (campaign.recipientIds.length === 1
              ? t('communication:reviewAndSend.recipientTypes.selectedMembers', { count: campaign.recipientIds.length })
              : t('communication:reviewAndSend.recipientTypes.selectedMembersPlural', { count: campaign.recipientIds.length }))
          : t('communication:reviewAndSend.recipientTypes.noRecipients');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoaderOne />
      </div>
    );
  }

  if (!campaign) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('communication:reviewAndSend.errors.loadError')}</AlertTitle>
        <AlertDescription>{t('communication:reviewAndSend.errors.failedToLoadCampaign')}</AlertDescription>
      </Alert>
    );
  }

  const isReadyToSend = campaign.subject && 
                       campaign.contentJson && 
                       campaign.recipientIds.length > 0 &&
                       emailSettings;

  return (
    <>
      <div className="space-y-6">
        {/* Campaign Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('communication:reviewAndSend.campaignSummary.title')}</CardTitle>
            <CardDescription>
              {t('communication:reviewAndSend.campaignSummary.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('communication:reviewAndSend.campaignSummary.subjectLine')}</p>
                <p className="font-medium">{campaign.subject}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('communication:reviewAndSend.campaignSummary.previewText')}</p>
                <p className="text-sm">{campaign.previewText || t('communication:reviewAndSend.campaignSummary.noPreviewText')}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('communication:reviewAndSend.campaignSummary.from')}</p>
                <p className="text-sm">
                  {emailSettings ? emailSettings.senderName : t('communication:reviewAndSend.campaignSummary.notConfigured')}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('communication:reviewAndSend.campaignSummary.replyTo')}</p>
                <p className="text-sm">{emailSettings?.replyToEmail || t('communication:reviewAndSend.campaignSummary.notConfigured')}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('communication:reviewAndSend.campaignSummary.recipients')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/communication/new/recipients?campaignId=${campaignId}&returnTo=review`)}
                  className="h-auto p-1 text-xs"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  {t('communication:reviewAndSend.campaignSummary.edit')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{getRecipientDescription()}</span>
                <Badge variant="secondary">{campaign.recipientIds.length}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/communication/new/editor?campaignId=${campaignId}&returnTo=review`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t('communication:reviewAndSend.campaignSummary.previewAndEditDesign')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/communication/new/details?campaignId=${campaignId}&returnTo=review`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('communication:reviewAndSend.campaignSummary.editDetails')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pre-send Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>{t('communication:reviewAndSend.preflightChecklist.title')}</CardTitle>
            <CardDescription>
              {t('communication:reviewAndSend.preflightChecklist.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {campaign.subject ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={campaign.subject ? "" : "text-muted-foreground"}>
                  {t('communication:reviewAndSend.preflightChecklist.subjectLineAdded')}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {campaign.contentJson ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={campaign.contentJson ? "" : "text-muted-foreground"}>
                  {t('communication:reviewAndSend.preflightChecklist.emailDesignCompleted')}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {campaign.recipientIds.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={campaign.recipientIds.length > 0 ? "" : "text-muted-foreground"}>
                  {t('communication:reviewAndSend.preflightChecklist.recipientsSelected', { count: campaign.recipientIds.length })}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {emailSettings ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={emailSettings ? "" : "text-muted-foreground"}>
                  {t('communication:reviewAndSend.preflightChecklist.emailSettingsConfigured')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!emailSettings && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('communication:reviewAndSend.emailSettingsAlert.title')}</AlertTitle>
            <AlertDescription>
              {t('communication:reviewAndSend.emailSettingsAlert.description')}
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => router.push(`/communication?tab=settings&setup=true&returnTo=/communication/new/review?campaignId=${campaignId}`)}
              >
                {t('communication:reviewAndSend.emailSettingsAlert.configureSettings')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSending}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('communication:reviewAndSend.actions.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('communication:reviewAndSend.actions.saveAsDraft')}
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSchedule(true)}
              disabled={!isReadyToSend || isSending}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t('communication:reviewAndSend.actions.schedule')}
            </Button>
            
            <Button
              onClick={() => setShowSendConfirm(true)}
              disabled={!isReadyToSend || isSending}
            >
              <Send className="mr-2 h-4 w-4" />
              {t('communication:reviewAndSend.actions.sendNow')}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}

      <SendConfirmDialog
        open={showSendConfirm}
        onOpenChange={setShowSendConfirm}
        recipientCount={campaign.recipientIds.length}
        onConfirm={handleSendNow}
        isLoading={isSending}
      />

      <ScheduleDialogV2
        open={showSchedule}
        onOpenChange={setShowSchedule}
        onSchedule={handleSchedule}
        isLoading={isSending}
      />

      {/* Success Animation */}
      {showSuccessAnimation && campaign && (
        <CampaignSuccessAnimation
          recipientCount={campaign.recipientIds.length}
          subject={campaign.subject}
          onComplete={handleSuccessAnimationComplete}
        />
      )}
    </>
  );
}