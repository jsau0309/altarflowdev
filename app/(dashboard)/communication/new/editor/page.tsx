import { Metadata } from "next";
import { EditorPageClient } from "./editor-page-client";

export const metadata: Metadata = {
  title: "Design Email | New Email Campaign",
  description: "Design your email campaign",
};

export default function EmailEditorPage() {
  return <EditorPageClient />;
}