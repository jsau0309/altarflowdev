import { redirect } from "next/navigation";

export default function NewCampaignPage() {
  // Redirect to the first step of the campaign creation flow
  redirect("/communication/new/details");
}