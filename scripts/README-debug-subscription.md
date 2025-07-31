# Debug Subscription Status Script

This script helps identify why paid churches might be getting incorrect campaign quotas (4 instead of 10,000).

## Problem Identified

The main issue is a discrepancy between two different parts of the codebase:

1. **`/lib/subscription-helpers.ts`** - Correctly identifies paid churches as those with:
   - `active` status
   - `past_due` status
   - `canceled` status (within subscription end date)
   - `grace_period` status (within subscription end date + 2 days)

2. **`/app/api/communication/quota/route.ts`** - Only checks for `active` status:
   ```typescript
   const isPaidChurch = church.subscriptionStatus === 'active';
   const quotaLimit = isPaidChurch ? 9999 : 4;
   ```

This means churches with `past_due`, `canceled`, or `grace_period` status are incorrectly getting the free tier limit of 4 campaigns instead of 10,000.

## Running the Script

```bash
npm run debug:subscription
```

## What the Script Does

1. Queries all churches from the database
2. Shows their subscription details (status, plan, end dates)
3. Compares the quota calculations from both:
   - `getQuotaLimit()` function (correct implementation)
   - The quota route logic (incorrect implementation)
4. Identifies discrepancies and affected churches

## Fix Required

The `/app/api/communication/quota/route.ts` file needs to be updated to use the `hasPaidSubscription()` helper function instead of just checking for `active` status:

```typescript
import { hasPaidSubscription } from "@/lib/subscription-helpers";

// Replace this:
const isPaidChurch = church.subscriptionStatus === 'active';

// With this:
const isPaidChurch = hasPaidSubscription(church);
```

This will ensure churches with `past_due`, `canceled` (in grace period), and `grace_period` statuses get the correct 10,000 campaign quota.