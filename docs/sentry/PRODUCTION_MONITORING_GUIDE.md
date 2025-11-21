# Production Monitoring Guide

**Status**: ✅ **PRODUCTION READY**
**Last Updated**: November 2025
**Tracking**: Linear ALT-87 (Pino Logging Migration)

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Sentry Cron Monitoring](#sentry-cron-monitoring)
4. [Slack Notifications](#slack-notifications)
5. [Performance Monitoring](#performance-monitoring)
6. [Business Metrics](#business-metrics)
7. [Setup Instructions](#setup-instructions)
8. [Usage Examples](#usage-examples)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

---

## Overview

AltarFlow's production monitoring system provides comprehensive visibility into:
- **Error Tracking**: Automatic Sentry integration with all logger errors
- **Cron Job Monitoring**: Sentry Cron Monitors track scheduled job health
- **Critical Alerts**: Slack notifications for payment failures, slow queries, database errors
- **Performance Monitoring**: Track slow operations and database queries
- **Business Metrics**: Track donations, email campaigns, member activity, AI usage

### Key Features

✅ **Automatic Error Tracking** - All `logger.error()` and `logger.fatal()` calls sent to Sentry
✅ **Cron Job Health** - Sentry monitors track job success/failure/duration
✅ **Critical Alerts** - Slack notifications for payment failures and database errors
✅ **Performance Alerts** - Track slow queries (>500ms) and API calls (>1s)
✅ **Business Intelligence** - Log business metrics for reporting and analytics
✅ **PII Protection** - Automatic redaction of passwords, tokens, credit cards

---

## Monitoring Stack

### Core Components

| Component | Purpose | Auto-Enabled |
|-----------|---------|--------------|
| **Pino Logger** | Structured logging with PII redaction | ✅ Yes |
| **Sentry** | Error tracking and cron monitoring | ✅ Yes (production) |
| **Slack** | Critical error notifications | ⚠️ Optional (requires webhook) |
| **Performance Monitor** | Track slow operations | ✅ Yes |
| **Business Metrics** | Track donations, campaigns, etc. | ✅ Yes |

### Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ├─────────────► logger.error() ────────┐
         │                                       │
         ├─────────────► trackPerformance() ────┤
         │                                       │
         └─────────────► metrics.donation() ────┤
                                                 │
                                                 ▼
                        ┌────────────────────────────────┐
                        │        Pino Logger             │
                        │   (PII Redaction + Routing)    │
                        └──┬──────────────────┬──────┬───┘
                           │                  │      │
                    ┌──────▼─────┐     ┌─────▼────┐ │
                    │   Sentry   │     │  Slack   │ │
                    │  (Errors)  │     │ (Alerts) │ │
                    └────────────┘     └──────────┘ │
                                                     │
                                              ┌──────▼──────┐
                                              │   Console   │
                                              │ (Dev Logs)  │
                                              └─────────────┘
```

---

## Sentry Cron Monitoring

### What It Does

Tracks scheduled cron jobs and alerts if they:
- ⏱️ **Miss their schedule** (didn't run when expected)
- ❌ **Fail to complete** (error thrown)
- 🐌 **Run too long** (exceeds max runtime)
- 🔄 **Fail repeatedly** (2+ consecutive failures)

### Monitored Cron Jobs

| Job Name | Schedule | Max Runtime | Purpose |
|----------|----------|-------------|---------|
| `check-expired-subscriptions` | Daily 2 AM UTC | 5 minutes | Check for expired church subscriptions |
| `cleanup-pending-donations` | Weekly Sun 3 AM | 10 minutes | Clean up stale pending donations |

### How It Works

**1. Automatic Check-In Reporting**

Every cron job wrapped with `executeCronJob()` automatically reports:
- ✅ **Start**: "Cron job starting"
- ✅ **Success**: "Cron job completed successfully" + duration
- ❌ **Failure**: "Cron job failed" + error details

**2. Example Implementation**

```typescript
// app/api/cron/check-expired-subscriptions/route.ts
import { executeCronJob, verifyCronAuth } from '@/lib/sentry-cron';

export async function GET() {
  const authError = await verifyCronAuth();
  if (authError) return authError;

  return executeCronJob({
    monitorSlug: 'check-expired-subscriptions',
    schedule: '0 2 * * *',
    maxRuntimeMinutes: 5,
  }, async () => {
    // Your cron job logic here
    const result = await checkExpiredSubscriptions();
    return NextResponse.json({ success: true, ...result });
  });
}
```

**3. What Gets Logged**

```typescript
// Start
logger.info('Cron job started', {
  operation: 'cron.check_expired_subscriptions.start',
  monitorSlug: 'check-expired-subscriptions',
  schedule: '0 2 * * *',
  checkInId: 'abc123'
});

// Success
logger.info('Cron job completed successfully', {
  operation: 'cron.check_expired_subscriptions.complete',
  durationMs: 1234,
  checkInId: 'abc123'
});

// Failure
logger.error('Cron job failed', {
  operation: 'cron.check_expired_subscriptions.error',
  durationMs: 567,
  checkInId: 'abc123'
}, error);
```

### Viewing Cron Monitors in Sentry

1. **Go to Sentry Dashboard**: https://sentry.io/organizations/your-org/crons/
2. **View Monitor Health**: See success rate, avg duration, last run
3. **View Issues**: Click on failed runs to see error details
4. **Configure Alerts**: Set up email/Slack notifications for failures

---

## Slack Notifications

### What Gets Alerted

Critical errors automatically trigger Slack notifications:

| Error Type | Trigger | Severity |
|------------|---------|----------|
| 🔥 **Payment Failure** | `operation` includes "payment" or "stripe" | Critical |
| 🔥 **Database Error** | `operation` includes "database" or "db." | Critical |
| 🔥 **Cron Job Failure** | `operation` starts with "cron." + "error" | Critical |
| 🔥 **Campaign Failure** | `operation` includes "campaign" + "send" | Critical |
| 🔥 **Fatal Error** | `logger.fatal()` called | Critical |

### Example Slack Message

```
🔥 Payment Failure

A donation payment has failed and requires immediate attention.

Amount: $100.00
Church: First Baptist Church
Error: card_declined

[View in Sentry]
```

### Setup Instructions

**1. Create Slack App**

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "AltarFlow Monitoring"
4. Workspace: Your Slack workspace

**2. Enable Incoming Webhooks**

1. In app settings, click "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to ON
3. Click "Add New Webhook to Workspace"
4. Select channel: `#alerts` or `#ops`
5. Copy webhook URL (starts with `https://hooks.slack.com/services/...`)

**3. Add to Environment Variables**

```bash
# .env.local or Vercel Environment Variables
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**4. Test Notification**

```typescript
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

// Test payment failure notification
await sendSlackNotification(SlackNotifications.paymentFailed({
  amount: 100,
  churchName: 'Test Church',
  error: 'Test error - please ignore',
}));
```

### How It Works

**1. Automatic Integration**

The logger automatically sends Slack notifications for critical errors:

```typescript
// lib/logger/index.ts
private log(level, message, context, error) {
  // ... logging logic ...

  // Slack notifications for critical errors
  if ((level === 'error' || level === 'fatal') && this.isProduction) {
    void this.notifySlack(level, message, context, error);
  }
}
```

**2. Smart Routing**

Notifications are routed based on operation name:

```typescript
private async notifySlack(level, message, context, error) {
  const operation = context.operation || '';

  // Payment failures
  if (operation.includes('payment') || operation.includes('stripe')) {
    await sendSlackNotification(SlackNotifications.paymentFailed({ ... }));
    return;
  }

  // Database errors
  if (operation.includes('database') || operation.includes('db.')) {
    await sendSlackNotification(SlackNotifications.databaseError({ ... }));
    return;
  }

  // ... other routing logic
}
```

### Notification Templates

Pre-built templates for common scenarios:

```typescript
import { SlackNotifications } from '@/lib/slack-notifier';

// Payment failure
SlackNotifications.paymentFailed({
  amount: 100,
  churchName: 'First Baptist',
  error: error.message,
  sentryUrl: 'https://sentry.io/...'
});

// Slow query
SlackNotifications.slowQuery({
  query: 'donations.findMany',
  duration: 2500,
  endpoint: '/api/donations'
});

// High error rate
SlackNotifications.highErrorRate({
  errorRate: 15.5,
  timeWindow: 'last 5 minutes',
  sentryUrl: 'https://sentry.io/...'
});

// Cron job failure
SlackNotifications.cronJobFailed({
  jobName: 'cleanup-pending-donations',
  error: error.message,
  sentryUrl: 'https://sentry.io/...'
});

// Email campaign failure
SlackNotifications.campaignFailed({
  campaignName: 'Weekly Newsletter',
  recipientCount: 150,
  error: error.message
});

// Database error
SlackNotifications.databaseError({
  error: error.message,
  operation: 'donations.create',
  sentryUrl: 'https://sentry.io/...'
});
```

---

## Performance Monitoring

### What Gets Tracked

- ⏱️ **API Response Times** - Track slow endpoints (>1s)
- 🗄️ **Database Queries** - Track slow queries (>500ms)
- 🌐 **External API Calls** - Track Stripe, Resend, Twilio (>2s)

### Usage

**1. Track API Route Performance**

```typescript
import { trackPerformance } from '@/lib/performance-monitor';

export async function GET(req: Request) {
  return trackPerformance('donations.list', async () => {
    const donations = await prisma.donation.findMany();
    return NextResponse.json(donations);
  });
}
```

**2. Track Database Query Performance**

```typescript
import { trackQuery } from '@/lib/performance-monitor';

const donations = await trackQuery('donations.findMany', () =>
  prisma.donation.findMany({ where: { churchId } })
);
```

**3. Track External API Calls**

```typescript
import { trackExternalCall } from '@/lib/performance-monitor';

const payment = await trackExternalCall('stripe.create_payment', () =>
  stripe.paymentIntents.create({ amount, currency })
);
```

**4. Manual Performance Timing**

```typescript
import { startTimer } from '@/lib/performance-monitor';

const timer = startTimer('complex_operation');

await step1();
timer.lap('step1_complete');

await step2();
timer.lap('step2_complete');

timer.end(); // Logs total duration + lap times
```

### Performance Thresholds

| Operation Type | Slow | Critical | Alert |
|----------------|------|----------|-------|
| API Response | 1s | 3s | Slack (critical) |
| Database Query | 500ms | 2s | Slack (critical) |
| External API | 2s | 5s | Log warning |

### Example Performance Log

```typescript
// Slow query warning
logger.warn('Significant performance degradation', {
  operation: 'performance.warn.donations.list',
  durationMs: 1500,
  thresholdMs: 500,
  slowdownFactor: '3.00'
});

// Critical slow query + Slack alert
logger.error('Critical performance degradation', {
  operation: 'performance.critical.db.donations.findMany',
  durationMs: 2500,
  thresholdMs: 500,
  slowdownFactor: '5.00'
});
// + Slack notification sent automatically
```

---

## Business Metrics

### What Gets Tracked

Track business-critical events for reporting and analytics:

| Metric Category | Events Tracked |
|-----------------|----------------|
| **Donations** | Completed, Refunded, Recurring Created/Canceled |
| **Email Campaigns** | Created, Sent, Opened, Clicked, Unsubscribed |
| **Members** | Created, Deleted, Activity |
| **Organizations** | Created, Subscription Upgraded/Downgraded, Quota Usage |
| **Expenses** | Created, Approved, Rejected |
| **AI Features** | Report Generated, Email Suggested, Receipt OCR |

### Usage

**1. Track Donation**

```typescript
import { metrics } from '@/lib/metrics';

// After successful donation
metrics.donation.completed({
  donationId,
  amount: 100,
  currency: 'USD',
  method: 'card',
  recurring: false,
  campaignId,
  churchId,
  donorId,
});
```

**2. Track Email Campaign**

```typescript
// After campaign sent
metrics.email.campaignSent({
  campaignId,
  campaignName: 'Weekly Newsletter',
  recipientCount: 150,
  successCount: 148,
  failureCount: 2,
  churchId,
});
```

**3. Track Member Activity**

```typescript
metrics.member.activity({
  memberId,
  action: 'viewed_reports',
  churchId,
  duration: 120, // seconds
});
```

**4. Track AI Usage**

```typescript
metrics.ai.reportGenerated({
  reportType: 'donation_summary',
  tokensUsed: 1500,
  costUsd: 0.003,
  churchId,
});
```

### Querying Metrics in Sentry

**1. Go to Sentry Discover**: https://sentry.io/organizations/your-org/discover/

**2. Query Examples**:

```sql
-- Total donations this month
SELECT SUM(amount) as total_donations
FROM logs
WHERE operation = 'metrics.donation.completed'
AND timestamp > '2025-11-01'

-- Email campaign success rate
SELECT
  campaignId,
  campaignName,
  SUM(successCount) / SUM(recipientCount) * 100 as success_rate
FROM logs
WHERE operation = 'metrics.email.campaign_sent'
GROUP BY campaignId, campaignName

-- Top churches by donation volume
SELECT
  churchId,
  COUNT(*) as donation_count,
  SUM(amount) as total_amount
FROM logs
WHERE operation = 'metrics.donation.completed'
GROUP BY churchId
ORDER BY total_amount DESC
LIMIT 10
```

---

## Setup Instructions

### 1. Sentry Setup (Required for Production)

**Already configured!** Sentry integration is automatic via `lib/logger/index.ts`.

**Verify setup:**

```bash
# Check environment variables
grep SENTRY .env.local

# Expected:
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=altarflow
```

**Create Cron Monitors in Sentry:**

1. Go to https://sentry.io/organizations/your-org/crons/
2. Monitors are auto-created on first cron job run
3. Or manually create:
   - Monitor slug: `check-expired-subscriptions`
   - Schedule: `0 2 * * *` (daily 2 AM UTC)
   - Max runtime: 5 minutes

   - Monitor slug: `cleanup-pending-donations`
   - Schedule: `0 3 * * 0` (weekly Sunday 3 AM UTC)
   - Max runtime: 10 minutes

### 2. Slack Setup (Optional but Recommended)

**Follow steps in [Slack Notifications](#slack-notifications) section above.**

**Required environment variable:**

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### 3. Verify Everything Works

**Test 1: Check Logger Integration**

```typescript
import { logger } from '@/lib/logger';

logger.info('Test info message', { operation: 'test.logger' });
logger.error('Test error message', { operation: 'test.logger' }, new Error('Test error'));
```

Check Sentry dashboard for the error.

**Test 2: Check Slack Notifications**

```typescript
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

await sendSlackNotification(SlackNotifications.paymentFailed({
  amount: 100,
  churchName: 'Test Church',
  error: 'Test error - please ignore',
}));
```

Check Slack channel for notification.

**Test 3: Check Performance Monitoring**

```typescript
import { trackPerformance } from '@/lib/performance-monitor';

await trackPerformance('test.operation', async () => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  return { success: true };
});
```

Should log warning for slow operation (>1s).

**Test 4: Check Business Metrics**

```typescript
import { metrics } from '@/lib/metrics';

metrics.donation.completed({
  donationId: 'test-123',
  amount: 100,
  currency: 'USD',
  method: 'card',
  recurring: false,
  churchId: 'church-123',
});
```

Check Sentry logs for `metrics.donation.completed` operation.

---

## Usage Examples

### Example 1: Add Monitoring to New API Route

```typescript
// app/api/donations/create/route.ts
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { trackPerformance, trackQuery, trackExternalCall } from '@/lib/performance-monitor';
import { metrics } from '@/lib/metrics';

export async function POST(req: Request) {
  return trackPerformance('donations.create', async () => {
    try {
      const body = await req.json();

      // Validate
      const validation = validateDonation(body);
      if (!validation.success) {
        logger.warn('Donation validation failed', {
          operation: 'donations.create.validation_failed',
          errors: validation.errors,
        });
        return NextResponse.json({ error: validation.errors }, { status: 400 });
      }

      // Create donation in database
      const donation = await trackQuery('donation.create', () =>
        prisma.donation.create({ data: body })
      );

      // Process payment with Stripe
      const payment = await trackExternalCall('stripe.payment_intent.create', () =>
        stripe.paymentIntents.create({
          amount: donation.amount,
          currency: 'usd',
        })
      );

      // Track success metric
      metrics.donation.completed({
        donationId: donation.id,
        amount: donation.amount,
        method: 'card',
        recurring: false,
        churchId: donation.churchId,
      });

      logger.info('Donation created successfully', {
        operation: 'donations.create.success',
        donationId: donation.id,
        amount: donation.amount,
      });

      return NextResponse.json(donation);
    } catch (error) {
      logger.error('Failed to create donation', {
        operation: 'donations.create.error',
      }, error instanceof Error ? error : new Error(String(error)));

      return NextResponse.json(
        { error: 'Failed to create donation' },
        { status: 500 }
      );
    }
  });
}
```

### Example 2: Monitor Background Job

```typescript
// scripts/process-recurring-donations.ts
import { logger } from '@/lib/logger';
import { trackPerformance, trackQuery } from '@/lib/performance-monitor';
import { metrics } from '@/lib/metrics';

async function processRecurringDonations() {
  return trackPerformance('recurring_donations.process', async () => {
    logger.info('Starting recurring donation processing', {
      operation: 'recurring_donations.start',
    });

    const subscriptions = await trackQuery('subscriptions.findDue', () =>
      prisma.donationSubscription.findMany({
        where: { nextChargeDate: { lte: new Date() } },
      })
    );

    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        const donation = await processSingleSubscription(subscription);
        successCount++;

        metrics.donation.completed({
          donationId: donation.id,
          amount: donation.amount,
          method: 'card',
          recurring: true,
          churchId: donation.churchId,
          donorId: donation.donorId,
        });
      } catch (error) {
        failureCount++;

        logger.error('Recurring donation failed', {
          operation: 'recurring_donations.charge_failed',
          subscriptionId: subscription.id,
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    logger.info('Recurring donation processing complete', {
      operation: 'recurring_donations.complete',
      total: subscriptions.length,
      successCount,
      failureCount,
    });

    return { total: subscriptions.length, successCount, failureCount };
  });
}
```

---

## Troubleshooting

### Sentry Not Receiving Errors

**Check 1: Environment Variables**

```bash
# Verify DSN is set
echo $NEXT_PUBLIC_SENTRY_DSN

# Should output: https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Check 2: Sentry Enabled in Production**

```typescript
// lib/logger/index.ts
if (this.isProduction || process.env.SENTRY_ENABLED === 'true') {
  this.logToSentry(level, message, sanitizedContext, error);
}
```

Make sure `NODE_ENV=production` or `SENTRY_ENABLED=true`.

**Check 3: Error Format**

```typescript
// ✅ Correct
logger.error('Operation failed', {
  operation: 'payment.process',
}, error);

// ❌ Wrong - error not passed as third argument
logger.error('Operation failed', {
  operation: 'payment.process',
  error: error.message, // Won't send to Sentry
});
```

### Slack Notifications Not Working

**Check 1: Webhook URL**

```bash
# Verify webhook URL is set
echo $SLACK_WEBHOOK_URL

# Should output: https://hooks.slack.com/services/...
```

**Check 2: Production Only**

Slack notifications only fire in production:

```typescript
if ((level === 'error' || level === 'fatal') && this.isProduction) {
  void this.notifySlack(level, message, sanitizedContext, error);
}
```

**Check 3: Operation Name**

Notifications are routed by operation name:

```typescript
// ✅ Will trigger payment failure notification
logger.error('Payment failed', {
  operation: 'payment.stripe.charge',
  amount: 100,
  churchName: 'First Baptist',
}, error);

// ❌ Won't trigger notification - operation doesn't include "payment" or "stripe"
logger.error('Charge failed', {
  operation: 'donations.create',
}, error);
```

### Cron Monitors Not Appearing in Sentry

**Check 1: Run Cron Job**

Monitors are auto-created on first run. Trigger manually:

```bash
curl -X GET https://your-app.vercel.app/api/cron/check-expired-subscriptions \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Check 2: Monitor Configuration**

```typescript
executeCronJob({
  monitorSlug: 'check-expired-subscriptions', // Must be kebab-case
  schedule: '0 2 * * *', // Valid cron expression
  maxRuntimeMinutes: 5,
}, async () => { ... });
```

**Check 3: Sentry Cron Monitors Feature**

Make sure your Sentry plan includes Cron Monitors (available on all plans).

### Performance Monitoring Not Alerting

**Check 1: Thresholds**

Make sure operation exceeds threshold:

```typescript
// Will alert - 2500ms > 500ms threshold
await trackQuery('slow-query', async () => {
  await new Promise(resolve => setTimeout(resolve, 2500));
});

// Won't alert - 400ms < 500ms threshold
await trackQuery('fast-query', async () => {
  await new Promise(resolve => setTimeout(resolve, 400));
});
```

**Check 2: Slack Webhook**

Slack alerts only fire for critical slow queries (>2s) and only if webhook configured.

---

## Future Enhancements

Created Linear issues for future improvements:

### 📊 ALT-115: Log Aggregation Service Integration
**Priority**: Medium
**Effort**: 1-2 days

Ship logs to Better Stack, Datadog, or CloudWatch for:
- 30+ day retention (vs. Vercel's 7 days)
- Full-text search
- Custom dashboards
- Advanced analytics

### 🤖 ALT-116: Automated Error Triaging with Linear
**Priority**: Medium
**Effort**: 3-5 days

Auto-create Linear issues from Sentry errors:
- Auto-assign based on operation tag
- Include stack trace and context
- Auto-close when error resolved

### 📈 ALT-117: Distributed Tracing
**Priority**: Low
**Effort**: 1-2 weeks

Track requests across services:
- See time spent in each operation
- Identify bottlenecks
- Debug multi-step flows

### 💾 ALT-118: AWS S3 Database Backups
**Priority**: High
**Effort**: 1-2 days

Automated daily backups to S3:
- GitHub Actions workflow
- 30-day retention
- Encrypted storage
- Monthly restore drills

---

## Summary

✅ **Sentry Cron Monitoring** - Track cron job health and failures
✅ **Slack Notifications** - Critical error alerts for payment/database failures
✅ **Performance Monitoring** - Track slow queries and API calls
✅ **Business Metrics** - Log donations, campaigns, members, AI usage
✅ **Linear Issues Created** - Future enhancements tracked in ALT-115 to ALT-118

**Next Steps**:
1. Set up Slack webhook (optional but recommended)
2. Review Sentry Cron Monitors after first run
3. Add performance monitoring to critical API routes
4. Add business metrics to key operations

**Questions?** See:
- `/lib/logger/README.md` - Logger usage
- `/docs/SENTRY_BUILD_WARNINGS_FIX.md` - Sentry configuration
- `/docs/completed/PINO_LOGGING_MIGRATION_COMPLETE.md` - Logging migration history
