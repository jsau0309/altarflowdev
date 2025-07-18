# Production Testing Guide

## Testing in Production Safely

### 1. Test Mode Transactions
Use Stripe's test cards in production:
- Create a special promo code "DEMO2024" that reduces any donation to $0.50
- Use test card: 4242 4242 4242 4242 (always succeeds)
- This creates real transactions but with minimal cost

### 2. Environment-Based Test Accounts
```typescript
// Add to your donation flow
const isTestAccount = user.email?.endsWith('@altarflow.test');
const amount = isTestAccount ? 50 : actualAmount; // 50 cents for test accounts
```

### 3. Feature Flags for Testing
```env
# .env.production
ENABLE_TEST_MODE=true # Remove after testing phase
TEST_EMAIL_DOMAIN=@altarflow.test
```

### 4. Monitoring Setup
1. **Sentry Alerts**:
   - Failed webhook signatures
   - Payment intent failures
   - Duplicate transaction attempts
   - Email sending failures

2. **Custom Dashboards**:
   - Webhook success rate
   - Average processing time
   - Failed transactions by type

### 5. Safe Testing Workflow
1. Create test church: "Demo Church" 
2. Use test donor accounts (*@altarflow.test)
3. Monitor in real-time via Sentry
4. Verify webhook delivery in Stripe Dashboard

### 6. Rollback Strategy
```bash
# Quick rollback if issues arise
git checkout stable-production
vercel --prod
```

## Demo Account Setup

1. **Create Demo Organization**:
   - Church Name: "Demo Church - Altarflow"
   - Slug: "demo-church"
   - Test Mode: Enabled

2. **Test User Accounts**:
   - demo@altarflow.test (Admin)
   - donor@altarflow.test (Donor)
   - viewer@altarflow.test (Read-only)

3. **Webhook Testing**:
   ```bash
   # Test production webhooks
   curl -X POST https://your-domain.com/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d @test-webhook-payload.json
   ```

## Monitoring Checklist

- [ ] Sentry dashboard configured
- [ ] Stripe webhook logs monitored
- [ ] Database transaction logs checked
- [ ] Email delivery verified
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms