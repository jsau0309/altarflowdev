# AltarFlow Logger

Structured logging system with automatic PII redaction and Sentry integration.

## Quick Start

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User action completed', {
  operation: 'member.create',
  userId,
  churchId
});

logger.error('Operation failed', {
  operation: 'payment.process',
  paymentId
}, error);
```

## Domain-Specific Loggers

Use specialized loggers for common operations:

### Payment Logger

```typescript
import { paymentLogger } from '@/lib/logger/domains/payment';

paymentLogger.initiated({
  paymentIntentId: 'pi_123',
  amount: 5000,
  currency: 'usd',
  churchId: 'church_123'
});

paymentLogger.succeeded({ ... });
paymentLogger.failed({ ... }, error);
```

### Webhook Logger

```typescript
import { webhookLogger } from '@/lib/logger/domains/webhook';

webhookLogger.received({
  webhookType: 'stripe',
  eventType: 'payment_intent.succeeded',
  eventId: 'evt_123'
});

webhookLogger.verified({ ... });
webhookLogger.failed({ ... }, error);
```

### Database Logger

```typescript
import { databaseLogger } from '@/lib/logger/domains/database';

databaseLogger.queryComplete({
  model: 'donations',
  action: 'findMany',
  duration: 123,
  affectedRows: 50
});
```

### Authentication Logger

```typescript
import { authLogger } from '@/lib/logger/domains/auth';

authLogger.loginSuccess({
  userId: 'user_123',
  orgId: 'org_123',
  method: 'clerk'
});

authLogger.accessDenied({
  userId,
  resource: 'donations',
  action: 'delete'
});
```

## API Route Logging

Use middleware for automatic request logging:

```typescript
import { withLogging } from '@/lib/logger/middleware';

export const POST = withLogging(
  async (req, requestId) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  },
  {
    operation: 'api.donations.create'
  }
);
```

## Server Action Logging

```typescript
import { withActionLogging } from '@/lib/logger/middleware';

export const createMember = withActionLogging(
  'member.create',
  async (churchId, data) => {
    // Your action logic
    return { success: true };
  }
);
```

## Child Loggers (Context Inheritance)

```typescript
const requestLogger = logger.child({
  requestId,
  churchId,
  operation: 'api.donations'
});

// All logs from requestLogger will include the context
requestLogger.info('Processing donation');
requestLogger.error('Donation failed', {}, error);
```

## Automatic Span Tracking

```typescript
const result = await logger.withSpan(
  'payment.process',
  { paymentId },
  async () => {
    return await processPayment(paymentId);
  }
);
```

## Privacy Helpers

```typescript
import { hashChurchId, getEmailDomain, getPhoneLast4 } from '@/lib/logger/middleware';

// Hash sensitive IDs
logger.info('Church updated', {
  churchId: hashChurchId(churchId) // Only first 8 chars
});

// Log email domain only
logger.info('Email sent', {
  emailDomain: getEmailDomain(email) // 'example.com' not 'user@example.com'
});

// Log last 4 digits of phone
logger.info('SMS sent', {
  phoneLast4: getPhoneLast4(phone) // '***-***-1234'
});
```

## Log Levels

- `debug` - Verbose information for development
- `info` - General operational information
- `warn` - Potentially harmful situations
- `error` - Error events (with Error object)
- `fatal` - Severe errors leading to app abort

## Environment Variables

```bash
# .env
LOG_LEVEL=info                 # debug | info | warn | error | fatal
ENABLE_CONSOLE_LOGS=false      # Force console in production
SENTRY_ENABLED=true            # Enable Sentry integration
```

## Automatic Features

### PII Redaction

Sensitive fields are automatically redacted:
- `password`, `token`, `apiKey`, `secret`
- `ssn`, `creditCard`, `cvv`, `pin`
- `bankAccount`, `routingNumber`

### Sentry Integration

- Errors → `Sentry.captureException()`
- Warnings → `Sentry.addBreadcrumb()`
- Info/Debug → Breadcrumbs (sampled)

### JSON Serialization Safety

- Circular references detected and handled
- Functions, symbols converted to strings
- Error objects properly extracted

## Best Practices

### Always Include `operation` Field

```typescript
logger.info('Action completed', {
  operation: 'member.create', // ✅ Good - easy to filter in Sentry
  userId
});
```

### Pass Errors as Third Parameter

```typescript
logger.error('Payment failed', {
  operation: 'payment.process',
  paymentId
}, error); // ✅ Error object as third param
```

### Use Domain Loggers When Available

```typescript
// ✅ Good - semantic and type-safe
paymentLogger.succeeded({ paymentIntentId, amount, currency, churchId });

// ⚠️ Less ideal - generic
logger.info('Payment succeeded', { paymentIntentId, amount });
```

### Never Log Raw PII

```typescript
// ❌ Bad - logs full email
logger.info('Email sent', { email: 'user@example.com' });

// ✅ Good - logs domain only
logger.info('Email sent', { emailDomain: getEmailDomain(email) });

// ✅ Good - hashed ID
logger.info('Church updated', { churchId: hashChurchId(churchId) });
```

## Turborepo Compatibility

This logger is designed for easy extraction to `packages/logger`:

```
lib/logger/              # Current location
  index.ts              # Core (zero Next.js dependencies)
  domains/              # Domain-specific loggers
  middleware.ts         # Request correlation

# Future (during Turborepo migration):
packages/logger/src/    # Just move files here
  index.ts
  domains/
  middleware.ts
```

Update imports: `@/lib/logger` → `@altarflow/logger`

## Drizzle Compatibility

Database logger uses ORM-agnostic interface:

```typescript
// Works with Prisma
databaseLogger.queryComplete({
  model: 'donations',
  action: 'findMany'
});

// Will work with Drizzle (no changes needed)
databaseLogger.queryComplete({
  table: 'donations',  // Or use 'model' - both supported
  action: 'select'
});
```

## Migration from console.log

```typescript
// Before
console.log('[DEBUG] Processing payment:', paymentId);
console.error('Payment failed:', error);

// After
logger.debug('Processing payment', { operation: 'payment.process', paymentId });
logger.error('Payment failed', { operation: 'payment.process', paymentId }, error);

// Even better - use domain logger
paymentLogger.failed({ paymentId, amount, churchId }, error);
```

## Examples

See existing usage in:
- `lib/sentry.ts` - Compatibility wrappers
- `app/api/webhooks/stripe/route.ts` - Webhook logging patterns
- `app/sentry-example-page/page.tsx` - Test examples
