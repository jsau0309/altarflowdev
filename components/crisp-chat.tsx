'use client';

import { useEffect } from 'react';
import { Crisp } from 'crisp-sdk-web';

// Add a global flag for initialization state
if (typeof window !== 'undefined') {
  (window as any).__CRISP_INITIALIZED__ = (window as any).__CRISP_INITIALIZED__ || false;
}

const CrispChat = () => {
  useEffect(() => {
    // Check if Crisp has already been initialized in this session
    if (typeof window !== 'undefined' && (window as any).__CRISP_INITIALIZED__) {
      // Debug logging removed: Crisp already initialized
      return; // No need to re-configure or re-set position if already initialized.
    }

    const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

    if (crispWebsiteId) {
      // Debug logging removed: configuring Crisp
      Crisp.configure(crispWebsiteId);
      
      // Set the flag once configured
      if (typeof window !== 'undefined') {
        (window as any).__CRISP_INITIALIZED__ = true;
      }

      // Log Crisp SDK availability. Position is now expected to be controlled by dashboard settings.
      if (window.$crisp) {
        // Debug logging removed: Crisp SDK available
      } else {
        console.warn('[CrispChat] window.$crisp was NOT available immediately after configure. Waiting for it to become available.');
        setTimeout(() => {
          if (window.$crisp) {
            // Debug logging removed: Crisp SDK became available after delay
          } else {
            console.warn('[CrispChat] window.$crisp still not available after delay.');
          }
        }, 500);
      }
    } else {
      console.error('[CrispChat] Crisp Website ID (NEXT_PUBLIC_CRISP_WEBSITE_ID) is not configured. Chat will not load.');
    }
  }, []);

  return null; // This component doesn't render anything itself
};

export default CrispChat;
