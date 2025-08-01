"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CampaignListWithHeader } from "./campaign-list-with-header";
import { EmailSettingsForm } from "./email-settings-form";
import { useTranslation } from "react-i18next";

export function CommunicationContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("campaigns");
  const returnFrom = searchParams.get("returnFrom");
  const { t } = useTranslation(['communication']);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["campaigns", "settings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const communicationSections = [
    {
      id: "campaigns",
      label: t('communication:tabs.campaigns'),
      icon: Mail,
      description: "View and manage your email campaigns"
    },
    {
      id: "settings",
      label: t('communication:tabs.settings'),
      icon: Settings,
      description: "Configure email appearance and delivery"
    }
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid grid-cols-1 md:grid-cols-2 gap-2 h-auto">
        {communicationSections.map((section) => {
          const Icon = section.icon;
          return (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="flex flex-col gap-1 h-auto py-2"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{section.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="campaigns" className="space-y-4">
        <CampaignListWithHeader returnFrom={returnFrom} />
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <EmailSettingsForm />
      </TabsContent>
    </Tabs>
  );
}