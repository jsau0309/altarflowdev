# Stripe Connect Demo Account Guide

## Creating Demo Connect Accounts in Production

### Overview
Stripe allows you to create test Connect accounts in your production environment. These accounts can only process test payments, making them perfect for demos.

### Step-by-Step Setup

#### 1. Create Demo Organization
```typescript
// When creating a church for demos
const demoChurch = {
  name: "Demo Church - Altarflow",
  slug: "demo-church",
  email: "demo@altarflow.test",
  // Mark as test account in your database
  isTestAccount: true
};
```

#### 2. Connect Account Onboarding Test Data

**Business Information**:
- Business Name: "Demo Church - Test Account"
- Business Type: Individual or Company
- Industry: Religious Organizations

**Test Personal Information** (for Individual):
- First Name: Any name
- Last Name: Any name
- DOB: Any valid date (must be 18+)
- SSN: `000-00-0000`
- Phone: Any valid format

**Test Business Information** (for Company):
- EIN: `00-0000000`
- Business Address: Any valid address

**Test Bank Account**:
- Routing Number: `110000000`
- Account Number: `000000000000`
- Account Type: Checking or Savings

### Important Notes

1. **Test Mode Limitations**:
   - Can only process test card payments
   - Cannot receive real payouts
   - Perfect for demonstrations

2. **Test Cards for Demos**:
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Requires Auth: 4000 0025 0000 3155
   ```

3. **Identifying Test Accounts**:
   - Add metadata to Connect account: `{"test_account": true}`
   - Display "DEMO" badge in your UI
   - Filter out from production reports

### Demo Script Example

```typescript
// In your demo flow
async function createDemoConnectAccount(churchId: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: 'demo@altarflow.test',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      church_id: churchId,
      test_account: 'true',
      demo_mode: 'true'
    }
  });
  
  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/banking`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/banking?setup=complete`,
    type: 'account_onboarding',
  });
  
  return accountLink.url;
}
```

### Production Demo Workflow

1. **Setup Demo Church**:
   - Login with `demo@altarflow.test`
   - Create church profile
   - Navigate to Banking setup

2. **Complete Connect Onboarding**:
   - Use test data provided above
   - Complete all required fields
   - Submit for "verification"

3. **Test Donation Flow**:
   - Make donation with test card
   - Verify webhook processing
   - Check transaction appears as "succeeded"

4. **Demo Features**:
   - Show real-time transaction updates
   - Display reporting dashboards
   - Export donation receipts
   - Demonstrate member management

### Cleanup

After demos, you can:
1. Disable the test Connect account
2. Mark church as inactive
3. Keep for future demonstrations

### Security Considerations

- Always mark test accounts in your database
- Never mix test and real transaction reporting
- Use separate email domain for test accounts
- Monitor for abuse of test mode