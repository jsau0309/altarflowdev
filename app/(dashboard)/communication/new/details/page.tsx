import { Metadata } from "next";
import { CampaignDetailsForm } from "./campaign-details-form";
import { CampaignProgress } from "@/components/communication/campaign-progress";
import { CampaignHeader } from "./campaign-header";

export const metadata: Metadata = {
  title: "Campaign Details | New Email Campaign",
  description: "Set up your email campaign details",
};

/**
 * Renders the campaign details page layout with header, progress indicator, and details form.
 *
 * This component displays the first step of the new email campaign setup process, including the campaign header, a progress bar set to step 1, and a form for entering campaign details.
 */
export default function CampaignDetailsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <CampaignHeader />
      
      <CampaignProgress currentStep={1} />
      
      <CampaignDetailsForm />
    </div>
  );
}