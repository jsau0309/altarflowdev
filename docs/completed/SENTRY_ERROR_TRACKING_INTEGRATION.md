# Sentry Error Tracking Integration Plan

## Overview
Implement comprehensive error tracking and performance monitoring across AltarFlow using Sentry to catch bugs before users report them, monitor application health, and improve reliability.

## Why Sentry?
- **Real-time Error Alerts**: Instant notifications when errors occur
- **Source Maps Support**: See exact line of code that errored
- **Performance Monitoring**: Track slow APIs and database queries
- **User Context**: Know which user/church experienced the error
- **Release Tracking**: Associate errors with specific deployments
- **Security Monitoring**: Track and prevent XSS attempts and other security threats
- **Business Impact Tracking**: Monitor revenue-affecting errors (donations, subscriptions)

## Integration Phases

### Phase 1: Basic Setup (Week 1)

#### 1. Installation
```bash
npm install @sentry/nextjs
npm install @sentry/profiling-node # For performance profiling
```

#### 2. Configuration Files
```bash
npx @sentry/wizard@latest -i nextjs
# This creates:
# - sentry.client.config.ts
# - sentry.server.config.ts
# - sentry.edge.config.ts
# - next.config.js modifications
```

#### 3. Environment Variables
```env
SENTRY_DSN=your-project-dsn
SENTRY_ORG=altarflow
SENTRY_PROJECT=altarflow-app
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_SENTRY_DSN=your-project-dsn
```

#### 4. Initial Configuration
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true, // Privacy
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Phase 2: Error Categorization (Week 2)

#### Critical Errors (Alert Immediately)
```typescript
// Payment failures
Sentry.captureException(error, {
  level: 'error',
  tags: {
    category: 'payment',
    critical: true,
  },
  context: {
    donation_amount: amount,
    payment_method: method,
    church_id: hashedChurchId,
  },
});

// Authentication failures
Sentry.captureException(error, {
  level: 'error',
  tags: {
    category: 'auth',
    critical: true,
  },
});

// Database connection errors
Sentry.captureException(error, {
  level: 'error',
  tags: {
    category: 'database',
    critical: true,
    error_code: 'P2024', // Prisma timeout
  },
});
```

#### Warning Level Errors
```typescript
// AI feature failures
Sentry.captureException(error, {
  level: 'warning',
  tags: {
    category: 'ai_features',
    feature: 'report_summary',
  },
});

// Email sending failures
Sentry.captureException(error, {
  level: 'warning',
  tags: {
    category: 'email',
    provider: 'resend',
  },
});
```

#### Email Template Error Tracking
```typescript
// lib/email/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

export function trackEmailError(
  error: Error,
  context: {
    templateType: 'donation_receipt' | 'new_member' | 'prayer_request';
    churchId: string;
    recipientEmail: string;
    transactionId?: string;
    errorStage: 'generation' | 'sending' | 'delivery';
  }
) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      category: 'email',
      template: context.templateType,
      stage: context.errorStage,
      critical: context.templateType === 'donation_receipt', // Receipts are critical
    },
    extra: {
      churchId: hashChurchId(context.churchId),
      recipientDomain: context.recipientEmail.split('@')[1], // Track problematic domains
      transactionId: context.transactionId,
    },
    fingerprint: ['email', context.templateType, context.errorStage],
  });
}
```

#### Subscription & Billing Error Tracking
```typescript
// Critical for Altarflow's business model
export function trackSubscriptionError(
  error: Error,
  context: {
    churchId: string;
    subscriptionId?: string;
    operation: 'create' | 'update' | 'cancel' | 'payment_failed';
    stripeErrorCode?: string;
  }
) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      category: 'subscription',
      operation: context.operation,
      critical: true,
      stripe_error: context.stripeErrorCode,
    },
    extra: {
      churchId: hashChurchId(context.churchId),
      subscriptionId: context.subscriptionId,
    },
  });
  
  // Also track as a business metric
  Sentry.captureMessage(`Subscription ${context.operation} failed`, {
    level: 'error',
    contexts: {
      business_impact: {
        potential_revenue_loss: true,
        church_affected: context.churchId,
      },
    },
  });
}
```

### Phase 3: Performance Monitoring (Week 3)

#### API Route Monitoring
```typescript
// app/api/donations/route.ts
export async function POST(request: Request) {
  const transaction = Sentry.startTransaction({
    op: "http.server",
    name: "POST /api/donations",
  });

  try {
    const span = transaction.startChild({
      op: "db.query",
      description: "Create donation record",
    });
    
    // Your donation logic
    const donation = await createDonation(data);
    
    span.finish();
    transaction.finish();
    
    return NextResponse.json(donation);
  } catch (error) {
    transaction.setStatus("internal_error");
    transaction.finish();
    throw error;
  }
}
```

