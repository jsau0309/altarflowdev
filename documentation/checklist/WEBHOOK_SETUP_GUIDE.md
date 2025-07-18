# Stripe Webhook Setup Guide

This guide will help you properly configure Stripe webhooks for both development and production environments.

## Understanding the Webhook Flow

1. **Transaction Creation**: When a donation is initiated, a `DonationTransaction` is created with status `pending`
2. **Payment Processing**: Stripe processes the payment
3. **Webhook Notification**: Stripe sends a webhook event when payment succeeds
4. **Status Update**: The webhook handler updates the transaction status to `succeeded`

## Why Webhooks Might Fail

The most common issues are:

1. **Wrong Webhook Secret**: Using CLI secret in production or vice versa
2. **Signature Verification Failure**: Mismatch between the secret and the actual webhook
3. **Network Issues**: Webhook endpoint not accessible from Stripe
4. **Database Connection**: Webhook handler can't connect to database

## Development Setup (Stripe CLI)

1. Install Stripe CLI if not already installed
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Start webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy the webhook signing secret shown (starts with `whsec_`)
5. Update your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
   ```

## Production Setup

### Step 1: Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded` ✅ (Required)
   - `payment_intent.processing` (Optional)
   - `payment_intent.payment_failed` (Optional)

### Step 2: Configure Webhook Secret

1. After creating the endpoint, click on it
2. Click "Reveal" under "Signing secret"
3. Copy the webhook secret (starts with `whsec_`)
4. Add to your production environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Step 3: Test Your Webhook

1. In Stripe Dashboard, go to your webhook endpoint
2. Click "Send test webhook"
3. Select `payment_intent.succeeded`
4. Check your server logs for successful processing

## Debugging Webhook Issues

### 1. Check Webhook Logs in Stripe Dashboard

- Go to your webhook endpoint in Stripe Dashboard
- Check the "Webhook attempts" section
- Look for failed attempts and their error messages

### 2. Enable Debug Logging

The webhook handler now includes enhanced logging:
- Webhook secret prefix and length (without exposing the secret)
- Signature verification status
- Transaction lookup results
- Detailed error messages

### 3. Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "No signatures found matching the expected signature" | Wrong webhook secret | Verify you're using the correct secret for your environment |
| "No DonationTransaction found for PI" | Transaction wasn't created or wrong PI ID | Check if transaction creation is working |
| "Failed to update transaction record" | Database connection issue | Check database connectivity and permissions |

### 4. Emergency Development Mode

For testing only, you can bypass signature verification:
```env
NODE_ENV=development
SKIP_WEBHOOK_VERIFICATION=true
```
⚠️ **NEVER use this in production!**

## Testing Webhook Integration

### Local Testing with Stripe CLI

1. Create a test payment:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

2. Check your logs for:
   - `[Stripe Webhook] Event constructed: payment_intent.succeeded`
   - `[Stripe Webhook] Successfully updated DonationTransaction`

### Production Testing

1. Make a test donation using Stripe test cards
2. Monitor your server logs
3. Check Stripe Dashboard webhook logs
4. Verify transaction status in your database

## Security Best Practices

1. **Never expose webhook secrets** in logs or error messages
2. **Always verify signatures** in production
3. **Use HTTPS** for webhook endpoints
4. **Implement idempotency** (already done in current implementation)
5. **Return 2xx status quickly** to prevent Stripe retries
6. **Handle retries gracefully** - check if transaction already updated

## Troubleshooting Checklist

- [ ] Correct webhook secret for environment?
- [ ] Webhook endpoint accessible from internet?
- [ ] SSL certificate valid?
- [ ] Database accessible from webhook handler?
- [ ] Stripe events selected in dashboard?
- [ ] Server logs showing webhook receipt?
- [ ] Transaction exists in database before webhook?

## Monitoring Recommendations

1. Set up alerts for webhook failures
2. Monitor webhook processing time
3. Track success/failure rates
4. Log all webhook events for audit trail

## Support

If webhooks continue to fail after following this guide:
1. Check Stripe system status
2. Review server logs with debug info
3. Contact Stripe support with webhook attempt IDs