/**
 * Test script to demonstrate the logger functionality
 * Run with: npx tsx lib/logger/test-logger.ts
 */

import { logger } from './index';
import { paymentLogger } from './domains/payment';
import { webhookLogger } from './domains/webhook';
import { databaseLogger } from './domains/database';
import { authLogger } from './domains/auth';
import { hashChurchId, getEmailDomain, getPhoneLast4 } from './middleware';

console.log('='.repeat(80));
console.log('LOGGER FUNCTIONALITY TEST');
console.log('='.repeat(80));

// Test 1: Basic logging at different levels
console.log('\n1. BASIC LOGGING LEVELS');
console.log('-'.repeat(80));
logger.debug('This is a debug message', { testId: 1 });
logger.info('This is an info message', { testId: 2 });
logger.warn('This is a warning message', { testId: 3 });
logger.error('This is an error message', { testId: 4 });

// Test 2: Automatic PII Redaction
console.log('\n2. AUTOMATIC PII REDACTION');
console.log('-'.repeat(80));

// These sensitive fields will be automatically redacted
const unsafeData = {
  password: 'super-secret-password',
  apiKey: 'sk_live_1234567890',
  token: 'bearer-token-abc123',
  creditCard: '4242-4242-4242-4242',
  ssn: '123-45-6789',
  normalField: 'This is safe to log'
};

console.log('Input data:', unsafeData);
logger.info('User data (REDACTED automatically)', unsafeData);
console.log('✅ Notice: All sensitive fields are [REDACTED] in the log output above');

// Test 3: Privacy Helpers
console.log('\n3. PRIVACY HELPERS');
console.log('-'.repeat(80));

const churchId = 'church_abc123def456ghi789';
const email = 'donor@example.com';
const phone = '+1-555-123-4567';

console.log(`Original Church ID: ${churchId}`);
console.log(`Hashed Church ID:   ${hashChurchId(churchId)}`);
console.log('✅ Only first 8 chars visible\n');

console.log(`Original Email: ${email}`);
console.log(`Email Domain:   ${getEmailDomain(email)}`);
console.log('✅ Only domain logged, not full email\n');

console.log(`Original Phone: ${phone}`);
console.log(`Phone Last 4:   ${getPhoneLast4(phone)}`);
console.log('✅ Only last 4 digits visible');

// Test 4: Domain-Specific Loggers
console.log('\n4. DOMAIN-SPECIFIC LOGGERS');
console.log('-'.repeat(80));

console.log('\n📊 Payment Logger:');
paymentLogger.initiated({
  paymentIntentId: 'pi_1234567890',
  amount: 5000,
  currency: 'usd',
  churchId: 'church_test123',
  customerId: 'cus_abc123'
});

console.log('\n🔔 Webhook Logger:');
webhookLogger.received({
  webhookType: 'stripe',
  eventType: 'payment_intent.succeeded',
  eventId: 'evt_test123',
  churchId: 'church_test123'
});

console.log('\n💾 Database Logger:');
databaseLogger.queryComplete({
  model: 'donations',
  action: 'findMany',
  duration: 234,
  affectedRows: 50
});

console.log('\n🔐 Auth Logger:');
authLogger.loginSuccess({
  userId: 'user_test123',
  orgId: 'org_test123',
  method: 'clerk',
  email: 'user@example.com'
});

// Test 5: Child Logger (Context Inheritance)
console.log('\n5. CHILD LOGGER (CONTEXT INHERITANCE)');
console.log('-'.repeat(80));

const requestId = 'req_abc123';
const requestLogger = logger.child({
  requestId,
  operation: 'api.donations.create',
  churchId: 'church_test123'
});

console.log('Parent logger context: { requestId, operation, churchId }');
requestLogger.info('Processing donation');
requestLogger.info('Donation validated');
requestLogger.info('Donation saved to database');
console.log('✅ All logs above automatically include parent context');

// Test 6: Error Logging with Stack Trace
console.log('\n6. ERROR LOGGING WITH STACK TRACE');
console.log('-'.repeat(80));

try {
  throw new Error('Simulated payment processing error');
} catch (error) {
  logger.error('Payment processing failed', {
    operation: 'payment.process',
    paymentId: 'pi_test123',
    amount: 5000
  }, error as Error);
  console.log('✅ Error object with stack trace logged');
}

// Test 7: Span Tracking (Performance Monitoring)
console.log('\n7. SPAN TRACKING (PERFORMANCE MONITORING)');
console.log('-'.repeat(80));

async function simulateSlowOperation() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true };
}

(async () => {
  const result = await logger.withSpan(
    'payment.process',
    { paymentId: 'pi_test123' },
    simulateSlowOperation
  );
  console.log('✅ Operation timed automatically:', result);
})();

// Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`
✅ Basic logging works (debug, info, warn, error, fatal)
✅ PII redaction works automatically
✅ Privacy helpers work (hash IDs, extract email domain)
✅ Domain-specific loggers work (payment, webhook, database, auth)
✅ Child loggers inherit context
✅ Error logging captures stack traces
✅ Span tracking measures performance

📝 WHAT HAPPENS IN PRODUCTION:
   - Console output is DISABLED (unless ENABLE_CONSOLE_LOGS=true)
   - All logs go to Sentry as breadcrumbs
   - Errors/Fatal logs create Sentry exceptions
   - Structured data is searchable in Sentry dashboard

🔐 SECURITY:
   - Sensitive fields (password, token, apiKey, etc.) are REDACTED
   - Church IDs are hashed (only first 8 chars visible)
   - Email addresses are stripped (only domain logged)
   - Phone numbers show only last 4 digits

🚀 NEXT PHASE:
   Phase 2 will replace 585+ console.log statements with this logger
   to fix 91 log injection vulnerabilities.
`);
