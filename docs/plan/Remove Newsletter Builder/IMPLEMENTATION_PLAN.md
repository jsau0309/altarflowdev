# COMPREHENSIVE IMPLEMENTATION PLAN: Remove Newsletter/Communication Features

## Executive Summary

This plan outlines the complete removal of all email campaign/newsletter functionality from AltarFlow. Based on thorough analysis, we've identified **86+ files** across frontend, backend, database, and configuration layers that require removal or modification.

**Critical Risk Areas:**
- Production database contains live campaign data
- Email templates used by other features (donation receipts, etc.) must be preserved
- Member email preferences integrated with member records
- Stripe subscription webhook updates quota limits
- Cron jobs actively running in production

---

## PHASE 1: PREPARATION & SAFETY

**Objective:** Ensure safe removal with rollback capability and no data loss

### 1.1 Database Backup (CRITICAL - Do First)
**Risk Level:** HIGH - Production data exists

**Actions:**
```bash
# Create full database backup before ANY changes
npx prisma db execute --file=scripts/backup-communication-data.sql

# OR use pg_dump via DIRECT_URL
pg_dump "$DIRECT_URL" > backups/pre-communication-removal-$(date +%Y%m%d-%H%M%S).sql
```

**Create backup script:**
```sql
-- scripts/backup-communication-data.sql
-- Backup all communication-related data
COPY (SELECT * FROM "EmailCampaign") TO '/tmp/email_campaigns_backup.csv' CSV HEADER;
COPY (SELECT * FROM "EmailRecipient") TO '/tmp/email_recipients_backup.csv' CSV HEADER;
COPY (SELECT * FROM "EmailPreference") TO '/tmp/email_preferences_backup.csv' CSV HEADER;
COPY (SELECT * FROM "EmailQuota") TO '/tmp/email_quotas_backup.csv' CSV HEADER;
COPY (SELECT * FROM "EmailSettings") TO '/tmp/email_settings_backup.csv' CSV HEADER;
```

### 1.2 Production Data Assessment
**Files to Check:**
- Query production database to see if any churches have active campaigns
- Check if any emails are scheduled
- Verify quota usage across all churches

```sql
-- Check for active campaigns
SELECT COUNT(*) FROM "EmailCampaign" WHERE status IN ('SCHEDULED', 'SENDING');

-- Check churches with email data
SELECT c.name, COUNT(ec.id) as campaigns
FROM "Church" c
LEFT JOIN "EmailCampaign" ec ON ec."churchId" = c.id
GROUP BY c.id, c.name
HAVING COUNT(ec.id) > 0;

-- Check scheduled emails
SELECT * FROM "EmailCampaign" WHERE "scheduledFor" > NOW();
```

### 1.3 Environment Variable Audit
**Check usage of:**
- `RESEND_API_KEY` - Used by email templates (keep)
- `RESEND_FROM_EMAIL` - Used by email templates (keep)
- `RESEND_WEBHOOK_SECRET` - Only for campaigns (remove)
- `EMAIL_BOUNCE_THRESHOLD` - Only for campaigns (remove)
- `HARD_BOUNCE_UNSUBSCRIBE` - Only for campaigns (remove)
- `NEXT_PUBLIC_TOPOL_API_KEY` - Email editor (remove)

**Action:** Document which env vars are campaign-only vs shared

### 1.4 Feature Flag (Optional but Recommended)
**Risk:** Medium - Allows quick rollback

Add temporary feature flag to disable UI without breaking code:
```typescript
// lib/feature-flags.ts
export const FEATURES = {
  COMMUNICATION: process.env.NEXT_PUBLIC_ENABLE_COMMUNICATION === 'true'
} as const;
```

Use in navigation to hide communication link immediately without removing code.

---

## PHASE 2: FRONTEND REMOVAL

**Objective:** Remove all UI components, pages, and client-side code

### 2.1 Communication Pages (App Router)
**Risk Level:** LOW - Self-contained pages

**Files to DELETE entirely:**
1. `/app/(dashboard)/communication/page.tsx` - Main listing page
2. `/app/(dashboard)/communication/layout.tsx` - Layout wrapper
3. `/app/(dashboard)/communication/[id]/page.tsx` - Campaign detail view
4. `/app/(dashboard)/communication/[id]/edit/page.tsx` - Edit campaign page
5. `/app/(dashboard)/communication/[id]/edit/edit-campaign-form.tsx` - Edit form component
6. `/app/(dashboard)/communication/new/page.tsx` - New campaign entry
7. `/app/(dashboard)/communication/new/details/page.tsx` - Campaign details step
8. `/app/(dashboard)/communication/new/details/campaign-header.tsx` - Header component
9. `/app/(dashboard)/communication/new/details/campaign-details-form.tsx` - Details form
10. `/app/(dashboard)/communication/new/editor/page.tsx` - Email editor page
11. `/app/(dashboard)/communication/new/editor/editor-page-client.tsx` - Editor client component
12. `/app/(dashboard)/communication/new/editor/email-editor-wrapper.tsx` - Topol wrapper
13. `/app/(dashboard)/communication/new/recipients/page.tsx` - Recipients selection page
14. `/app/(dashboard)/communication/new/recipients/recipients-page-client.tsx` - Client component
15. `/app/(dashboard)/communication/new/recipients/recipients-selector.tsx` - Selector component
16. `/app/(dashboard)/communication/new/review/page.tsx` - Review & send page
17. `/app/(dashboard)/communication/new/review/review-page-client.tsx` - Review client
18. `/app/(dashboard)/communication/new/review/review-and-send.tsx` - Send component

