"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RecipientsSelector } from "./recipients-selector";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignProgress } from "@/components/communication/campaign-progress";
import { useTranslation } from "react-i18next";

export function RecipientsPageClient() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const { t } = useTranslation(['communication']);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={campaignId ? `/communication/new/editor?campaignId=${campaignId}` : "/communication/new/editor"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('communication:newCampaign.backToEditor')}
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('communication:newCampaign.recipientsTitle')}</h1>
        <p className="text-muted-foreground">{t('communication:newCampaign.step3Description')}</p>
      </div>
      
      <CampaignProgress currentStep={3} />
      
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">{t('communication:newCampaign.loadingRecipients')}</p>
          </div>
        </div>
      }>
        <RecipientsSelector />
      </Suspense>
    </div>
  );
}