'use client';

import React, { useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/lib/i18n'; // Your initialized i18n instance

interface I18nClientProviderProps {
  children: React.ReactNode;
}

const I18nClientProvider: React.FC<I18nClientProviderProps> = ({ children }) => {
  // Add state to track language changes and force re-renders
  const [isMounted, setIsMounted] = useState(false); // Track mount state
  const [, setLanguage] = useState(i18nInstance.language);

  useEffect(() => {
    setIsMounted(true); // Set mounted state on client

    // This function will be called whenever the language changes
    const handleLanguageChanged = (lng: string) => {
      // Debug logging removed: language changed
      setLanguage(lng); // Update state to trigger re-render
      document.documentElement.lang = lng;
    };

    // Set initial lang attribute *after* mount to avoid mismatch if detected lang differs
    document.documentElement.lang = i18nInstance.language;
    // Update state if language changed between initial load and mount
    setLanguage(i18nInstance.language);

    // Subscribe to the language change event
    i18nInstance.on('languageChanged', handleLanguageChanged);

    // Cleanup
    return () => {
      i18nInstance.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  // Avoid rendering children until mounted to ensure client/server match on initial render
  if (!isMounted) {
    // Returning null or a static loader is safer for hydration
    return null; // Or a minimal loader component that doesn't use i18n
  }

  // Render the provider only after mount
  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
};

export default I18nClientProvider; 