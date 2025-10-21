"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Shield, Globe } from "lucide-react";
import { GeneralSettings } from "./general-settings";
import { LandingManagerEnhanced as LandingManager } from "./landing-manager-enhanced";
import { AccountManagement } from "./account-management";
import { useSearchParams } from "next/navigation";

export function SettingsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["general", "account", "landing"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const settingsSections = [
    {
      id: "general",
      label: t("settings:tabs.general", "General"),
      icon: Settings,
      description: t("settings:tabs.generalDesc", "Basic church information and preferences")
    },
    {
      id: "account",
      label: t("settings:tabs.account", "Account Management"),
      icon: Shield,
      description: t("settings:tabs.accountDesc", "Manage users and permissions")
    },
    {
      id: "landing",
      label: t("settings:tabs.landing", "Landing Manager"),
      icon: Globe,
      description: t("settings:tabs.landingDesc", "Customize your church's public page")
    }
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid grid-cols-1 md:grid-cols-3 gap-2 h-auto">
        {settingsSections.map((section) => {
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

      <TabsContent value="general" className="space-y-4">
        <GeneralSettings />
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <AccountManagement />
      </TabsContent>

      <TabsContent value="landing" className="space-y-4">
        <LandingManager />
      </TabsContent>
    </Tabs>
  );
}