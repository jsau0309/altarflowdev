"use client";

import { LanguageSwitcher } from './language-switcher';

interface ConnectPageWrapperProps {
  children: React.ReactNode;
}

export function ConnectPageWrapper({ children }: ConnectPageWrapperProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* White card container with language switcher inside */}
      <div className="bg-white rounded-lg shadow-md">
        {/* Language Switcher at top right inside the card */}
        <div className="flex justify-end px-6 pt-6 pb-2">
          <LanguageSwitcher variant="compact" />
        </div>
        {/* Form content */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
