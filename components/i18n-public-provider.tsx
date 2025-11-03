"use client";

import { I18nextProvider } from 'react-i18next';
import publicI18n from '@/lib/i18n-public';

interface PublicI18nProviderProps {
  children: React.ReactNode;
}

export function PublicI18nProvider({ children }: PublicI18nProviderProps) {
  return (
    <I18nextProvider i18n={publicI18n}>
      {children}
    </I18nextProvider>
  );
}
