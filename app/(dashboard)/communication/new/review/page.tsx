import { Metadata } from "next";
import { ReviewPageClient } from "./review-page-client";

export const metadata: Metadata = {
  title: "Review & Send | New Email Campaign",
  description: "Review and send your email campaign",
};

export default function ReviewPage() {
  return <ReviewPageClient />;
}