**Deletion Command:**
```bash
rm -rf app/(dashboard)/communication
```

### 2.2 Communication Components
**Risk Level:** LOW - Isolated components

**Files to DELETE:**
1. `/components/communication/ai-suggestions-dialog.tsx` - AI email suggestions
2. `/components/communication/campaign-progress.tsx` - Progress indicator
3. `/components/communication/campaign-success-animation.tsx` - Success animation
4. `/components/communication/email-preview-dialog.tsx` - Preview modal
5. `/components/communication/schedule-dialog.tsx` - Schedule picker (old)
6. `/components/communication/schedule-dialog-v2.tsx` - Schedule picker (new)
7. `/components/communication/send-confirm-dialog.tsx` - Send confirmation

**Deletion Command:**
```bash
rm -rf components/communication
```

### 2.3 Unsubscribe Public Pages
**Risk Level:** MEDIUM - Public-facing URLs

**Files to DELETE:**
1. `/app/unsubscribe/page.tsx` - Unsubscribe landing page
2. `/app/unsubscribe/unsubscribe-content.tsx` - Unsubscribe UI

**Middleware Changes Required:**
- `/middleware.ts` - Remove unsubscribe routes from public matcher

**MODIFY `/middleware.ts`:**
```typescript
const isPublicRoute = createRouteMatcher([
  '/signin(.*)',
  '/signup(.*)',
  '/api/webhooks(.*)',
  '/api/clerk-webhook(.*)',
  '/api/public(.*)',
  '/api/og(.*)',
  '/(.*)/nfc-landing(.*)',
  '/donate/(.*)',
  '/connect/(.*)',
  // DELETE these lines:
  // '/unsubscribe(.*)',
  // '/api/communication/unsubscribe(.*)',
  // '/api/communication/resubscribe(.*)',
  '/',
  '/waitlist-full',
  '/book-demo',
  '/privacy-policy',
  '/terms-of-service',
])
```

### 2.4 Navigation/Sidebar Updates
**Risk Level:** LOW

**File to MODIFY:**
- `/components/layout/enhanced-sidebar.tsx` lines 277-282

**Current State (Already Commented Out):**
```typescript
// HIDDEN: Communication tab - not used much, costs money to maintain
// {
//   name: t('layout:sidebar.communication', 'Communication'),
//   path: "/communication",
//   icon: Mail,
// },
```

**Action:** DELETE the commented-out section entirely

### 2.5 Landing Page Marketing Content
**Risk Level:** LOW

**File to MODIFY:**
- `/components/landing/simple-features.tsx` - Remove email campaigns feature

**Also check:**
- `/components/landing/tabbed-features.tsx` - Search for email/communication references
- `/components/landing/animated-title.tsx` - Check for communication mentions

---

## PHASE 3: BACKEND REMOVAL

**Objective:** Remove API routes, webhooks, cron jobs, and services

### 3.1 Communication API Routes
**Risk Level:** MEDIUM - May be called by frontend

**Files to DELETE:**
1. `/app/api/communication/campaigns/route.ts` - List/create campaigns
2. `/app/api/communication/campaigns/[id]/route.ts` - Get/update/delete campaign
3. `/app/api/communication/campaigns/[id]/send/route.ts` - Send campaign
4. `/app/api/communication/quota/route.ts` - Get quota status
5. `/app/api/communication/settings/route.ts` - Email settings CRUD
6. `/app/api/communication/test-email/route.ts` - Send test emails
7. `/app/api/communication/unsubscribe/route.ts` - Handle unsubscribe
8. `/app/api/communication/resubscribe/route.ts` - Handle resubscribe

**Deletion Command:**
```bash
rm -rf app/api/communication
```

### 3.2 AI Email Suggestions API
**Risk Level:** LOW - Campaign-specific

**File to DELETE:**
- `/app/api/ai/generate-email-suggestions/route.ts`

**File to MODIFY:**
- `/lib/ai-service.ts`

**Action:** Remove the `generateEmailSuggestions` method and `ToneOption` type if not used elsewhere

### 3.3 Cron Jobs
**Risk Level:** HIGH - Currently running in production

**Files to DELETE:**
1. `/app/api/cron/send-scheduled-campaigns/route.ts` - Sends scheduled campaigns every 5 min
2. `/app/api/cron/reset-email-quotas/route.ts` - Resets quotas monthly

