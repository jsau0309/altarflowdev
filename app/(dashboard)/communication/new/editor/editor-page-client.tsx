"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EmailEditorWrapper } from "./email-editor-wrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignProgress } from "@/components/communication/campaign-progress";
import { useTranslation } from "react-i18next";

export function EditorPageClient() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const { t } = useTranslation(['communication']);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={campaignId ? `/communication/new/details?campaignId=${campaignId}` : "/communication/new/details"}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('communication:newCampaign.backToDetails')}
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t('communication:newCampaign.designTitle')}</h1>
            <p className="text-muted-foreground">{t('communication:newCampaign.step2Description')}</p>
          </div>
        </div>
        
        <CampaignProgress currentStep={2} />
      </div>
      
      <div className="flex-1 pb-6">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">{t('communication:newCampaign.loadingEditor')}</p>
            </div>
          </div>
        }>
          <EmailEditorWrapper />
        </Suspense>
      </div>
    </div>
  );
}