# RLS Performance Optimization Plan

## Overview
Supabase has identified critical performance issues with our RLS policies that are causing the slow email sending (28 seconds for 10 emails).

## Issues Found

### 1. Auth Function Re-evaluation (16 tables affected)
- Auth functions are being called for EVERY ROW instead of once per query
- This is causing massive performance degradation
- Affected tables: Member, EmailCampaign, EmailRecipient, EmailQuota, EmailSettings, Expense, Flow, DonationType, Donor, Campaign, Donation, Submission, StripeConnectAccount, DonationTransaction

### 2. Multiple Permissive Policies (3 tables affected)
- EmailQuota, EmailRecipient, EmailSettings have duplicate SELECT policies
- Each policy must be evaluated, doubling the performance impact

## Fix Implementation

### Step 1: Create Migration to Fix Auth Functions
All instances of `auth.<function>()` need to be wrapped with `(select auth.<function>())`

### Step 2: Consolidate Duplicate Policies
Merge multiple SELECT policies into single, more efficient policies

### Step 3: Add Missing Indexes
The email sending process would benefit from:
```sql
CREATE INDEX idx_email_recipient_campaign_email ON "EmailRecipient"(campaignId, email);
CREATE INDEX idx_email_preference_member ON "EmailPreference"(memberId);
CREATE INDEX idx_member_church_email ON "Member"(churchId, email);
```

## Impact
- Email sending should improve from 28 seconds to ~2-3 seconds
- All database queries will be significantly faster
- Better scalability as church member counts grow

## Testing After Fix
1. Re-run the email campaign test
2. Monitor query performance in Supabase dashboard
3. Verify all functionality still works correctly