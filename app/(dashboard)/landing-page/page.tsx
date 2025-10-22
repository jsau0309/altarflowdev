import type { Metadata } from "next";
import { LandingManagerEnhanced } from "@/components/settings/landing-manager-enhanced";

export const metadata: Metadata = {
  title: "Landing Page Manager | Altarflow",
  description: "Customize your church's public landing page",
};

export default function LandingManagerPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Landing Page Manager</h1>
          <p className="text-muted-foreground mt-1">
            Customize how your church appears to visitors
          </p>
        </div>
      </div>

      <LandingManagerEnhanced />
    </div>
  );
}
