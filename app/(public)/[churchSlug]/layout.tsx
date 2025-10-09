import type React from "react";

/**
 * Layout for church-specific public pages (mainly donation pages)
 * Forces light mode regardless of user's theme preference in the main app
 * This provides a consistent, trustworthy experience for public-facing donation forms
 */
export default function ChurchPublicLayout({
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
