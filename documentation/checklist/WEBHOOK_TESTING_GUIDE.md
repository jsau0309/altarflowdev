# Webhook Testing Guide for AltarFlow

## Development Environment Setup

### 1. Using Stripe CLI (Recommended for Development)

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# or download from https://stripe.com/docs/stripe-cli
```

Login to Stripe:
```bash
stripe login
```

Forward webhooks to your local environment:
```bash
# For local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# For ngrok
stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe
```

### 2. Testing Specific Events

#### Test Subscription Creation:
```bash
# Create a test checkout session completion
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.organizationId=YOUR_ORG_ID \
  --add checkout_session:customer=cus_test123 \
  --add checkout_session:subscription=sub_test123
```

#### Test Subscription Update:
```bash
# Test subscription status change
stripe trigger customer.subscription.updated \
  --add subscription:id=sub_test123 \
  --add subscription:status=active
```

#### Test Account Update (for Stripe Connect):
```bash
stripe trigger account.updated \
  --add account:id=acct_1RT72i4esY43ZMyQ
```

### 3. Manual Testing Flow

1. **Create Payment Links in Stripe Dashboard:**
   - Go to [Stripe Dashboard > Payment Links](https://dashboard.stripe.com/test/payment-links)
   - Create Monthly link ($99)
   - Create Annual link ($830)
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/test_xxxxx
     NEXT_PUBLIC_STRIPE_ANNUAL_LINK=https://buy.stripe.com/test_xxxxx
     ```

2. **Configure Payment Links:**
   - Enable "Don't show confirmation page"
   - Set redirect URL to: `{YOUR_DOMAIN}/payment-success`
   - Enable "Collect customer details"
   - Add metadata field for client_reference_id

3. **Test the Flow:**
   - Create new organization
   - Get redirected to settings?tab=account
   - Click "Subscribe" on a plan
   - Complete payment with test card: 4242 4242 4242 4242
   - Verify webhook processes the payment
   - Check database for updated subscription status

## Production Setup

### 1. Configure Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `account.updated` (if using Connect)

4. Copy the signing secret to your environment:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 2. Configure Customer Portal

1. Go to [Stripe Dashboard > Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Configure:
   - Business information
   - Features (enable subscription cancellation, plan switching)
   - Products (add your monthly and annual plans)
   - Set default redirect URL: `https://yourdomain.com/settings?tab=account`

### 3. Environment Variables for Production

```env
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Payment Links
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/xxxxx
NEXT_PUBLIC_STRIPE_ANNUAL_LINK=https://buy.stripe.com/xxxxx

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Debugging Tips

### Check Webhook Logs
```bash
# View recent webhook attempts
stripe events list --limit 10

# View specific event
stripe events retrieve evt_xxxxx
```

### Database Queries
```sql
-- Check subscription status
SELECT 
  id, 
  name, 
  clerkOrgId, 
  subscriptionStatus, 
  subscriptionId, 
  stripeCustomerId,
  subscriptionPlan,
  subscriptionEndsAt
FROM "Church"
WHERE clerkOrgId = 'org_xxxxx';
```

### Common Issues

1. **Webhook signature verification fails**
   - Ensure you're using the correct signing secret
   - Check that the raw body is being used for verification
   - Verify the endpoint URL matches exactly

2. **Customer portal not working**
   - Ensure customer has a valid stripeCustomerId
   - Check portal configuration in Stripe Dashboard
   - Verify return URL is correct

3. **Payment link not updating subscription**
   - Check client_reference_id is being passed
   - Verify webhook is processing checkout.session.completed
   - Check logs for any errors

## Testing Checklist

- [ ] Payment link redirects work correctly
- [ ] Webhook processes checkout completion
- [ ] Database updates with subscription info
- [ ] Customer portal opens successfully
- [ ] Subscription changes are reflected
- [ ] Plan switching works
- [ ] Cancellation flow works
- [ ] Past due handling works