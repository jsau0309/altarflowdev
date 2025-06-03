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
      console.log('[CrispChat] Already initialized in this session. Chat should be visible.');
      // If Crisp is already initialized, its visibility state should persist from the initial load.
      // We don't need to do anything further here.
      return;
    }

    const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

    if (crispWebsiteId) {
      console.log('[CrispChat] Configuring Crisp with Website ID:', crispWebsiteId);
      Crisp.configure(crispWebsiteId);
      
      // Set the flag once configured
      if (typeof window !== 'undefined') {
        (window as any).__CRISP_INITIALIZED__ = true;
      }

      // Log Crisp SDK availability. Chat should be visible by default.
      if (window.$crisp) {
        console.log('[CrispChat] window.$crisp is available after configure. Chat should be visible by default.');
      } else {
        // This might indicate a timing issue or that Crisp SDK needs a moment to initialize $crisp.
        console.warn('[CrispChat] window.$crisp was NOT available immediately after configure. Attempting check after delay.');
        setTimeout(() => {
          if (window.$crisp) {
            console.log('[CrispChat] window.$crisp became available after a delay. Chat should be visible.');
          } else {
            console.warn('[CrispChat] window.$crisp still not available after delay. Chat visibility might be affected.');
          }
        }, 500); // 500ms delay
      }
    } else {
      console.error('[CrispChat] Crisp Website ID (NEXT_PUBLIC_CRISP_WEBSITE_ID) is not configured. Chat will not load.');
    }
  }, []);

  return null; // This component doesn't render anything itself
};

export default CrispChat;