**CRITICAL - Update Vercel Configuration:**

**File to MODIFY:**
- `/vercel.json`

**Current crons:**
```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled-campaigns",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/reset-email-quotas",
      "schedule": "0 0 1 * *"
    },
    // ... other crons
  ]
}
```

**Action:** REMOVE the two email-related cron entries

**After Deployment:** Verify in Vercel dashboard that crons are disabled

### 3.4 Resend Webhook Handler
**Risk Level:** HIGH - Handles production email events

**File to DELETE:**
- `/app/api/webhooks/resend/route.ts` - Processes email delivery, bounce, complaint events

**IMPORTANT:** This webhook only handles campaign emails. Donation receipts and other transactional emails don't use webhooks.

**Post-Deletion:**
1. Remove webhook endpoint from Resend dashboard
2. Verify transactional emails still work (donation receipts)

### 3.5 Email Service & Utilities
**Risk Level:** CRITICAL - Contains shared code

**Files to ANALYZE before deleting:**

1. **`/lib/email/resend-service.ts`** - Contains both campaign AND transactional email logic
   - **DELETE METHODS:**
     - `getOrCreateQuota()` (lines 43-79)
     - `sendBulkEmails()` (lines 143-397) - Campaign batch sending
     - `getEmailStats()` (lines 441-494) - Campaign statistics
   - **KEEP METHODS:**
     - `sendEmail()` (lines 84-138) - Used for transactional emails (donation receipts)
     - `sendTestEmail()` (lines 402-436) - May be used for testing donation receipts

2. **`/lib/email/sanitize-html.ts`** - XSS protection
   - **KEEP ENTIRE FILE** - Used for any HTML email content

3. **`/lib/email/validate-email.ts`** - Email validation
   - **KEEP ENTIRE FILE** - Used for member/donor email validation

4. **`/lib/email/escape-html.ts`** - HTML escaping
   - **KEEP ENTIRE FILE** - General utility

5. **`/lib/email/templates/`** - Email templates
   - **KEEP ALL FILES:**
     - `donation-receipt.ts` - Required for donation receipts
     - `new-member-welcome.ts` - May be used for new members
     - `prayer-request-notification.ts` - May be used for prayer requests

### 3.6 Webhook Integration Points
**Risk Level:** HIGH - Affects church creation and subscription updates

**Files to MODIFY:**

1. **`/app/api/clerk-webhook/route.ts`** (lines 208-222)
   - **REMOVE:** EmailQuota creation when church is created

```typescript
// DELETE LINES 208-222:
// Create initial email quota for the new church
const currentMonthYear = format(new Date(), 'yyyy-MM');
const quotaLimit = getQuotaLimit(newChurch);

await prisma.emailQuota.create({
  data: {
    id: randomUUID(),
    churchId: newChurch.id,
    monthYear: currentMonthYear,
    quotaLimit,
    emailsSent: 0,
    updatedAt: new Date(),
  },
});
console.log(`Successfully created email quota for church ID: ${newChurch.id} with limit: ${quotaLimit} campaigns/month`);
```

2. **`/app/api/webhooks/stripe/route.ts`** (lines 887-921)
   - **REMOVE:** EmailQuota updates when subscription changes

```typescript
// DELETE LINES 887-921:
// Update email quota if subscription status changed
if (church.subscriptionStatus !== updatedChurch.subscriptionStatus) {
  const currentMonthYear = format(new Date(), 'yyyy-MM');
  const newQuotaLimit = getQuotaLimit(updatedChurch);

  const existingQuota = await prisma.emailQuota.findFirst({
    where: {
      churchId: church.id,
      monthYear: currentMonthYear,
    },
  });

  if (existingQuota) {
    await prisma.emailQuota.update({
      where: { id: existingQuota.id },
      data: { quotaLimit: newQuotaLimit },
    });
    console.log(`[Stripe Webhook] Updated email quota for church ${church.id}: ${existingQuota.quotaLimit} -> ${newQuotaLimit} campaigns/month`);
  } else {
    await prisma.emailQuota.create({
      data: {
        id: randomUUID(),
        churchId: church.id,
        monthYear: currentMonthYear,
        quotaLimit: newQuotaLimit,
        emailsSent: 0,
        updatedAt: new Date(),
      },
    });
    console.log(`[Stripe Webhook] Created email quota for church ${church.id}: ${newQuotaLimit} campaigns/month`);
  }
}
```

### 3.7 Member API Routes
**Risk Level:** MEDIUM - Affects member management

**Files to MODIFY:**

1. **`/app/api/members/with-email-preferences/route.ts`**
   - **DELETE ENTIRE FILE** - Only used for campaign recipient selection

2. **`/app/api/members/route.ts`** & **`/app/api/members/[memberId]/route.ts`**
   - **REMOVE:** EmailPreference includes from Prisma queries

