# 🚀 Post-Deployment Checklist
## New Pricing Model with Auto-Trial

**Deployment Date**: 2025-10-27
**PR**: #18
**Feature**: Automatic 30-day free trial for all new churches

---

## ✅ **IMMEDIATE ACTIONS** (Within 15 minutes)

### 1. Verify Vercel Deployment
- [ ] Go to [Vercel Dashboard](https://vercel.com/audev/altarflowdev)
- [ ] Confirm deployment succeeded (green checkmark)
- [ ] Check build logs for any errors
- [ ] Verify deployment URL is live

### 2. Verify Database Migration
**Run in Supabase SQL Editor (Production):**

```sql
-- Check that new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Church'
  AND column_name IN (
    'setupFeePaid',
    'setupFeeAmount',
    'setupFeePaidAt',
    'freeTrialStartedAt',
    'trialEndsAt',
    'promotionalEndsAt',
    'promotionalCouponId'
  )
ORDER BY column_name;
```

**Expected Result**: All 7 columns should exist.

- [ ] All columns present in production database
- [ ] No migration errors in Vercel logs

### 3. Set Environment Variable in Vercel
- [ ] Go to Vercel → altarflowdev → Settings → Environment Variables
- [ ] Add new variable:
  - **Key**: `NEXT_PUBLIC_STRIPE_PROMO_CODE`
  - **Value**: `50OFF3MONTHS`
  - **Environments**: Production, Preview, Development (all three)
- [ ] Click "Save"
- [ ] **IMPORTANT**: Redeploy after adding env var (Vercel → Deployments → ⋮ → Redeploy)

### 4. Create Stripe Promotional Coupon
- [ ] Log into [Stripe Dashboard](https://dashboard.stripe.com) (Production mode)
- [ ] Navigate to: **Products** → **Coupons** → **Create coupon**
- [ ] Configure:
  - **Name**: `50% Off for 3 Months`
  - **Coupon ID**: `50OFF3MONTHS` (must be exact)
  - **Type**: Percentage discount
  - **Percentage off**: `50`
  - **Duration**: `Repeating`
  - **Duration in months**: `3`
  - **Applies to**: Select your **Monthly** and **Annual** subscription products
- [ ] Click "Create coupon"
- [ ] Verify coupon appears in Coupons list

---

## ✅ **WITHIN 1 HOUR** (Testing & Verification)

### 5. Test New Organization Creation
**Create a test organization to verify auto-trial:**

1. [ ] Go to your production app
2. [ ] Create a new organization (or use test Clerk account)
3. [ ] **Expected Behaviors**:
   - Organization creates successfully
   - Dashboard loads without errors
   - **Green trial banner appears** at top of Dashboard
   - Banner shows "🎉 Free Trial Active"
   - Banner displays "You have 30 days remaining..."
   - "Upgrade Now" button is visible

### 6. Verify Trial Status in Settings
1. [ ] Navigate to **Settings** → **Account Management** tab
2. [ ] **Expected Behaviors**:
   - Subscription status badge shows **"Free Trial"**
   - Trial countdown banner visible (blue banner)
   - "Upgrade Now" button present
   - No errors in console

### 7. Verify Premium Features Accessible
During trial, test that all premium features work:

- [ ] **Donations**: Can create donations
- [ ] **Expenses**: Can add expenses
- [ ] **Reports**: Can generate reports
- [ ] **Members**: Can add members
- [ ] **Email Campaigns**: Can access email features
- [ ] No "upgrade required" blocks appear

### 8. Test Upgrade Flow (Optional - Use Test Mode)
**⚠️ Only if you have Stripe test mode configured:**

1. [ ] Click "Upgrade Now" button
2. [ ] Verify redirect to Stripe Payment Link
3. [ ] Check URL contains `?prefilled_promo_code=50OFF3MONTHS`
4. [ ] Verify Stripe checkout shows "50% off for 3 months" discount
5. [ ] **(Don't complete payment in production)**

### 9. Check Database for New Church
**Run in Supabase SQL Editor (Production):**

```sql
-- Find the test church you just created
SELECT
  id,
  name,
  "subscriptionStatus",
  "setupFeePaid",
  "freeTrialStartedAt",
  "trialEndsAt",
  EXTRACT(DAY FROM ("trialEndsAt" - NOW())) as days_remaining
FROM "Church"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Expected Results**:
- [ ] `subscriptionStatus` = `'trial'`
- [ ] `setupFeePaid` = `true`
- [ ] `freeTrialStartedAt` is set (today's date)
- [ ] `trialEndsAt` is set (30 days from now)
- [ ] `days_remaining` ≈ 30

---

## ✅ **WITHIN 24 HOURS** (Monitoring & Grandfather)

### 10. Monitor Clerk Webhook Logs
**Check webhook success rate:**

1. [ ] Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. [ ] Check recent webhook deliveries
3. [ ] Look for `organization.created` events
4. [ ] Verify all show **200 OK** status
5. [ ] Check for any failed webhooks (500 errors)

**Expected**: 100% success rate for `organization.created` webhooks.

### 11. Grandfather Existing Paid Customers (If Any)

**⚠️ IMPORTANT**: Only run this if you have existing paid churches that should skip the trial requirement.

**Run in Supabase SQL Editor (Production):**

```sql
-- First, CHECK what will be updated (dry run)
SELECT
  id,
  name,
  "subscriptionStatus",
  "setupFeePaid",
  "createdAt"
FROM "Church"
WHERE "subscriptionStatus" IN ('active', 'past_due', 'canceled')
  AND "setupFeePaid" = false;
```

**Review the results**. If these are legitimate paid customers:

```sql
-- Mark existing paid churches as having "paid" setup fee
-- This exempts them from the trial requirement
UPDATE "Church"
SET
  "setupFeePaid" = true,
  "setupFeePaidAt" = NOW()
WHERE "subscriptionStatus" IN ('active', 'past_due', 'canceled')
  AND "setupFeePaid" = false;
```

- [ ] Reviewed churches to be updated
- [ ] Ran UPDATE query if needed
- [ ] Verified update count matches expected

### 12. Monitor Error Logs
**Check for any runtime errors:**

1. [ ] Vercel → altarflowdev → Logs → Runtime Logs
2. [ ] Filter for errors in last 24 hours
3. [ ] Look for:
   - Webhook processing errors
   - Subscription calculation errors
   - Database query failures
4. [ ] Investigate and fix any critical errors

- [ ] No critical errors in logs
- [ ] Any warnings investigated

---

## ✅ **WITHIN 1 WEEK** (Long-term Monitoring)

### 13. Monitor Trial Conversions
**Track how many trial users are converting:**

```sql
-- Churches currently in trial
SELECT
  COUNT(*) as total_trial_churches,
  AVG(EXTRACT(DAY FROM ("trialEndsAt" - NOW()))) as avg_days_remaining
FROM "Church"
WHERE "subscriptionStatus" = 'trial'
  AND "trialEndsAt" > NOW();
```

```sql
-- Trial users who converted to paid
SELECT
  COUNT(*) as converted_count
FROM "Church"
WHERE "subscriptionStatus" = 'active'
  AND "freeTrialStartedAt" IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

- [ ] Trial conversion rate is acceptable
- [ ] No unexpected drop-offs

### 14. Monitor Expired Trials
**Check users whose trial has expired:**

```sql
-- Expired trials that didn't convert
SELECT
  id,
  name,
  email,
  "freeTrialStartedAt",
  "trialEndsAt",
  "subscriptionStatus",
  EXTRACT(DAY FROM (NOW() - "trialEndsAt")) as days_since_expiry
FROM "Church"
WHERE "trialEndsAt" < NOW()
  AND "subscriptionStatus" IN ('free', 'pending_payment')
  AND "freeTrialStartedAt" IS NOT NULL
ORDER BY "trialEndsAt" DESC
LIMIT 20;
```

**Action**: Consider follow-up emails to encourage conversion.

- [ ] Reviewed expired trials
- [ ] Considered re-engagement strategy

### 15. Verify Promotional Pricing Works
**After first paying customer:**

```sql
-- Check promotional coupon tracking
SELECT
  id,
  name,
  "subscriptionStatus",
  "promotionalCouponId",
  "promotionalEndsAt",
  EXTRACT(DAY FROM ("promotionalEndsAt" - NOW())) as promo_days_remaining
FROM "Church"
WHERE "promotionalCouponId" IS NOT NULL;
```

**Expected**: Churches with promotional pricing should have:
- [ ] `promotionalCouponId` = `'50OFF3MONTHS'`
- [ ] `promotionalEndsAt` set to ~3 months in future
- [ ] Promotional banner visible in their dashboard

---

## 🚨 **ROLLBACK PLAN** (If Critical Issues)

If you encounter critical production issues:

### Quick Rollback Steps:

1. **Revert Deployment in Vercel**:
   - Go to Vercel → altarflowdev → Deployments
   - Find the previous stable deployment
   - Click ⋮ → Promote to Production

2. **Database Rollback** (if needed):
   ```sql
   -- Emergency: Revert all trial churches to free
   UPDATE "Church"
   SET "subscriptionStatus" = 'free'
   WHERE "subscriptionStatus" = 'trial';
   ```

3. **Remove Environment Variable**:
   - Vercel → Settings → Environment Variables
   - Delete `NEXT_PUBLIC_STRIPE_PROMO_CODE`

---

## 📊 **Success Metrics**

After 1 week, you should see:

- ✅ 100% of new churches start with trial status
- ✅ Trial banners display correctly for all trial users
- ✅ No increase in webhook failure rate
- ✅ No increase in error rate
- ✅ Trial users can access all premium features
- ✅ At least 1 trial conversion to paid (if any trials have expired)

---

## 📞 **Support Resources**

- **Clerk Webhook Issues**: https://clerk.com/docs/integrations/webhooks
- **Stripe Coupons Docs**: https://stripe.com/docs/billing/subscriptions/coupons
- **Prisma Migration Issues**: https://www.prisma.io/docs/guides/migrate
- **Setup Guide**: `/docs/NEW_PRICING_MODEL_SETUP.md`

---

## ✅ **Sign-Off**

Once all checklist items are complete:

- [ ] All immediate actions completed
- [ ] All 1-hour tasks verified
- [ ] 24-hour monitoring started
- [ ] No critical issues detected
- [ ] Feature is working as expected

**Deployment Status**: 🟢 SUCCESSFUL

**Signed off by**: _____________________
**Date**: _____________________

---

🎉 **Congratulations!** Your new pricing model with auto-trial is now live in production!