#### Database Query Performance
```typescript
// lib/db-monitoring.ts
import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Queries over 1 second
    Sentry.captureMessage('Slow database query detected', {
      level: 'warning',
      extra: {
        query: e.query,
        duration: e.duration,
        params: e.params,
      },
    });
  }
});
```

#### Rate Limiting Monitoring (Memory Leak Prevention)
```typescript
// lib/monitoring/rate-limit-tracking.ts
export function monitorRateLimitCache() {
  setInterval(() => {
    const cacheSize = submissionCache.size;
    
    if (cacheSize > 5000) {
      Sentry.captureMessage('Rate limit cache growing large', {
        level: 'warning',
        extra: {
          cacheSize,
          memoryUsage: process.memoryUsage(),
        },
      });
    }
  }, 30 * 60 * 1000); // Every 30 minutes
}
```

#### Database Connection Pool Monitoring
```typescript
// lib/monitoring/database-health.ts
let connectionCount = 0;

prisma.$use(async (params, next) => {
  connectionCount++;
  
  if (connectionCount > 25) { // Near Supabase limit
    Sentry.captureMessage('Database connection pool near limit', {
      level: 'warning',
      extra: {
        connectionCount,
        operation: params.action,
        model: params.model,
      },
    });
  }
  
  try {
    const result = await next(params);
    connectionCount--;
    return result;
  } catch (error) {
    connectionCount--;
    if (error.code === 'P2024') {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          category: 'database',
          error_code: 'P2024',
          critical: true,
        },
      });
    }
    throw error;
  }
});
```

#### Frontend Performance
```typescript
// Track slow page loads
export function trackPagePerformance() {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation.loadEventEnd - navigation.fetchStart > 3000) {
        Sentry.captureMessage('Slow page load detected', {
          level: 'warning',
          extra: {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            page: window.location.pathname,
          },
        });
      }
    });
  }
}
```

### Phase 4: Custom Integrations (Week 4)

#### Multi-Language Error Context
```typescript
// Add to initial configuration
beforeSend(event, hint) {
  // Add language context
  if (typeof window !== 'undefined') {
    event.contexts = {
      ...event.contexts,
      app: {
        language: localStorage.getItem('language') || 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  }
  
  // Filter out sensitive data
  if (event.request?.cookies) {
    delete event.request.cookies;
  }
  
  return event;
}
```

#### Security Event Tracking
```typescript
// lib/monitoring/security-events.ts
export function trackSecurityEvent(
  event: {
    type: 'xss_attempt' | 'sql_injection' | 'auth_bypass' | 'rate_limit_exceeded';
    source: string;
    blocked: boolean;
    userId?: string;
    ipAddress?: string;
  }
) {
  Sentry.captureMessage(`Security event: ${event.type}`, {
    level: event.blocked ? 'warning' : 'error',
    tags: {
      category: 'security',
      event_type: event.type,
      blocked: event.blocked,
    },
    extra: {
      source: event.source,
      userId: event.userId,
      ipHash: hashIP(event.ipAddress), // Don't store raw IPs
    },
  });
}
```

#### Church-Specific Error Monitoring
```typescript
// lib/monitoring/church-health.ts
export async function trackChurchHealth(churchId: string) {
  const metrics = await prisma.$queryRaw`
    SELECT 
      COUNT(DISTINCT CASE WHEN error_type = 'donation' THEN id END) as donation_errors,
      COUNT(DISTINCT CASE WHEN error_type = 'email' THEN id END) as email_errors,
      COUNT(DISTINCT member_id) as affected_members
    FROM error_logs
    WHERE church_id = ${churchId}
    AND created_at > NOW() - INTERVAL '24 hours'
  `;
  
  if (metrics.donation_errors > 5) {
    Sentry.captureMessage('Church experiencing high donation error rate', {
      level: 'warning',
      tags: {
        category: 'church_health',
        alert_type: 'proactive',
      },
      extra: {
        churchId: hashChurchId(churchId),
        metrics,
      },
    });
  }
}
```

#### Webhook Failure Recovery System
```typescript
// lib/monitoring/webhook-recovery.ts
interface FailedWebhook {
  id: string;
  type: 'stripe' | 'resend';
  payload: any;
  error: string;
  attempts: number;
  churchId: string;
}

export async function trackFailedWebhook(webhook: FailedWebhook) {
  // Store in database for retry
  await prisma.failedWebhook.create({
    data: webhook,
  });
  
  // Alert if critical
  if (webhook.type === 'stripe' && webhook.attempts > 2) {
    Sentry.captureMessage('Critical webhook failing repeatedly', {
      level: 'error',
      tags: {
        webhook_type: webhook.type,
        critical: true,
        needs_manual_intervention: true,
      },
      extra: {
        webhookId: webhook.id,
        churchId: hashChurchId(webhook.churchId),
        errorMessage: webhook.error,
      },
    });
  }
}
```

