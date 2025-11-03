"use client";

import { LanguageSwitcher } from './language-switcher';

interface ConnectPageWrapperProps {
  children: React.ReactNode;
}

export function ConnectPageWrapper({ children }: ConnectPageWrapperProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Language Switcher */}
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher variant="compact" />
      </div>
      {children}
    </div>
  );
}
