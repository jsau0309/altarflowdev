import { Metadata } from "next";
import { RecipientsPageClient } from "./recipients-page-client";

export const metadata: Metadata = {
  title: "Select Recipients | New Email Campaign",
  description: "Choose who will receive your email",
};

/**
 * Renders the recipients selection page for creating a new email campaign.
 *
 * Displays the client-side UI for choosing email recipients.
 */
export default function RecipientsPage() {
  return <RecipientsPageClient />;
}