#### Clerk Authentication Integration
```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";

export default authMiddleware({
  afterAuth(auth, req) {
    if (auth.userId) {
      Sentry.setUser({
        id: auth.userId,
        organization: auth.orgId,
      });
    }
  },
  onError(error) {
    Sentry.captureException(error, {
      tags: {
        category: 'auth_middleware',
      },
    });
  },
});
```

#### Stripe Webhook Error Handling
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  try {
    const event = await stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    
    // Process webhook
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        webhook_type: 'stripe',
        critical: true,
      },
      extra: {
        headers: req.headers,
      },
    });
    
    return new Response('Webhook error', { status: 400 });
  }
}
```

#### Custom Error Boundary
```typescript
// components/error-boundary.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        error_boundary: true,
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Alert Configuration

### Critical Alerts (Immediate - PagerDuty)
- Payment processing failures
- Authentication system errors
- Database connection failures (P2024 errors)
- Stripe webhook failures
- Donation receipt email failures (> 3 in 5 minutes)
- Church subscription payment failures
- XSS attempt detected and not blocked
- Stripe webhook signature verification failures

### High Priority (Within 5 minutes - Slack + Email)
- AI feature failures affecting > 10 users
- Email campaign sending failures
- Slow API responses (> 5s)
- Church experiencing > 10 errors/hour
- Email campaign completely failed (0% delivery)
- AI summary generation down for > 5 churches
- Member registration failures > 5 in 10 minutes

### Medium Priority (Within 1 hour)
- Individual email sending failures
- Slow database queries
- Client-side JavaScript errors
- Rate limit cache size > 5000 entries
- Connection pool usage > 80%

### Low Priority (Daily digest)
- 404 errors
- Validation errors
- Rate limit hits
- Churches with increasing error rates
- Email domains with high bounce rates
- Feature usage vs error correlation

## Implementation Checklist

### Setup & Configuration
- [ ] Install Sentry packages
- [ ] Run Sentry wizard
- [ ] Configure environment variables
- [ ] Set up source maps
- [ ] Configure privacy filters
- [ ] Test error capturing

### Error Tracking
- [ ] Implement error boundaries
- [ ] Add try-catch blocks to critical paths
- [ ] Configure error levels and tags
- [ ] Set up user context
- [ ] Test error grouping

### Performance Monitoring
- [ ] Enable tracing
- [ ] Add custom transactions
- [ ] Monitor database queries
- [ ] Track API response times
- [ ] Set up web vitals tracking

### Integrations
- [ ] Clerk authentication context
- [ ] Stripe webhook monitoring
- [ ] Prisma query tracking
- [ ] Next.js API route monitoring
- [ ] Browser session replay

### Alerting & Dashboards
- [ ] Configure alert rules
- [ ] Set up email notifications
- [ ] Create Slack integration
- [ ] Build custom dashboards
- [ ] Set up release tracking

### Business Monitoring
- [ ] Track donation success/failure rates by church
- [ ] Monitor subscription lifecycle events
- [ ] Alert on unusual church activity patterns
- [ ] Track feature adoption vs error rates

### Email System Health
- [ ] Monitor email template generation errors
- [ ] Track delivery rates by provider
- [ ] Alert on bounce rate increases
- [ ] Monitor unsubscribe rates

### Security Monitoring
- [ ] Track XSS attempt patterns
- [ ] Monitor authentication anomalies
- [ ] Alert on repeated failed access attempts
- [ ] Track API rate limit violations

### Compliance & Privacy
- [ ] Implement PII scrubbing
- [ ] Set up data retention policies
- [ ] Create audit logs for data access
- [ ] Document GDPR compliance measures

#### User Journey Tracking
```typescript
// hooks/use-journey-tracking.ts
export function useJourneyTracking() {
  const startJourney = (journeyType: 'donation' | 'registration' | 'email_campaign') => {
    const journeyId = generateId();
    
    Sentry.addBreadcrumb({
      message: `Journey started: ${journeyType}`,
      level: 'info',
      data: { journeyId },
    });
    
    return {
      trackStep: (step: string, data?: any) => {
        Sentry.addBreadcrumb({
          message: `Journey step: ${step}`,
          level: 'info',
          data: { journeyId, step, ...data },
        });
      },
      
      completeJourney: (success: boolean, data?: any) => {
        const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
        if (transaction) {
          transaction.setTag('journey_completed', success);
          transaction.setData('journey_type', journeyType);
        }
      },
    };
  };
  
  return { startJourney };
}
```