**Example modification:**
```typescript
// BEFORE:
const members = await prisma.member.findMany({
  include: {
    EmailPreference: true,  // DELETE THIS
  },
});

// AFTER:
const members = await prisma.member.findMany({
  // No EmailPreference include
});
```

### 3.8 Subscription Helper Functions
**Risk Level:** LOW

**File to MODIFY:**
- `/lib/subscription-helpers.ts`

**Action:** Remove `getQuotaLimit()` function (lines 42-47)

```bash
# Check usage before deleting:
grep -r "getQuotaLimit" --include="*.ts" --include="*.tsx"
```

### 3.9 Topol Configuration
**Risk Level:** LOW

**File to DELETE:**
- `/lib/topol-config.ts` - Topol.io email editor configuration

---

## PHASE 4: DATABASE CLEANUP

**Objective:** Remove database schema, migrations, and RLS policies

### 4.1 Production Data Migration Strategy
**Risk Level:** CRITICAL - Cannot be undone without backup

**Option A: Soft Delete (Recommended for Production)**
- Keep tables in schema but empty them
- Allows data recovery if needed
- Simpler rollback

**Option B: Hard Delete**
- Drop tables completely
- Cleaner long-term
- Requires new migration to recreate if rollback needed

**Recommended: Option A first, then Option B after confirmation**

### 4.2 Prisma Schema Updates
**Risk Level:** HIGH - Breaks TypeScript types

**File to MODIFY:**
- `/prisma/schema.prisma`

**Models to DELETE:**
```prisma
model EmailCampaign { ... }
model EmailRecipient { ... }
model EmailPreference { ... }
model EmailQuota { ... }
model EmailSettings { ... }
```

**Enums to DELETE:**
```prisma
enum EmailStatus { ... }
enum RecipientStatus { ... }
```

**Relations to REMOVE from other models:**

1. **Church model:**
```prisma
model Church {
  // DELETE these relations:
  EmailCampaign    EmailCampaign[]
  EmailQuota       EmailQuota[]
  EmailSettings    EmailSettings?

  // Keep all other relations
}
```

2. **Member model:**
```prisma
model Member {
  // DELETE these relations:
  EmailPreference  EmailPreference?
  EmailRecipient   EmailRecipient[]

  // Keep all other relations
}
```

### 4.3 Create Down Migration
**Risk Level:** HIGH - Must be perfect

**Create migration to drop tables:**

```bash
# Generate migration
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev --name remove_email_communication_tables --create-only
```

**Edit the migration SQL file:**

```sql
-- Migration: remove_email_communication_tables
-- WARNING: This will delete ALL email campaign data

-- Step 1: Drop RLS policies (Supabase-specific)
DROP POLICY IF EXISTS "Users can view their church campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can create campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can update campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin can delete campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can view campaign recipients" ON "EmailRecipient";
DROP POLICY IF EXISTS "Manage recipients through campaigns" ON "EmailRecipient";
DROP POLICY IF EXISTS "Church can view member preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Public unsubscribe via token" ON "EmailPreference";
DROP POLICY IF EXISTS "System creates preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Users can view church quota" ON "EmailQuota";
DROP POLICY IF EXISTS "System manages quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can view church email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Admin manages email settings" ON "EmailSettings";

-- Step 2: Drop foreign key constraints
ALTER TABLE "EmailCampaign" DROP CONSTRAINT IF EXISTS "EmailCampaign_churchId_fkey";
ALTER TABLE "EmailRecipient" DROP CONSTRAINT IF EXISTS "EmailRecipient_campaignId_fkey";
ALTER TABLE "EmailRecipient" DROP CONSTRAINT IF EXISTS "EmailRecipient_memberId_fkey";
ALTER TABLE "EmailPreference" DROP CONSTRAINT IF EXISTS "EmailPreference_memberId_fkey";
ALTER TABLE "EmailQuota" DROP CONSTRAINT IF EXISTS "EmailQuota_churchId_fkey";
ALTER TABLE "EmailSettings" DROP CONSTRAINT IF EXISTS "EmailSettings_churchId_fkey";

-- Step 3: Drop indexes
DROP INDEX IF EXISTS "EmailCampaign_churchId_idx";
DROP INDEX IF EXISTS "EmailCampaign_churchId_createdAt_idx";
DROP INDEX IF EXISTS "EmailCampaign_status_idx";
DROP INDEX IF EXISTS "EmailCampaign_scheduledFor_idx";
DROP INDEX IF EXISTS "idx_campaigns_church_status";
DROP INDEX IF EXISTS "idx_email_campaign_church_status";
DROP INDEX IF EXISTS "EmailRecipient_campaignId_idx";
DROP INDEX IF EXISTS "EmailRecipient_memberId_idx";
DROP INDEX IF EXISTS "idx_email_recipients_campaign_status";
DROP INDEX IF EXISTS "idx_email_recipient_campaign_email";
DROP INDEX IF EXISTS "EmailPreference_unsubscribeToken_idx";
DROP INDEX IF EXISTS "idx_email_prefs_member";
DROP INDEX IF EXISTS "idx_email_preference_member";
DROP INDEX IF EXISTS "idx_email_quota_church";
DROP INDEX IF EXISTS "idx_email_settings_church";

-- Step 4: Drop tables (cascade will remove remaining dependencies)
DROP TABLE IF EXISTS "EmailRecipient" CASCADE;
DROP TABLE IF EXISTS "EmailCampaign" CASCADE;
DROP TABLE IF EXISTS "EmailPreference" CASCADE;
DROP TABLE IF EXISTS "EmailQuota" CASCADE;
DROP TABLE IF EXISTS "EmailSettings" CASCADE;

-- Step 5: Drop enums
DROP TYPE IF EXISTS "EmailStatus";
DROP TYPE IF EXISTS "RecipientStatus";
```

