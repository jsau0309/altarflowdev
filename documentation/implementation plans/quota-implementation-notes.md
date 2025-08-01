# Email Campaign Quota Implementation

## Changes Made

### 1. Quota API (`/api/communication/quota/route.ts`)
- Changed from counting individual emails to counting campaigns
- Counts campaigns with status "SENT" or "SENDING" in the current month
- Returns `isBeta: true` flag for UI display
- Sets quota limit to 9999 (effectively unlimited) for beta churches

### 2. Campaign List UI
- Updated display from "X/Y emails" to "X/Y campaigns"
- Shows "Unlimited campaigns" for beta churches
- Shows "Beta access" instead of reset date for beta churches
- Removed progress bar for beta churches (since it's unlimited)

### 3. How It Works
- Each campaign counts as 1, regardless of recipient count
- Churches can send unlimited emails as long as they stay within campaign limit
- For beta: effectively unlimited campaigns (9999 limit)

### 4. Future Considerations
When moving out of beta:
1. Set `quotaLimit` based on subscription plan
2. Remove `isBeta` flag
3. Consider adding different limits for different plans:
   - Free: 2 campaigns/month
   - Pro: 10 campaigns/month
   - Enterprise: Unlimited

### 5. No Changes Needed For
- Email sending - no quota checks there
- Campaign creation - no quota checks there
- The quota is informational only, not enforced in beta

## Testing
1. Send a campaign and check that quota shows "1 campaign sent"
2. Send another and verify it shows "2 campaigns sent"
3. Verify "Unlimited campaigns" shows in the UI
4. Verify campaigns with different recipient counts all count as 1 campaign each