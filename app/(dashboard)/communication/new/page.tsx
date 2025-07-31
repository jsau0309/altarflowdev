import { redirect } from "next/navigation";

/**
 * Redirects users to the initial step of the campaign creation process.
 *
 * This page component immediately navigates to `/communication/new/details` when accessed.
 */
export default function NewCampaignPage() {
  // Redirect to the first step of the campaign creation flow
  redirect("/communication/new/details");
}