### 4.4 TypeScript Type Regeneration
**Risk Level:** HIGH - Will break compilation until complete

**After schema changes:**
```bash
# Regenerate Prisma client
npx prisma generate

# Build project to find TypeScript errors
npx tsc --noEmit

# If errors found, review and fix imports
```

---

## PHASE 5: DEPENDENCIES & CONFIGURATION

**Objective:** Remove unused npm packages and configuration

### 5.1 NPM Package Removal
**Risk Level:** LOW - Can always reinstall

**Packages to REMOVE:**

1. `@topol.io/editor-react` - Email campaign editor
2. `react-email-editor` - Alternative email editor (likely unused)
3. `isomorphic-dompurify` - **CHECK BEFORE REMOVING** (may be used for other content)
4. `@types/react-email-editor` - TypeScript types

**Uninstall command:**
```bash
npm uninstall @topol.io/editor-react react-email-editor @types/react-email-editor

# Only if not used elsewhere:
npm uninstall isomorphic-dompurify @types/dompurify
```

**Packages to KEEP:**
- `resend` - Still needed for transactional emails (donation receipts)
- `svix` - Used for Stripe/Clerk webhooks, not just Resend

### 5.2 Environment Variable Cleanup

**File to MODIFY:**
- `/.env.example`

**Variables to REMOVE:**
```bash
# DELETE these:
RESEND_WEBHOOK_SECRET=whsec_xxxxx
EMAIL_BOUNCE_THRESHOLD=5
HARD_BOUNCE_UNSUBSCRIBE=true
NEXT_PUBLIC_TOPOL_API_KEY=xxxxx
```

**Variables to KEEP:**
```bash
# KEEP these (used for transactional emails):
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="Altarflow <hello@altarflow.com>"
YOUR_VERIFIED_RESEND_DOMAIN=altarflow.com
```

**File to MODIFY:**
- `/lib/env.ts`

**Remove from schema:**
```typescript
// DELETE from serverEnvSchema:
RESEND_WEBHOOK_SECRET: z.string().optional(),
EMAIL_BOUNCE_THRESHOLD: z.string().transform(Number).pipe(z.number().min(1)).default('5'),
HARD_BOUNCE_UNSUBSCRIBE: z.string().transform(val => val === 'true').default('true'),

// DELETE from clientEnvSchema:
NEXT_PUBLIC_TOPOL_API_KEY: z.string().optional(),
```

### 5.3 Translation Files

**Files to DELETE:**
1. `/locales/en/communication.json` - English communication strings
2. `/locales/es/communication.json` - Spanish communication strings

**File to MODIFY:**
- `/lib/i18n.ts`

**Remove imports and references:**
```typescript
// DELETE:
import enCommunication from '../locales/en/communication.json';
import esCommunication from '../locales/es/communication.json';

// DELETE from resources:
communication: enCommunication,
communication: esCommunication,

// DELETE from ns array:
'communication',
```

### 5.4 Script Cleanup

**File to MODIFY:**
- `/package.json`

**Remove script (if exists):**
```json
{
  "scripts": {
    // DELETE this line if exists:
    "debug:email": "ts-node --compiler-options {\\\"module\\\":\\\"CommonJS\\\"} scripts/debug-email-receipt.ts"
  }
}
```

### 5.5 Documentation Cleanup

**Files to ARCHIVE (move to `/docs/archived/removed-features/communication/`):**
1. `/docs/future/EMAIL_CAMPAIGN_RETRY_V2.md` - Future email feature
2. `/documentation/implementation plans/communication-schema-design.md` - Schema design
3. `/documentation/implementation plans/communication-implementation-plan.md` - Implementation plan
4. `/documentation/implementation plans/update-quota-to-campaigns.md` - Quota updates
5. `/documentation/implementation plans/quota-implementation-notes.md` - Quota notes
6. `/documentation/docs/email-subdomain-setup.md` - Email setup guide

---

## PHASE 6: TESTING & VERIFICATION

**Objective:** Ensure no regressions and all core features still work

### 6.1 Compilation & Type Checking
**Risk Level:** CRITICAL

