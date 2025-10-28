# New Pricing Model Setup Guide

## Overview

This document describes the new pricing model for AltarFlow and how to set it up properly.

### New Pricing Structure

1. **Setup Fee**: One-time payment collected externally (before Clerk invite)
2. **1 Month Free Trial**: Full platform access with countdown timer
3. **3 Months at 50% Off**: Promotional pricing after trial ($49.50/month for monthly plan)
4. **Regular Pricing**: Standard rates after promotional period ends

---

## Customer Onboarding Workflow

### Step 1: Setup Fee Payment (External)

**Action Required**: You collect the setup fee through your preferred method (e.g., PayPal, bank transfer, separate Stripe invoice)

**Recommended Setup Fee**: $99 - $299 (you decide)

### Step 2: Mark Setup Fee as Paid

After receiving payment, call the API to mark the setup fee as paid and start the trial:

```bash
POST /api/setup-fee
Authorization: Bearer <clerk-token>

{
  "setupFeeAmount": 9900  // Amount in cents (e.g., $99.00)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setup fee marked as paid, trial started",
  "trialEndsAt": "2025-11-27T00:00:00.000Z",
  "church": {
    "setupFeePaid": true,
    "freeTrialStartedAt": "2025-10-27T00:00:00.000Z",
    "trialEndsAt": "2025-11-27T00:00:00.000Z",
    "subscriptionStatus": "trial"
  }
}
```

This will:
- Mark `setupFeePaid = true`
- Set `freeTrialStartedAt` to now
- Set `trialEndsAt` to 30 days from now
- Change `subscriptionStatus` to `'trial'`

### Step 3: Send Clerk Organization Invite

After marking the setup fee as paid, send the Clerk organization invite to the customer's email.

### Step 4: Customer Onboards

Customer receives invite, joins the organization, and completes onboarding. They will have:
- **Full access to all features** during the 30-day trial
- **Trial countdown banner** showing days remaining
- **"Upgrade" button** with promotional messaging

### Step 5: Customer Upgrades (Anytime)

When the customer clicks "Upgrade" on the subscription page:
1. They're redirected to your Stripe Payment Link
2. The URL includes `&prefilled_promo_code=50OFF3MONTHS` (or your custom code)
3. Stripe automatically applies the 50% discount for 3 months
4. After 3 months, they're charged the full price

---

## Stripe Configuration

### 1. Create Promotional Coupon in Stripe Dashboard

**Navigate to**: Stripe Dashboard > Products > Coupons > Create Coupon

**Settings:**
- **Name**: `50OFF3MONTHS` (or your preferred name)
- **Coupon ID**: `50OFF3MONTHS` (must match `NEXT_PUBLIC_STRIPE_PROMO_CODE` env var)
- **Type**: Percentage discount
- **Percentage Off**: `50%`
- **Duration**: Repeating
- **Duration in months**: `3`
- **Redemption limits**: (Optional) Set limits if desired
- **Applies to**: Specific products → Select your Monthly and Annual subscription products

**Important**: The webhook handler detects this coupon by checking:
```typescript
coupon.duration === 'repeating' && coupon.duration_in_months === 3
```

### 2. Test the Coupon

Use Stripe's test mode to verify:

```bash
# Create a test subscription with the coupon
stripe subscriptions create \
  --customer=cus_test123 \
  --items[0][price]=price_monthly \
  --coupon=50OFF3MONTHS
```

Verify the discount appears and lasts for 3 billing cycles.

### 3. Update Payment Links (Optional)

If you want to make the coupon auto-apply, you can update your Payment Links:

**Stripe Dashboard** > **Payment Links** > **Edit your Monthly/Annual links**

Under "Promotions", add your coupon code. However, the code already handles this via URL parameter:
```
?prefilled_promo_code=50OFF3MONTHS
```

---

## Environment Variables

Add to your `.env.local` and production environment:

```bash
# Promotional coupon code (must match Stripe coupon ID)
NEXT_PUBLIC_STRIPE_PROMO_CODE=50OFF3MONTHS
```

---

## Database Schema Changes

The following fields were added to the `Church` model:

```prisma
model Church {
  // ... existing fields ...

  // New pricing model fields
  setupFeePaid         Boolean   @default(false)
  setupFeeAmount       Int?      // Amount in cents
  setupFeePaidAt       DateTime?
  freeTrialStartedAt   DateTime? // When free trial began
  promotionalEndsAt    DateTime? // When 50% discount ends (3 months after subscription)
  promotionalCouponId  String?   // Stripe coupon ID used
}
```

**Migration**: `prisma/migrations/20251027215110_add_new_pricing_model_fields/migration.sql`

---

## API Endpoints

### GET /api/setup-fee

Check if setup fee has been paid.

**Response:**
```json
{
  "setupFeePaid": true,
  "setupFeeAmount": 9900,
  "setupFeePaidAt": "2025-10-27T00:00:00.000Z",
  "freeTrialStartedAt": "2025-10-27T00:00:00.000Z",
  "trialEndsAt": "2025-11-27T00:00:00.000Z"
}
```

### POST /api/setup-fee

Mark setup fee as paid and start trial.

**Request Body:**
```json
{
  "setupFeeAmount": 9900
}
```

### GET /api/subscription

Returns subscription info including trial and promotional data.

**Response:**
```json
{
  "name": "Church Name",
  "subscriptionStatus": "trial",
  "subscriptionPlan": null,
  "trialDaysRemaining": 25,
  "hasPromotionalPricing": false,
  "setupFeePaid": true,
  "freeTrialStartedAt": "2025-10-27T00:00:00.000Z"
}
```

