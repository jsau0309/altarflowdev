import { Metadata } from "next";
import { EditorPageClient } from "./editor-page-client";

export const metadata: Metadata = {
  title: "Design Email | New Email Campaign",
  description: "Design your email campaign",
};

/**
 * Renders the email editor page for creating a new email campaign.
 *
 * Displays the client-side email editor interface.
 */
export default function EmailEditorPage() {
  return <EditorPageClient />;
}