**Commands:**
```bash
# Regenerate Prisma client
npx prisma generate

# Check for TypeScript errors
npx tsc --noEmit

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

**Expected errors to fix:**
- Imports of deleted types (EmailStatus, RecipientStatus, etc.)
- References to deleted models in Prisma queries
- Missing translation keys for deleted namespaces

### 6.2 Database Migration Testing

**Development Database:**
```bash
# Apply migration
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev --name remove_email_communication_tables

# Verify schema is correct
npx prisma migrate status

# Check for drift
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

**Production Migration Plan:**
```bash
# 1. Backup production database (CRITICAL)
pg_dump "$PRODUCTION_DIRECT_URL" > backups/pre-removal-$(date +%Y%m%d).sql

# 2. Deploy migration
DATABASE_URL="$PRODUCTION_DIRECT_URL" npx prisma migrate deploy

# 3. Verify
psql "$PRODUCTION_DIRECT_URL" -c "\dt Email*"
# Should return no tables
```

### 6.3 Core Feature Testing

**Test each core feature still works:**

1. **Donations:**
   - [ ] Create manual donation
   - [ ] Create online donation
   - [ ] Verify donation receipt email sent (transactional email)
   - [ ] Check donation reports

2. **Members:**
   - [ ] Add new member
   - [ ] Edit member
   - [ ] Delete member
   - [ ] View member directory
   - [ ] **Verify NO email preference fields visible**

3. **Expenses:**
   - [ ] Create expense
   - [ ] Upload receipt
   - [ ] OCR scan receipt
   - [ ] Approve expense

4. **Reports:**
   - [ ] Generate financial report
   - [ ] Export PDF
   - [ ] Export CSV
   - [ ] AI summary generation

5. **Settings:**
   - [ ] Update church profile
   - [ ] Manage users
   - [ ] Update Stripe Connect
   - [ ] **Verify NO email settings tab**

6. **Navigation:**
   - [ ] Sidebar doesn't show Communication link
   - [ ] Dashboard loads correctly
   - [ ] All menu items work

7. **Webhooks:**
   - [ ] Clerk organization creation
   - [ ] Stripe subscription update
   - [ ] Donation webhook
   - [ ] **Verify NO email quota created**

8. **Cron Jobs:**
   - [ ] Subscription expiry check runs
   - [ ] Donation cleanup runs
   - [ ] **Verify email crons NOT in Vercel dashboard**

### 6.4 Error Monitoring

**After deployment, monitor for:**
- 404 errors on `/communication/*` routes (expected, can redirect to dashboard)
- TypeScript errors in production logs
- Prisma query errors related to deleted models
- Webhook failures
- Missing translation key errors

### 6.5 PostHog Analytics Cleanup

**File to MODIFY:**
- `/hooks/use-posthog.ts`

**Remove method:**
```typescript
// DELETE:
const trackEmailCampaign = (action: 'created' | 'sent' | 'scheduled', recipientCount?: number) => {
  trackEvent(`email_campaign_${action}`, {
    recipient_count: recipientCount,
  })
}

// DELETE from return statement:
trackEmailCampaign,
```

### 6.6 Rollback Plan

**If critical issues found:**

1. **Code Rollback:**
   ```bash
   git revert <removal-commit-hash>
   git push
   ```

2. **Database Rollback:**
   ```bash
   # Restore from backup
   psql "$DIRECT_URL" < backups/pre-removal-YYYYMMDD.sql

   # OR re-run original migration
   DATABASE_URL="$DIRECT_URL" npx prisma migrate dev --name restore_email_communication_tables
   ```

3. **Vercel Rollback:**
   - Revert to previous deployment in Vercel dashboard
   - Re-enable cron jobs if needed

---

## DEPLOYMENT SEQUENCE

### Recommended Order:

**Day 1: Preparation**
1. ✅ Create full database backup
2. ✅ Audit production data (campaigns, scheduled emails)
3. ✅ Document any active email campaigns
4. ✅ Notify stakeholders of feature removal

**Day 2: Development Environment**
1. ✅ Create feature branch: `feat/remove-communication-feature`
2. ✅ Apply all code changes (Phases 2-5)
3. ✅ Run migration in dev database
4. ✅ Test all core features
5. ✅ Commit changes with detailed message

**Day 3: Staging/Preview Deploy**
1. ✅ Push branch to GitHub
2. ✅ Create preview deployment in Vercel
3. ✅ Run full test suite
4. ✅ Verify no errors in logs
5. ✅ Check bundle size reduction

**Day 4: Production Deploy**
1. ✅ Merge to main branch
2. ✅ Monitor deployment
3. ✅ Verify cron jobs removed in Vercel
4. ✅ Run smoke tests on production
5. ✅ Monitor error tracking for 24 hours

**Day 5: Cleanup**
1. ✅ Remove Resend webhook endpoint
2. ✅ Archive documentation
3. ✅ Update CLAUDE.md to remove references
4. ✅ Create implementation summary document

