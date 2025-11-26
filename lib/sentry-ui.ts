import * as Sentry from "@sentry/nextjs";
import type { SentryContext } from '@/types/sentry';

/**
 * UI Span Instrumentation Helpers
 * These helpers make it easy to add proper tracing to UI components
 */

// Helper for button click instrumentation
export function instrumentButtonClick(
  buttonName: string,
  metadata: SentryContext = {},
  handler: () => void | Promise<void>
) {
  return () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: `${buttonName} Click`,
        attributes: {
          'ui.component': buttonName,
          ...metadata
        }
      },
      async () => {
        try {
          await handler();
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  };
}

// Helper for form submission instrumentation
export function instrumentFormSubmit<T extends Record<string, unknown>>(
  formName: string,
  metadata: SentryContext = {},
  handler: (data: T) => void | Promise<void>
) {
  return (data: T) => {
    Sentry.startSpan(
      {
        op: "ui.form.submit",
        name: `${formName} Form Submit`,
        attributes: {
          'form.name': formName,
          'form.fields': Object.keys(data).length,
          ...metadata
        }
      },
      async () => {
        try {
          await handler(data);
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  };
}

// Helper for API fetch instrumentation from the client
export async function instrumentedFetch<T>(
  url: string,
  options: RequestInit & { name?: string } = {}
): Promise<T> {
  const { name, ...fetchOptions } = options;
  const operationName = name || `${fetchOptions.method || 'GET'} ${url}`;
  
  return Sentry.startSpan(
    {
      op: "http.client",
      name: operationName,
      attributes: {
        'http.method': fetchOptions.method || 'GET',
        'http.url': url,
      }
    },
    async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(url, fetchOptions);
        
        // Add response status as span attribute
        const span = Sentry.getActiveSpan();
        if (span) {
          span.setAttribute('http.status_code', response.status);
          span.setAttribute('http.response_time', Date.now() - startTime);
        }
        
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          Sentry.captureException(error, {
            contexts: {
              http: {
                method: fetchOptions.method || 'GET',
                url,
                status_code: response.status
              }
            }
          });
          throw error;
        }
        
        return response.json();
      } catch (error) {
        // Log network errors
        Sentry.captureException(error, {
          tags: {
            'error.type': 'network'
          }
        });
        throw error;
      }
    }
  );
}

// Helper for tracking user interactions
export function trackUserInteraction(
  action: string,
  category: string,
  metadata: SentryContext = {}
) {
  Sentry.addBreadcrumb({
    category: 'user',
    message: action,
    level: 'info',
    data: {
      category,
      ...metadata
    }
  });
}

// Helper for tracking page load performance
export function trackPageLoadPerformance(pageName: string) {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      Sentry.startSpan(
        {
          op: 'pageload',
          name: `${pageName} Page Load`,
          attributes: {
            'page.name': pageName,
            'navigation.type': navigation.type,
            'timing.dns': navigation.domainLookupEnd - navigation.domainLookupStart,
            'timing.tcp': navigation.connectEnd - navigation.connectStart,
            'timing.request': navigation.responseStart - navigation.requestStart,
            'timing.response': navigation.responseEnd - navigation.responseStart,
            'timing.dom_interactive': navigation.domInteractive - navigation.responseEnd,
            'timing.dom_complete': navigation.domComplete - navigation.domInteractive,
            'timing.load_complete': navigation.loadEventEnd - navigation.loadEventStart,
            'timing.total': navigation.loadEventEnd - navigation.fetchStart
          }
        },
        () => {
          // Performance data is already captured in attributes
        }
      );
    }
  }
}

// Helper for tracking long tasks
export function trackLongTask(
  taskName: string,
  threshold: number = 50, // milliseconds
  handler: () => void | Promise<void>
) {
  return async () => {
    const startTime = performance.now();
    
    try {
      await handler();
    } finally {
      const duration = performance.now() - startTime;
      
      if (duration > threshold) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Long task detected: ${taskName}`,
          level: 'warning',
          data: {
            duration: Math.round(duration),
            threshold
          }
        });
      }
    }
  };
}