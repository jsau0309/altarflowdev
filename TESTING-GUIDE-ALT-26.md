# Testing Guide: ALT-26 - Cleanup Pending Donations

## Testing Plan

### Phase 1: Create Test Data (Incomplete Donations)

#### Step 1: Start Stripe CLI (Webhook Forwarding)
```bash
# Terminal 1: Forward Stripe webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# You'll see: "Ready! Your webhook signing secret is whsec_xxx"
# Copy this secret for later if needed
```

#### Step 2: Start Dev Server
```bash
# Terminal 2: Start Next.js dev server
npm run dev

# Server will run at http://localhost:3000
```

#### Step 3: Create Incomplete Donations

**Option A: Using the Donation Page**
1. Go to your local donation page: `http://localhost:3000/donate/[your-church-slug]`
2. Enter donation details ($10, $20, $50, etc.)
3. Click "Donate"
4. When Stripe checkout opens, **close the tab/browser** before completing payment
5. Repeat 2-3 times to create multiple incomplete donations

**Option B: Using Stripe Test Cards**
1. Go to donation page
2. Start entering card details but **don't submit**
3. Close the page/tab
4. This creates a PaymentIntent that remains `incomplete`

#### Step 4: Verify in Stripe Dashboard
```bash
# Open Stripe Dashboard
stripe dashboard

# Or go to: https://dashboard.stripe.com/test/payments
# Look for payments with status "Incomplete"
```

### Phase 2: Verify Database State

#### Check Pending Transactions
```bash
# Option 1: Using Prisma Studio (Visual)
npx prisma studio

# Navigate to DonationTransaction table
# Filter: status = "pending"
# Look for transactions with stripePaymentIntentId
```

**Option 2: Using SQL**
```sql
-- Connect to your database and run:
SELECT
  id,
  amount,
  status,
  "stripePaymentIntentId",
  "transactionDate",
  "createdAt"
FROM "DonationTransaction"
WHERE status = 'pending'
  AND "stripePaymentIntentId" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Result:**
```
status: "pending"
stripePaymentIntentId: "pi_xxxxx"
transactionDate: (current date)
```

### Phase 3: Manipulate Test Data (Make It Old)

To test the cron job, we need to make these transactions appear 7+ days old:

```sql
-- Update test transactions to be 8 days old
UPDATE "DonationTransaction"
SET "transactionDate" = NOW() - INTERVAL '8 days'
WHERE status = 'pending'
  AND "stripePaymentIntentId" IS NOT NULL
  AND "transactionDate" > NOW() - INTERVAL '1 hour'; -- Only recent ones (your test data)

-- Verify the update
SELECT
  id,
  amount,
  status,
  "stripePaymentIntentId",
  "transactionDate",
  NOW() - "transactionDate" as age
FROM "DonationTransaction"
WHERE status = 'pending'
  AND "stripePaymentIntentId" IS NOT NULL
ORDER BY "transactionDate" DESC
LIMIT 5;
```

**Expected Result:**
```
transactionDate: 2025-10-06 (8 days ago)
age: 8 days
```

### Phase 4: Test the Cron Job

#### Method 1: Direct HTTP Request (Recommended)

**Without CRON_SECRET (Development):**
```bash
# Simple GET request
curl http://localhost:3000/api/cron/cleanup-pending-donations
```

**With CRON_SECRET (Production-like):**
```bash
# First, set CRON_SECRET in your .env.local if not already set
# CRON_SECRET=your-secret-key-here

# Then run with authorization header
curl http://localhost:3000/api/cron/cleanup-pending-donations \
  -H "Authorization: Bearer your-secret-key-here"
```

**Expected Response:**
```json
{
  "success": true,
  "checked": 3,
  "updated": 3,
  "canceled": 3,
  "errors": []
}
```

#### Method 2: Using Browser
```
1. Open browser
2. Navigate to: http://localhost:3000/api/cron/cleanup-pending-donations
3. Check the response JSON
```

#### Method 3: Using Postman/Thunder Client
```
GET http://localhost:3000/api/cron/cleanup-pending-donations
Headers:
  Authorization: Bearer your-secret-key-here (if using CRON_SECRET)
```

### Phase 5: Verify Results

#### Check Console Logs (Terminal)

You should see output like:
```
[Cleanup Pending Donations] Starting cleanup for transactions created before 2025-10-06T...
[Cleanup Pending Donations] Updated transaction clxxx to canceled (PaymentIntent pi_xxx).
[Cleanup Pending Donations] Updated transaction clyyy to canceled (PaymentIntent pi_yyy).
[Cleanup Pending Donations] Completed cleanup. Checked 3 transactions, updated 3, canceled 3. Errors: 0
```

#### Check Database (Prisma Studio or SQL)

**Option 1: Prisma Studio**
```bash
npx prisma studio
```
- Go to DonationTransaction table
- Filter: `stripePaymentIntentId` = one of your test PaymentIntent IDs
- Verify: `status` changed from "pending" to "canceled"
- Verify: `processedAt` is now set

**Option 2: SQL Query**
```sql
SELECT
  id,
  amount,
  status,
  "stripePaymentIntentId",
  "transactionDate",
  "processedAt",
  "createdAt",
  "updatedAt"
