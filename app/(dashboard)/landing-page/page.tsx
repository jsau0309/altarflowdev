"use client";

import type { Metadata } from "next";
import { useTranslation } from "react-i18next";
import { LandingManagerEnhanced } from "@/components/settings/landing-manager-enhanced";

export default function LandingManagerPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("settings:landing.title", "Landing Page Manager")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("settings:landing.subtitle", "Customize how your church appears to visitors")}
          </p>
        </div>
      </div>

      <LandingManagerEnhanced />
    </div>
  );
}
