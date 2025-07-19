# Billing Flow Test Checklist

## Prerequisites

### 1. Environment Variables
Ensure these are set in your `.env.local`:
```
# Stripe Payment Links (REQUIRED for testing)
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/test_xxxxx
NEXT_PUBLIC_STRIPE_ANNUAL_LINK=https://buy.stripe.com/test_xxxxx

# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Clerk Keys
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

### 2. Stripe Setup
1. Create test payment links in Stripe Dashboard:
   - Monthly plan ($99/month)
   - Annual plan ($830/year)
2. Configure metadata on payment links:
   - Add `organizationId` as a required field
3. Set up webhook endpoint in Stripe:
   - URL: `https://testaltarflow.ngrok.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 3. Database
Ensure the database has the latest schema with subscription fields:
```bash
npx prisma db push
npx prisma generate
```

## Test Scenarios

### Test 1: New Organization Creation Flow
1. **Sign out** completely from the application
2. **Sign up** as a new user
3. **Create a new organization** (church)
4. **Expected behavior:**
   - Organization is created with `subscriptionStatus: 'pending_payment'`
   - User is redirected to `/settings?tab=account`
   - Cannot access any dashboard features

### Test 2: Payment Required in Settings
1. **Navigate to** `/settings?tab=account` as unpaid organization
2. **Verify:**
   - Page displays both pricing options
   - Monthly plan shows $99/month
   - Annual plan shows $830/year with 30% savings
   - Links include organization ID in URL

### Test 3: Stripe Payment Flow
1. **Click** on a pricing plan (use Stripe test card: 4242 4242 4242 4242)
2. **Complete** the checkout process
3. **Expected behavior:**
   - After successful payment, redirected back to dashboard
   - Subscription status updated to 'active'
   - Can access all dashboard features

### Test 4: Webhook Processing
Using Stripe CLI:
```bash
# Forward webhooks to local environment
stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed --add checkout_session:metadata.organizationId=YOUR_ORG_ID
```

**Verify:**
- Webhook is received and processed
- Church record updated with:
  - `subscriptionStatus: 'active'`
  - `subscriptionId` populated
  - `stripeCustomerId` populated
  - `subscriptionPlan` set correctly

### Test 5: Account Management Access
1. **Navigate to** `/settings?tab=account` as paid organization
2. **Verify:**
   - Shows current subscription status
   - Displays active plan (monthly/annual)
   - Shows renewal date
   - "Manage Subscription" button visible
   - Team management section is visible

### Test 6: Subscription Cancellation
1. **Cancel subscription** in Stripe Dashboard
2. **Trigger webhook:**
   ```bash
   stripe trigger customer.subscription.deleted
   ```
3. **Verify:**
   - `subscriptionStatus` changes to 'canceled'
   - User loses access to dashboard features

### Test 7: Past Due Handling
1. **Update subscription** to past_due in Stripe
2. **Trigger webhook:**
   ```bash
   stripe trigger customer.subscription.updated
   ```
3. **Verify:**
   - Status shows as "Past Due" in billing page
   - User still has access but sees warning

## Debugging Commands

### Check Church Record
```sql
-- In Supabase SQL Editor
SELECT id, name, clerkOrgId, subscriptionStatus, subscriptionId, stripeCustomerId, subscriptionPlan
FROM "Church"
WHERE clerkOrgId = 'YOUR_ORG_ID';
```

### Monitor Webhook Logs
```bash
# In terminal 1
stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe

# In terminal 2
tail -f logs or check browser console
```

### Reset Test Organization
```sql
-- Reset to pending_payment state
UPDATE "Church"
SET subscriptionStatus = 'pending_payment',
    subscriptionId = NULL,
    stripeCustomerId = NULL,
    subscriptionPlan = NULL
WHERE clerkOrgId = 'YOUR_ORG_ID';
```

## Common Issues

1. **Webhook signature verification fails**
   - Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe Dashboard
   - Use the webhook secret for the correct endpoint (test vs live)

2. **Organization ID not passed to Stripe**
   - Check that payment links include `?prefilled_email={email}&client_reference_id={orgId}`
   - Verify the URL encoding is correct

3. **Subscription not updating**
   - Check webhook logs in Stripe Dashboard
   - Verify the webhook handler is processing the correct event types
   - Ensure database connection is working

## Success Criteria
- [ ] New organizations cannot access dashboard without payment
- [ ] Payment flow completes successfully
- [ ] Webhook updates subscription status correctly
- [ ] Billing page shows accurate subscription information
- [ ] Subscription changes (cancellation, past due) are reflected
- [ ] User experience is smooth with proper error handling