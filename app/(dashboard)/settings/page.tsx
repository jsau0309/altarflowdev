import { Metadata } from "next";
import { SettingsContent } from "@/components/settings/settings-content";

export const metadata: Metadata = {
  title: "Settings | Altarflow",
  description: "Manage your church settings and preferences",
};

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your church settings and preferences
        </p>
      </div>
      
      <SettingsContent />
    </div>
  );
}