import { Metadata } from "next";
import { CommunicationContent } from "./communication-content";
import { CommunicationHeader } from "./communication-header";

export const metadata: Metadata = {
  title: "Email Communication | Dashboard",
  description: "Send newsletters to your church members",
};

/**
 * Renders the email communication dashboard page with header and content sections.
 *
 * Displays a styled container including the communication header and content components for managing email newsletters.
 */
export default function CommunicationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <CommunicationHeader />
      <CommunicationContent />
    </div>
  );
}