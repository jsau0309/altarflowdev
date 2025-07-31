# Communication Quota System - MVP

## Current Implementation

### Free Churches (Default)
- **Subscription Status**: Not 'active'
- **Campaign Limit**: 4 campaigns per month
- **Member Limit**: Handled by existing system
- **Display**: Shows "X/4 campaigns this month" with progress bar

### Paid Churches
- **Subscription Status**: 'active'
- **Campaign Limit**: Unlimited (9999)
- **Member Limit**: Unlimited
- **Display**: Shows "Unlimited campaigns"

## How It Works

1. **Uses Existing Stripe Integration**
   - No new fields needed
   - Checks `church.subscriptionStatus === 'active'`
   - Free churches get 4 campaigns/month
   - Paid churches get unlimited

2. **Simple Logic**
   ```typescript
   const isPaidChurch = church.subscriptionStatus === 'active';
   const quotaLimit = isPaidChurch ? 9999 : 4;
   ```

3. **UI Display**
   - Free: "2/4 campaigns this month" + progress bar
   - Free at limit: Shows "Limit reached" badge
   - Paid: "Unlimited campaigns"

## First 12 Churches Strategy

Your first 12 paying churches automatically get:
- Unlimited campaigns (because they're paid)
- All features (because they're paid)
- Special 50% discount via Stripe coupon (manual)

No special code needed - they're treated as regular paid churches!

## Future V2 Considerations

When ready for per-member pricing:
1. Add `pricingTier` field to Church model
2. Calculate price based on member count
3. First 12 churches get grandfathered pricing
4. New churches get per-member pricing

## Benefits of This Approach

- ✅ No schema changes needed
- ✅ Works with existing Stripe integration
- ✅ Simple to understand (free = 4, paid = unlimited)
- ✅ First 12 churches automatically get everything
- ✅ Easy to adjust limits later