---

## RISK ASSESSMENT BY PHASE

| Phase | Risk Level | Impact if Failed | Rollback Complexity |
|-------|-----------|------------------|---------------------|
| Phase 1: Preparation | LOW | None | N/A |
| Phase 2: Frontend | LOW | Broken UI | Easy (git revert) |
| Phase 3: Backend | MEDIUM | 500 errors | Medium (redeploy) |
| Phase 4: Database | HIGH | Data loss | Hard (restore backup) |
| Phase 5: Dependencies | LOW | Build errors | Easy (reinstall) |
| Phase 6: Testing | LOW | None | N/A |

---

## COMPLETE FILE CHECKLIST

### DELETE Entire Files (54+ files):

**Frontend Pages (18):**
- [ ] `/app/(dashboard)/communication/page.tsx`
- [ ] `/app/(dashboard)/communication/layout.tsx`
- [ ] `/app/(dashboard)/communication/[id]/page.tsx`
- [ ] `/app/(dashboard)/communication/[id]/edit/page.tsx`
- [ ] `/app/(dashboard)/communication/[id]/edit/edit-campaign-form.tsx`
- [ ] `/app/(dashboard)/communication/new/page.tsx`
- [ ] `/app/(dashboard)/communication/new/details/page.tsx`
- [ ] `/app/(dashboard)/communication/new/details/campaign-header.tsx`
- [ ] `/app/(dashboard)/communication/new/details/campaign-details-form.tsx`
- [ ] `/app/(dashboard)/communication/new/editor/page.tsx`
- [ ] `/app/(dashboard)/communication/new/editor/editor-page-client.tsx`
- [ ] `/app/(dashboard)/communication/new/editor/email-editor-wrapper.tsx`
- [ ] `/app/(dashboard)/communication/new/recipients/page.tsx`
- [ ] `/app/(dashboard)/communication/new/recipients/recipients-page-client.tsx`
- [ ] `/app/(dashboard)/communication/new/recipients/recipients-selector.tsx`
- [ ] `/app/(dashboard)/communication/new/review/page.tsx`
- [ ] `/app/(dashboard)/communication/new/review/review-page-client.tsx`
- [ ] `/app/(dashboard)/communication/new/review/review-and-send.tsx`

**Frontend Components (7):**
- [ ] `/components/communication/ai-suggestions-dialog.tsx`
- [ ] `/components/communication/campaign-progress.tsx`
- [ ] `/components/communication/campaign-success-animation.tsx`
- [ ] `/components/communication/email-preview-dialog.tsx`
- [ ] `/components/communication/schedule-dialog.tsx`
- [ ] `/components/communication/schedule-dialog-v2.tsx`
- [ ] `/components/communication/send-confirm-dialog.tsx`

**Public Pages (2):**
- [ ] `/app/unsubscribe/page.tsx`
- [ ] `/app/unsubscribe/unsubscribe-content.tsx`

**Backend API (11):**
- [ ] `/app/api/communication/campaigns/route.ts`
- [ ] `/app/api/communication/campaigns/[id]/route.ts`
- [ ] `/app/api/communication/campaigns/[id]/send/route.ts`
- [ ] `/app/api/communication/quota/route.ts`
- [ ] `/app/api/communication/settings/route.ts`
- [ ] `/app/api/communication/test-email/route.ts`
- [ ] `/app/api/communication/unsubscribe/route.ts`
- [ ] `/app/api/communication/resubscribe/route.ts`
- [ ] `/app/api/ai/generate-email-suggestions/route.ts`
- [ ] `/app/api/cron/send-scheduled-campaigns/route.ts`
- [ ] `/app/api/cron/reset-email-quotas/route.ts`

**Webhooks (1):**
- [ ] `/app/api/webhooks/resend/route.ts`

**Services (2):**
- [ ] `/lib/topol-config.ts`
- [ ] `/app/api/members/with-email-preferences/route.ts`

**Translations (2):**
- [ ] `/locales/en/communication.json`
- [ ] `/locales/es/communication.json`

**Documentation (6+):**
- [ ] `/docs/future/EMAIL_CAMPAIGN_RETRY_V2.md`
- [ ] `/documentation/implementation plans/communication-schema-design.md`
- [ ] `/documentation/implementation plans/communication-implementation-plan.md`
- [ ] `/documentation/implementation plans/update-quota-to-campaigns.md`
- [ ] `/documentation/implementation plans/quota-implementation-notes.md`
- [ ] `/documentation/docs/email-subdomain-setup.md`

---

### MODIFY Files (15 files):

**High Priority:**
- [ ] `/prisma/schema.prisma` - Remove 5 models, 2 enums, relations
- [ ] `/app/api/clerk-webhook/route.ts` - Remove EmailQuota creation (lines 208-222)
- [ ] `/app/api/webhooks/stripe/route.ts` - Remove quota updates (lines 887-921)
- [ ] `/lib/email/resend-service.ts` - Remove campaign methods, keep transactional
- [ ] `/lib/subscription-helpers.ts` - Remove getQuotaLimit function
- [ ] `/middleware.ts` - Remove unsubscribe routes from public matcher
- [ ] `/vercel.json` - Remove 2 cron jobs

