"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Shield, Tag } from "lucide-react";
import { GeneralSettings } from "./general-settings";
import { AccountManagement } from "./account-management";
import { CategoriesSettings } from "./categories-settings";
import { useSearchParams } from "next/navigation";

export function SettingsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["general", "account", "categories"].includes(tab)) {
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
      id: "categories",
      label: t("settings:tabs.categories", "Categories & Tags"),
      icon: Tag,
      description: t("settings:tabs.categoriesDesc", "Manage expense categories and donation types")
    },
    {
      id: "account",
      label: t("settings:tabs.account", "Account Management"),
      icon: Shield,
      description: t("settings:tabs.accountDesc", "Manage users and permissions")
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

      <TabsContent value="categories" className="space-y-4">
        <CategoriesSettings />
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <AccountManagement />
      </TabsContent>
    </Tabs>
  );
}