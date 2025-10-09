import type React from "react";

/**
 * Layout for Flow (Connect) pages
 * Forces light mode regardless of user's theme preference in the main app
 * This provides a consistent, professional experience for public-facing intake forms
 */
export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="light text-gray-900 public-page-light"
      data-theme="light"
    >
      {children}
    </div>
  );
}
