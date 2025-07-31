type TopolLanguage = "en" | "fr" | "pt" | "es" | "ja" | "zh" | "ru" | "tr" | "de" | "sv" | "nl" | "it" | "fi" | "ro" | "cs" | "pl" | "ko" | "vi" | "he";

export interface TopolConfig {
  apiKey: string;
  options: {
    authorize: {
      apiKey: string;
      userId: string | number;
    };
    title?: string;
    language?: TopolLanguage;
    appearance?: {
      theme?: 'light' | 'dark';
      panels?: {
        tools?: {
          dock?: 'left' | 'right';
        };
      };
    };
    features?: {
      undoRedo?: boolean;
      preview?: boolean;
      export?: boolean;
      comments?: boolean;
      aiAssistant?: boolean;
    };
    autoSaveInterval?: number;
    contentBlocks?: {
      product?: {
        hidden?: boolean;
        disabled?: boolean;
      };
    };
    premadeBlocks?: boolean;
    testingEmails?: boolean | string[];
  };
}

export const useTopolConfig = (
  userId: string, 
  userEmail?: string, 
  language?: string, 
  theme?: string
): TopolConfig => {
  const apiKey = process.env.NEXT_PUBLIC_TOPOL_API_KEY || '';
  
  // Use provided values or defaults
  const isDarkMode = theme === 'dark';
  const topolLanguage: TopolLanguage = (language === 'es' ? 'es' : 'en') as TopolLanguage;
  
  const config: TopolConfig = {
    apiKey,
    options: {
      authorize: {
        apiKey,
        userId
      },
      title: "Email Designer",
      language: topolLanguage,
      appearance: {
        theme: isDarkMode ? 'dark' : 'light',
        panels: {
          tools: {
            dock: 'left'
          }
        }
      },
      features: {
        undoRedo: true,
        preview: true,
        export: true,
        comments: false,
        aiAssistant: true
      },
      autoSaveInterval: 30, // 30 seconds
      contentBlocks: {
        product: {
          hidden: true
        }
      },
      premadeBlocks: false,
      testingEmails: userEmail ? [userEmail] : true
    }
  };

  return config;
};

// Static config for server-side usage
export const getTopolConfig = (userId: string | number, locale: string = 'en'): TopolConfig => {
  const apiKey = process.env.NEXT_PUBLIC_TOPOL_API_KEY || '';
  
  return {
    apiKey,
    options: {
      authorize: {
        apiKey,
        userId
      },
      title: "Email Designer",
      language: (locale === 'es' ? 'es' : 'en') as TopolLanguage,
      appearance: {
        theme: 'light',
        panels: {
          tools: {
            dock: 'left'
          }
        }
      },
      features: {
        undoRedo: true,
        preview: true,
        export: true,
        comments: false,
        aiAssistant: true
      },
      autoSaveInterval: 30, // 30 seconds
      contentBlocks: {
        product: {
          hidden: true
        }
      },
      premadeBlocks: false
    }
  };
};