After upgrade with coupon:
```json
{
  "name": "Church Name",
  "subscriptionStatus": "active",
  "subscriptionPlan": "monthly",
  "trialDaysRemaining": null,
  "hasPromotionalPricing": true,
  "promotionalEndsAt": "2026-01-27T00:00:00.000Z",
  "promotionalCouponId": "50OFF3MONTHS"
}
```

---

## User Experience

### Trial Period (Days 1-30)

**Banner Displayed:**
> **Free Trial Active**
>
> You have 25 days remaining in your free trial. Upgrade now to get 3 months at 50% off!

**Features:**
- Full access to all premium features
- Trial countdown visible on subscription page
- "Upgrade" button shows promotional messaging

### Promotional Period (Months 1-3 after upgrade)

**Banner Displayed:**
> **Promotional Pricing Active**
>
> You're currently enjoying 50% off your subscription. This promotional rate will continue for 3 months.

**Billing:**
- Monthly plan: $49.50/month (instead of $99)
- Annual plan: $415/year (instead of $830)

### After Promotional Period (Month 4+)

**Billing:**
- Monthly plan: $99/month
- Annual plan: $830/year

---

## Subscription Status Flow

```
┌─────────────────┐
│  Setup Fee Paid │  → API call to /api/setup-fee
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  trial (30d)    │  → Full access, countdown timer
└────────┬────────┘
         │
         ├──► Trial expires without payment → free (limited access)
         │
         └──► Customer upgrades
              │
              ▼
         ┌─────────────────┐
         │  active (w/promo)│  → 50% off for 3 months
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  active (regular)│  → Full price
         └─────────────────┘
```

---

## Testing Checklist

### 1. Setup Fee Flow
- [ ] Call POST /api/setup-fee with amount
- [ ] Verify `setupFeePaid = true` in database
- [ ] Verify `freeTrialStartedAt` is set
- [ ] Verify `trialEndsAt` is 30 days from now
- [ ] Verify `subscriptionStatus = 'trial'`

### 2. Trial Period Display
- [ ] Trial countdown banner appears
- [ ] Correct number of days displayed
- [ ] "Upgrade" button is visible
- [ ] Full features are accessible

### 3. Upgrade Flow
- [ ] Click "Upgrade" button
- [ ] Verify redirect to Stripe Payment Link with `prefilled_promo_code` parameter
- [ ] Complete test payment in Stripe
- [ ] Verify webhook processes correctly

### 4. Promotional Period
- [ ] After upgrade, verify `promotionalCouponId` is saved
- [ ] Verify `promotionalEndsAt` is 3 months in future
- [ ] Promotional banner displays correctly
- [ ] Billing shows discounted amount

### 5. Regular Pricing
- [ ] After 3 months, verify promotional banner disappears
- [ ] Verify billing returns to full price

---

## Troubleshooting

### Webhook not detecting coupon

**Check:**
1. Coupon ID matches environment variable
2. Coupon duration is "repeating" with 3 months
3. Webhook logs show coupon detection: `[Stripe Webhook] Subscription has coupon applied: 50OFF3MONTHS`

### Trial countdown not showing

**Check:**
1. `setupFeePaid = true` in database
2. `freeTrialStartedAt` is set
3. `subscriptionStatus = 'trial'`
4. Component receives `trialDaysRemaining` prop

### Coupon not auto-applying

**Check:**
1. Payment Link URL includes `&prefilled_promo_code=50OFF3MONTHS`
2. Environment variable `NEXT_PUBLIC_STRIPE_PROMO_CODE` is set correctly
3. Coupon is active in Stripe Dashboard

---

## Migration from Old Pricing

### Existing Free Users
- No change - remain on free tier
- Must pay setup fee to access trial

### Existing Paid Users
- Keep current subscription without setup fee
- Grandfather them in at current pricing
- No promotional coupon applied

**How to grandfather existing users:**
```sql
-- Mark existing paid users as having paid setup fee (skip it)
UPDATE "Church"
SET "setupFeePaid" = true,
    "setupFeePaidAt" = NOW()
WHERE "subscriptionStatus" IN ('active', 'past_due', 'canceled')
  AND "setupFeePaid" = false;
```

---

## Support & Maintenance

### Monitoring Promotional Periods

Query to find churches with active promotions:

```sql
SELECT
  name,
  "subscriptionStatus",
  "promotionalCouponId",
  "promotionalEndsAt",
  NOW() < "promotionalEndsAt" AS "is_promotional_active"
FROM "Church"
WHERE "promotionalEndsAt" IS NOT NULL
ORDER BY "promotionalEndsAt" ASC;
```

### Expired Trials

Query to find expired trials that haven't upgraded:

```sql
SELECT
  name,
  email,
  "freeTrialStartedAt",
  "trialEndsAt",
  "subscriptionStatus"
FROM "Church"
WHERE "setupFeePaid" = true
  AND "trialEndsAt" < NOW()
  AND "subscriptionStatus" != 'active'
ORDER BY "trialEndsAt" DESC;
```

Use this for follow-up emails or support outreach.

---

## Questions?

If you encounter issues or need clarification, refer to:
- Stripe coupon documentation: https://stripe.com/docs/billing/subscriptions/coupons
- Stripe webhook guide: https://stripe.com/docs/webhooks
- AltarFlow webhook handler: `/app/api/webhooks/stripe/route.ts`