**Medium Priority:**
- [ ] `/lib/i18n.ts` - Remove communication namespace imports
- [ ] `/lib/env.ts` - Remove email campaign env vars
- [ ] `/.env.example` - Remove campaign-specific vars
- [ ] `/components/layout/enhanced-sidebar.tsx` - Delete commented communication link
- [ ] `/hooks/use-posthog.ts` - Remove trackEmailCampaign method

**Low Priority:**
- [ ] `/components/landing/simple-features.tsx` - Remove email campaigns feature
- [ ] `/app/api/members/route.ts` - Remove EmailPreference includes
- [ ] `/app/api/members/[memberId]/route.ts` - Remove EmailPreference includes

---

## SUCCESS CRITERIA

The removal is complete and successful when:

- [ ] All 54+ communication files deleted
- [ ] All 15 files modified correctly
- [ ] Prisma schema has no email models
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run build` succeeds
- [ ] `npx prisma migrate status` shows no drift
- [ ] All 8 core features tested and working
- [ ] No email-related cron jobs in Vercel
- [ ] Production database has no Email* tables
- [ ] Donation receipts still send successfully
- [ ] No console errors on dashboard load
- [ ] Navigation sidebar clean (no communication link)
- [ ] Landing page updated (no email feature)
- [ ] PostHog tracking updated
- [ ] Vercel bundle size reduced
- [ ] No 500 errors in production logs (first 48 hours)

---

## ESTIMATED IMPACT

**Bundle Size:**
- Remove ~30KB from email editor libraries
- Remove ~15KB from Topol.io integration
- Estimated total reduction: 45-50KB gzipped

**Database:**
- Remove 5 tables
- Remove 2 enums
- Remove ~10-15 indexes
- Free up storage (depends on campaign data volume)

**Code Complexity:**
- Remove ~3,500 lines of code
- Simplify church creation logic
- Simplify subscription webhook logic
- Reduce API surface area (11 endpoints removed)

**Developer Experience:**
- Fewer models to understand
- Simpler schema
- Reduced test surface
- Fewer dependencies to update

---

## FINAL NOTES

1. **Communication is key:** Notify any users who actively use email campaigns before removal
2. **Backup everything:** Cannot stress enough - backup before migration
3. **Monitor closely:** Watch error logs for 48 hours post-deployment
4. **Document reasons:** Keep this plan for future reference if feature is ever re-added
5. **Consider alternatives:** If users need email, recommend MailChimp/Constant Contact integration in future

**Estimated Total Time:**
- Development: 4-6 hours
- Testing: 2-3 hours
- Deployment: 1 hour
- Monitoring: 2 hours
- **Total: 9-12 hours** over 5 days

---

## EDGE CASES & CONSIDERATIONS

### 1. Existing Campaign Data in Production
**Question:** What happens to existing email campaigns, recipients, and preferences?

**Answer:** Data will be deleted when migration runs. Ensure:
- Backup is created before migration
- Stakeholders are notified
- No critical campaigns are scheduled
- Consider exporting data for historical records

### 2. Member Email Preferences
**Question:** Should we keep email preferences for future features?

**Answer:** Current plan removes EmailPreference table. If you want to keep, don't drop table in migration.

### 3. Transactional Emails (Donation Receipts)
**Question:** Will donation receipts still work?

**Answer:** YES - Donation receipts use different code path:
- They use `sendEmail()` method (kept in resend-service.ts)
- They don't use campaigns, quotas, or bulk sending
- Resend API key still configured
- Email templates still exist in `/lib/email/templates/`

### 4. Unsubscribe Links in Old Emails
**Question:** What happens if someone clicks unsubscribe link from old campaign?

**Answer:** Link will 404. Consider creating minimal redirect page or generic "Feature Removed" landing page.

### 5. AI Service Usage
**Question:** Does AI service have other uses?

**Answer:** Yes, AI service is used for:
- Report summaries (`generateReportSummary`)
- Follow-up questions (`generateFollowUpSummary`)
- **Email suggestions (`generateEmailSuggestions`)** - REMOVE ONLY THIS

### 6. DOMPurify Usage
**Question:** Is DOMPurify used elsewhere?

**Answer:** Check usage before removing. If used for user input validation elsewhere, KEEP the package.

### 7. Database Migration in Production
**Question:** How to minimize downtime?

**Answer:**
- Migration is fast (dropping tables is quick)
- Estimated downtime: < 30 seconds
- Schedule during low-traffic period
- Consider maintenance mode if critical

---

This implementation plan provides a comprehensive, step-by-step guide to safely remove all newsletter/communication functionality from AltarFlow while preserving core features like donation receipts and member management.