FROM "DonationTransaction"
WHERE "stripePaymentIntentId" IN (
  'pi_xxx',  -- Replace with your test PaymentIntent IDs
  'pi_yyy',
  'pi_zzz'
)
ORDER BY "updatedAt" DESC;
```

**Expected Result:**
```
status: "canceled" (changed from "pending" ✅)
processedAt: 2025-10-14 15:30:00 (now set ✅)
updatedAt: 2025-10-14 15:30:00 (just updated ✅)
```

#### Check Stripe Dashboard

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/payments
2. Find your test PaymentIntents
3. Verify they still show as "Incomplete" in Stripe
4. This confirms we're reading from Stripe correctly

### Phase 6: Test Edge Cases

#### Test Case 1: Already Canceled Transaction
```sql
-- Manually set one transaction to "canceled"
UPDATE "DonationTransaction"
SET status = 'canceled'
WHERE "stripePaymentIntentId" = 'pi_xxx';

-- Run cron job again
curl http://localhost:3000/api/cron/cleanup-pending-donations

-- Expected: Transaction should be skipped (already canceled)
-- Check logs for: "Skipping transaction xyz. Status already matches."
```

#### Test Case 2: Succeeded Payment (Webhook Missed)
```sql
-- Find a transaction with succeeded PaymentIntent
SELECT * FROM "DonationTransaction"
WHERE status = 'pending'
  AND "stripePaymentIntentId" = 'pi_successful_payment';

-- Make it 8 days old
UPDATE "DonationTransaction"
SET "transactionDate" = NOW() - INTERVAL '8 days'
WHERE "stripePaymentIntentId" = 'pi_successful_payment';

-- Run cron job
curl http://localhost:3000/api/cron/cleanup-pending-donations

-- Expected: Status should change to "succeeded" (not "canceled")
```

#### Test Case 3: Missing PaymentIntent
```sql
-- Update transaction with fake PaymentIntent ID
UPDATE "DonationTransaction"
SET "stripePaymentIntentId" = 'pi_fake_not_exists_123'
WHERE id = 'clxxx';

-- Run cron job
curl http://localhost:3000/api/cron/cleanup-pending-donations

-- Expected: Should mark as "canceled" with warning log
-- Check logs for: "PaymentIntent pi_fake_not_exists_123 not found"
```

### Phase 7: Test Frontend Display

#### View in Dashboard
1. Login to your local app
2. Go to donations page: `http://localhost:3000/dashboard/donations`
3. Find the canceled donations
4. Verify they show:
   - Status badge: "Canceled" with outline variant
   - Correct amount
   - Correct date

#### Open Donation Details
1. Click on a canceled donation
2. Verify the drawer shows:
   - Status: "Canceled"
   - No edit button (only manual donations are editable)
   - ProcessedAt timestamp

## Complete Test Checklist

```
Phase 1: Create Test Data
  ☐ Start Stripe CLI webhook forwarding
  ☐ Start dev server
  ☐ Create 3+ incomplete donations
  ☐ Verify in Stripe Dashboard (status: incomplete)

Phase 2: Verify Database
  ☐ Check database shows status: "pending"
  ☐ Verify stripePaymentIntentId is populated
  ☐ Note down PaymentIntent IDs for later

Phase 3: Make Data Old
  ☐ Run SQL to update transactionDate to 8 days ago
  ☐ Verify age is 8+ days

Phase 4: Test Cron Job
  ☐ Run cron endpoint via curl/browser
  ☐ Check response JSON (success: true)
  ☐ Verify counts match expectations

Phase 5: Verify Results
  ☐ Check console logs for success messages
  ☐ Verify database: status changed to "canceled"
  ☐ Verify processedAt is now set
  ☐ Confirm Stripe Dashboard still shows "incomplete"

Phase 6: Edge Cases
  ☐ Test already canceled transaction
  ☐ Test succeeded payment (if available)
  ☐ Test missing PaymentIntent

Phase 7: Frontend
  ☐ View canceled donations in dashboard
  ☐ Open donation details drawer
  ☐ Verify status badge displays correctly
```

## Troubleshooting

### Issue: Cron job returns empty results
**Solution:**
```sql
-- Check if any transactions meet the criteria
SELECT COUNT(*) FROM "DonationTransaction"
WHERE status = 'pending'
  AND "transactionDate" < NOW() - INTERVAL '7 days'
  AND "stripePaymentIntentId" IS NOT NULL;

-- If count is 0, your test data isn't old enough
-- Run the UPDATE query from Phase 3 again
```

### Issue: "Unauthorized" error
**Solution:**
```bash
# Check if CRON_SECRET is set
echo $CRON_SECRET

# Or temporarily disable by removing CRON_SECRET from .env.local
# Then restart dev server
```

### Issue: Stripe API errors
**Solution:**
```bash
# Verify Stripe CLI is running
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check your Stripe API keys in .env.local
# STRIPE_SECRET_KEY=sk_test_xxx
```

### Issue: Database not updating
**Solution:**
```sql
-- Check if Prisma can connect
npx prisma studio

-- Verify transaction exists
SELECT * FROM "DonationTransaction" WHERE id = 'clxxx';

-- Check console logs for database errors
```

## Success Criteria

✅ All tests pass if:
1. Incomplete donations are created successfully
2. Database shows "pending" status initially
3. Cron job runs without errors
4. Database updates to "canceled" status
5. ProcessedAt timestamp is set
6. Frontend displays "Canceled" badge
7. Console logs show detailed processing info
8. No legitimate payments are accidentally canceled

## Next Steps After Testing

1. If all tests pass → Commit changes
2. Update Linear issue ALT-26 with test results
3. Deploy to staging/production
4. Monitor first production cron run
5. Set up alerts for cron job failures
