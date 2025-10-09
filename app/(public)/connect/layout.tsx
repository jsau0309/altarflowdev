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
      className="light text-gray-900"
      data-theme="light"
      style={{
        colorScheme: 'light',
        background: 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)',
        minHeight: '100vh'
      }}
    >
      {children}
    </div>
  );
}
