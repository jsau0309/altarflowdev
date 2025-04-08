"use client";

import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n'; // Adjust the path if your i18n init file is elsewhere

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // The i18n instance is already initialized in lib/i18n.ts
  // We just need to provide it to the context
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider; 