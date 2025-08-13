import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Release Tracking
  environment: process.env.NODE_ENV,
  
  // Integrations
  integrations: [
    // Log console.error, console.warn, and console.log calls to Sentry
    Sentry.consoleLoggingIntegration({ 
      levels: ["error", "warn", "log"] 
    }),
  ],
  
  // Enable logging experiments
  _experiments: {
    enableLogs: true,
  },
  
  // Before sending errors
  beforeSend(event) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV) {
      return null;
    }
    
    return event;
  },
});