# Stripe Connect Integration Testing Guide

## Overview
This guide helps you test all the fixes and improvements made to the Stripe Connect integration.

## Prerequisites
- Stripe CLI installed (`brew install stripe/stripe-cli/stripe`)
- Test Stripe account with Connect enabled
- Local development environment running
- Ngrok or similar for webhook testing (optional)

## 1. Automated Tests

Run the automated test suite:
```bash
npx ts-node scripts/test-stripe-integration.ts
```

This tests:
- Database indexes existence and performance
- Input validation
- SQL injection prevention
- Rate limiting
- Webhook deduplication
- Error sanitization
- Sentry integration

## 2. Manual Testing - Critical Path

### Test A: Donor Creation with Correct Church Association

1. **Start your local server:**
   ```bash
   npm run dev
   ```

2. **Visit a church donation page:**
   ```
   http://localhost:3000/[church-slug]
   ```

3. **Test the donation flow:**
   - Click "Donate"
   - Enter amount and select donation type
   - Enter phone number for OTP
   - Verify OTP code
   - Fill personal information
   - Complete payment with test card: `4242 4242 4242 4242`

4. **Verify in database:**
   ```sql
   -- Check donor was created with churchId
   SELECT id, phone, "churchId", "createdAt" 
   FROM "Donor" 
   ORDER BY "createdAt" DESC 
   LIMIT 1;
   ```

### Test B: Stripe Customer on Connect Account

1. **Monitor Stripe Dashboard:**
   - Open your Stripe Dashboard
   - Go to Connect > [Your Test Church Account]
   - Navigate to Customers section

2. **Make a test donation**

3. **Verify:**
   - Customer appears in CHURCH's Connect account
   - Customer does NOT appear in your platform account
   - Payment shows correct transfer destination

### Test C: Webhook Processing

1. **Start webhook listener:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Make a test donation**

3. **Check logs for:**
   - No "unhandled event type" for important events
   - Webhook deduplication working (no duplicate processing)
   - Receipt email sent successfully
   - No EIN expansion errors

### Test D: Performance Testing

1. **Test OTP verification speed:**
   ```bash
   # Time the OTP verification
   curl -X POST http://localhost:3000/api/donors/otp/check \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+1234567890", "code": "1234", "churchId": "YOUR_CHURCH_ID"}' \
     -w "\nTime: %{time_total}s\n"
   ```
   
   Expected: < 0.05s (50ms)

2. **Test donation initiation speed:**
   - Use browser DevTools Network tab
   - Check `/api/donations/initiate` request
   - Should be < 200ms

## 3. Security Testing

### Test SQL Injection Prevention

1. **Try malicious input in donor search:**
   ```javascript
   // In browser console on donation page
   fetch('/api/donors/otp/check', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       phoneNumber: "'; DROP TABLE \"Donor\"; --",
       code: "1234",
       churchId: "test"
     })
   });
   ```
   
   Expected: Error response, no database damage

### Test Input Validation

1. **Invalid email format:**
   ```bash
   curl -X POST http://localhost:3000/api/donations/initiate \
     -H "Content-Type: application/json" \
     -d '{"donorEmail": "not-an-email", ...}'
   ```
   
   Expected: Validation error

2. **Invalid UUID:**
   ```bash
   curl -X POST http://localhost:3000/api/donors/otp/check \
     -H "Content-Type: application/json" \
     -d '{"churchId": "not-a-uuid", ...}'
   ```
   
   Expected: Validation error

### Test Rate Limiting

1. **Spam OTP requests:**
   ```bash
   # Run this 6 times quickly (limit is 5 per minute)
   for i in {1..6}; do
     curl -X POST http://localhost:3000/api/donors/otp/send \
       -H "Content-Type: application/json" \
       -d '{"phoneNumber": "+1234567890"}'
   done
   ```
   
   Expected: 6th request should be rate limited

## 4. Load Testing

### Simulate Multiple Donations

```javascript
// save as load-test.js
const axios = require('axios');

async function testDonationPerformance() {
  const startTime = Date.now();
  const promises = [];
  
  // Simulate 10 concurrent donation initiations
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.post('http://localhost:3000/api/donations/initiate', {
        idempotencyKey: `test-${Date.now()}-${i}`,
        churchId: 'YOUR_CHURCH_ID',
        donationTypeId: 'YOUR_DONATION_TYPE_ID',
        baseAmount: 1000, // $10
        donorEmail: `test${i}@example.com`
      })
    );
  }
  
  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  
  console.log(`10 donations processed in ${duration}ms`);
  console.log(`Average: ${duration/10}ms per donation`);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Success rate: ${successful}/10`);
}

testDonationPerformance();
```

Expected: All complete < 2 seconds total

## 5. Monitoring Production

### Check Index Usage
```sql
-- Run in Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as rows_read
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### Find Slow Queries
```sql
-- Requires pg_stat_statements extension
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%Donor%' 
   OR query LIKE '%DonationTransaction%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 6. Rollback Plan

If issues occur after deployment:

1. **Remove indexes (if causing issues):**
   ```sql
   DROP INDEX IF EXISTS "idx_donor_church_phone";
   DROP INDEX IF EXISTS "idx_stripe_connect_church";
   DROP INDEX IF EXISTS "idx_donation_transaction_stripe";
   DROP INDEX IF EXISTS "idx_donor_church_email";
   DROP INDEX IF EXISTS "idx_donation_transaction_idempotency";
   ```

2. **Revert code changes:**
   ```bash
   git revert HEAD~5..HEAD  # Revert last 5 commits
   ```

## Test Results Checklist

- [ ] Donors created with correct churchId
- [ ] Stripe customers on Connect account (not platform)
- [ ] OTP verification < 50ms
- [ ] Donation initiation < 200ms
- [ ] Webhook deduplication working
- [ ] No SQL injection vulnerabilities
- [ ] Input validation working
- [ ] Rate limiting active
- [ ] Error messages sanitized
- [ ] No EIN expansion errors
- [ ] Receipt emails sending

## Success Metrics

✅ **Performance:**
- Page loads < 500ms
- API responses < 200ms
- Database queries < 50ms

✅ **Security:**
- No SQL injection possible
- All inputs validated
- Rate limiting prevents abuse
- Errors don't leak sensitive data

✅ **Reliability:**
- No duplicate webhook processing
- Donors properly associated with churches
- Payments go to correct Connect accounts

## Support

If you encounter issues:
1. Check logs: `npm run dev` output
2. Check Stripe Dashboard for payment/webhook logs
3. Check Supabase logs for database errors
4. Run automated tests: `npx ts-node scripts/test-stripe-integration.ts`