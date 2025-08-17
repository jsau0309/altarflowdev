"use client";

import { useTranslation } from 'react-i18next';
import { SettingsContent } from "@/components/settings/settings-content";

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </div>
      
      <SettingsContent />
    </div>
  );
}