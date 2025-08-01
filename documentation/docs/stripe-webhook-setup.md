# Stripe Webhook Configuration Guide

## Overview

AltarFlow uses a single consolidated Stripe webhook endpoint to handle both:
1. **Platform Subscriptions** - Monthly/Annual plans for churches
2. **Donation Processing** - Church donations via Stripe Connect

## Webhook Endpoint

**Production URL**: `https://yourdomain.com/api/webhooks/stripe`
**Local Testing**: `https://your-ngrok-url.ngrok.app/api/webhooks/stripe`

## Required Events

Configure your Stripe webhook to listen for these specific events:

### Platform Subscription Events
- `checkout.session.completed` - New subscription signups via payment links
- `customer.subscription.updated` - Subscription changes (upgrades, downgrades, cancellations)
- `customer.subscription.deleted` - Subscription terminations

### Donation Events  
- `payment_intent.succeeded` - Successful donation payments
- `payment_intent.processing` - Donations being processed
- `payment_intent.payment_failed` - Failed donation attempts
- `account.updated` - Connect account status changes

## Step-by-Step Setup

### 1. Access Stripe Dashboard
1. Log in to your Stripe account
2. Navigate to **Developers → Webhooks**
3. Click **Add endpoint**

### 2. Configure Endpoint
1. **Endpoint URL**: Enter your production URL
2. **Description**: "AltarFlow Platform & Donations"
3. **Events**: Select only the 7 events listed above
4. Click **Add endpoint**

### 3. Get Signing Secret
1. After creating the endpoint, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## Testing Locally

### Using Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger payment_intent.succeeded
```

### Using ngrok
```bash
# Start your local server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL in Stripe webhook configuration
# Example: https://abc123.ngrok.app/api/webhooks/stripe
```

## What Happens on Each Event

### `checkout.session.completed`
1. Church completes payment via Stripe payment link
2. Updates church status to 'active'
3. **Updates email quota to 10,000 campaigns/month**
4. Stores subscription details

### `customer.subscription.updated`
1. Subscription changes (plan switch, cancellation)
2. Updates church subscription status
3. **Adjusts email quota based on new status**
4. Handles grace periods for canceled subscriptions

### `customer.subscription.deleted`
1. Subscription fully terminated
2. Updates church to 'free' status
3. **Reduces email quota to 4 campaigns/month**

### `payment_intent.succeeded`
1. Donation successfully processed
2. Updates donation transaction status
3. Sends receipt email to donor
4. Updates donor information

## Environment Variables

```env
# Required for webhooks
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment links (for subscriptions)
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_ANNUAL_LINK=https://buy.stripe.com/...
```

## Important Notes

1. **DO NOT** select "Send all events" - only subscribe to needed events
2. **Old webhook** at `/api/webhooks/route.ts` is deprecated and returns 410 status
3. **Email quotas** update automatically - no manual intervention needed
4. **Single webhook secret** - both subscription and donation events use same secret

## Troubleshooting

### Webhook Signature Errors
- Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
- Ensure you're using raw request body (not parsed JSON)

### Events Not Received
- Check endpoint URL is correct
- Verify events are selected in dashboard
- Check webhook logs in Stripe dashboard

### Quota Not Updating
- Verify `emailQuota` table exists in database
- Check webhook logs for errors
- Ensure church has valid `clerkOrgId`

## Security Best Practices

1. Always verify webhook signatures
2. Use HTTPS endpoints only
3. Keep webhook secrets secure
4. Monitor webhook logs regularly
5. Set up webhook error alerts