## Code Examples

### 1. Enhanced Error Capturing
```typescript
// lib/error-handler.ts
import * as Sentry from '@sentry/nextjs';

export function captureError(
  error: Error,
  context: {
    userId?: string;
    churchId?: string;
    action: string;
    metadata?: Record<string, any>;
  }
) {
  // Add breadcrumbs for better debugging
  Sentry.addBreadcrumb({
    message: `User action: ${context.action}`,
    level: 'info',
    data: context.metadata,
  });

  // Capture with enhanced context
  Sentry.captureException(error, {
    user: {
      id: context.userId,
    },
    tags: {
      action: context.action,
      church_id: context.churchId ? hashChurchId(context.churchId) : undefined,
    },
    extra: context.metadata,
  });
}
```

### 2. API Route Wrapper
```typescript
// lib/api-wrapper.ts
import * as Sentry from '@sentry/nextjs';

export function withSentry(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${req.method} ${new URL(req.url).pathname}`,
    });

    try {
      const response = await handler(req);
      transaction.setHttpStatus(response.status);
      return response;
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  };
}
```

### 3. Frontend Error Hook
```typescript
// hooks/use-error-handler.ts
import * as Sentry from '@sentry/nextjs';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

export function useErrorHandler() {
  const { userId, orgId } = useAuth();

  const handleError = (error: Error, userMessage?: string) => {
    // Log to Sentry
    Sentry.captureException(error, {
      user: { id: userId },
      tags: { org_id: orgId },
    });

    // Show user-friendly message
    toast.error(userMessage || 'Something went wrong. Please try again.');

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  };

  return { handleError };
}
```

## Monitoring Dashboards

### 1. Error Overview Dashboard
- Error rate by category
- Top errors by occurrence
- Error trends over time
- Affected users count

### 2. Performance Dashboard
- API response times
- Database query performance
- Page load speeds
- Core Web Vitals

### 3. Business Impact Dashboard
- Payment failure rate
- AI feature availability
- Email delivery success
- User session health

## Success Metrics

### Month 1
- [ ] 100% of critical errors tracked
- [ ] < 5 minute alert response time
- [ ] Zero PII in error logs

### Month 3
- [ ] 50% reduction in time to fix
- [ ] Proactive bug fixes (before user reports)
- [ ] Performance baseline established

### Month 6
- [ ] 99.9% uptime achieved
- [ ] 80% of errors auto-resolved
- [ ] User-reported bugs near zero

## Maintenance Plan
- Daily error report review
- Weekly performance analysis
- Monthly alert rule optimization
- Quarterly integration audit

## Privacy & Compliance

### GDPR & Privacy Implementation
```typescript
// lib/monitoring/privacy.ts
function sanitizeUserData(data: any): any {
  const sensitiveFields = [
    'email', 'phone', 'addressLine1', 'addressLine2',
    'ssn', 'taxId', 'bankAccount', 'routingNumber'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Use in all error capturing
Sentry.captureException(error, {
  extra: sanitizeUserData(context),
});

// Hash functions for IDs
function hashChurchId(churchId: string): string {
  return crypto.createHash('sha256').update(churchId).digest('hex').substring(0, 8);
}

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 8);
}
```

### Environment-Specific Configuration
```typescript
// sentry.config.ts
const isDevelopment = process.env.NODE_ENV === 'development';

Sentry.init({
  // ... other config
  
  // Don't send local dev errors to Sentry
  enabled: !isDevelopment,
  
  // But still log them locally
  beforeSend(event, hint) {
    if (isDevelopment) {
      console.error('Sentry Event:', event);
      return null; // Don't send
    }
    
    // Production: Sanitize data
    if (event.extra) {
      event.extra = sanitizeUserData(event.extra);
    }
    
    return event;
  },
  
  // Different sampling for dev/staging/prod
  tracesSampleRate: 
    isDevelopment ? 1.0 : 
    process.env.VERCEL_ENV === 'preview' ? 0.5 : 
    0.1,
    
  // Session replay sampling
  replaysSessionSampleRate: isDevelopment ? 1.0 : 0.1,
  replaysOnErrorSampleRate: isDevelopment ? 1.0 : 1.0,
});
```

### Compliance Checklist
- No personal data in error messages
- Church IDs always hashed
- Session replays anonymized
- GDPR-compliant data retention (90 days)
- PII automatically scrubbed from all contexts
- IP addresses hashed, never stored raw
- Email addresses partially masked in logs
- Financial data never included in error context

## Resources
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Best Practices](https://docs.sentry.io/product/sentry-basics/guides/)