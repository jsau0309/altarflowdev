"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";

/**
 * Renders the header section for the campaign creation or editing page, including navigation and localized titles.
 *
 * Displays a back button, a title that switches between "edit" and "create" modes based on the presence of a campaign ID in the URL, and a localized description for the current step.
 */
export function CampaignHeader() {
  const { t } = useTranslation(['communication']);
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  
  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/communication">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('communication:newCampaign.backToCampaigns')}
          </Link>
        </Button>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {campaignId ? t('communication:newCampaign.editTitle') : t('communication:newCampaign.createTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('communication:newCampaign.step1Description')}
        </p>
      </div>
    </div>
  );
}