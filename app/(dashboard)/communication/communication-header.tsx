"use client";

import { useTranslation } from "react-i18next";

/**
 * Renders a header section with a translated title and subtitle for the communication dashboard.
 *
 * Displays localized text for the communication section using the `react-i18next` translation hook.
 */
export function CommunicationHeader() {
  const { t } = useTranslation(['communication']);
  
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {t('communication:title')}
      </h1>
      <p className="text-muted-foreground mt-2">
        {t('communication:subtitle')}
      </p>
    </div>
  );
}