import { Metadata } from "next";
import { EditCampaignForm } from "./edit-campaign-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Edit Email Campaign | Communication",
  description: "Edit your email campaign",
};

export default async function EditCampaignPage() {
  // TODO: Re-enable when edit functionality is restored
  // params: { params: Promise<{ id: string }>}
  // const { id } = await params;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/communication">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Email Campaign
          </h1>
          <p className="text-muted-foreground mt-2">
            Update your email campaign details
          </p>
        </div>
      </div>
      
      <EditCampaignForm />
    </div>
  );
}