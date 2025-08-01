"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReviewAndSend } from "./review-and-send";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignProgress } from "@/components/communication/campaign-progress";
import { useTranslation } from "react-i18next";

export function ReviewPageClient() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const { t } = useTranslation(['communication']);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={campaignId ? `/communication/new/recipients?campaignId=${campaignId}` : "/communication/new/recipients"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('communication:newCampaign.backToRecipients')}
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('communication:newCampaign.reviewTitle')}</h1>
        <p className="text-muted-foreground">{t('communication:newCampaign.step4Description')}</p>
      </div>
      
      <CampaignProgress currentStep={4} />
      
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">{t('communication:newCampaign.loadingCampaign')}</p>
          </div>
        </div>
      }>
        <ReviewAndSend />
      </Suspense>
    </div>
  );
}