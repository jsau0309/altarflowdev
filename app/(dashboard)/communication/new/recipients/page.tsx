import { Metadata } from "next";
import { RecipientsPageClient } from "./recipients-page-client";

export const metadata: Metadata = {
  title: "Select Recipients | New Email Campaign",
  description: "Choose who will receive your email",
};

export default function RecipientsPage() {
  return <RecipientsPageClient />;
}