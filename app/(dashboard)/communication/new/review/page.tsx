import { Metadata } from "next";
import { ReviewPageClient } from "./review-page-client";

export const metadata: Metadata = {
  title: "Review & Send | New Email Campaign",
  description: "Review and send your email campaign",
};

/**
 * Renders the review page for creating a new email campaign.
 *
 * Displays the client-side component for reviewing and sending an email campaign.
 */
export default function ReviewPage() {
  return <ReviewPageClient />;
}