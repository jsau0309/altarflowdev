import type React from 'react';

export default async function CommunicationLayout({ children }: { children: React.ReactNode }) {
  // Communication is available for all subscription tiers
  return <>{children}</>;
}