import type React from 'react';

/**
 * Renders the provided children within the communication layout.
 *
 * Use this component to wrap content related to communication features, which are available to all subscription tiers.
 *
 * @param children - The content to display within the layout
 */
export default async function CommunicationLayout({ children }: { children: React.ReactNode }) {
  // Communication is available for all subscription tiers
  return <>{children}</>;
}