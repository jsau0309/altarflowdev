# Post-Merge Deployment Checklist
## PR #26: Security Fixes + Custom Categories System

**Branch:** `claude/custom-categories-donations-tags-011CUyAC363AHgF4Z26sAcWS`
**Target:** `main`
**Environment:** Production (with live users)

---

## ⚠️ Pre-Merge Verification

### 1. Code Review Completion
- [ ] Codex code review bot has completed its review
- [ ] All critical/blocking issues resolved
- [ ] Security vulnerabilities confirmed fixed
- [ ] No merge conflicts with `main`

### 2. Test Deployment Status
- [ ] Confirm all tests pass on the PR branch
- [ ] TypeScript compilation successful: `npx tsc --noEmit`
- [ ] Production build successful: `npm run build`
- [ ] No console errors in browser testing

---

## 🚀 Deployment Process (Zero-Downtime Strategy)

### Phase 1: Pre-Deployment (5 minutes before merge)

#### 1.1 Database Migration Check
```bash
# Verify migration status (should show "up to date" or list pending migrations)
npx prisma migrate status

# Expected migrations already applied:
# - 20251109230309_add_custom_categories_and_tags
# - 20251109235521_add_donation_payment_methods
# - 20251110175601_add_is_hidden_to_categories_and_payment_methods
```

**Action:** ✅ All migrations should already be applied to production database
- These migrations were deployed previously
- No new schema changes in this PR
- **NO DATABASE MIGRATIONS NEEDED** 🎉

#### 1.2 Backup Verification
```bash
# Verify Supabase automatic backups are enabled
# Check: Supabase Dashboard > Database > Backups
# Ensure: Daily backups enabled + point-in-time recovery available
```

- [ ] Confirm latest backup exists (within last 24 hours)
- [ ] Document backup timestamp: `_______________`

#### 1.3 Monitoring Setup
- [ ] Open Vercel deployment dashboard
- [ ] Open Supabase database metrics
- [ ] Have Sentry error tracking ready (once ALT-87 is done)
- [ ] Keep Clerk dashboard open for auth monitoring

---

### Phase 2: Merge & Deploy (Automatic via Vercel)

#### 2.1 Merge the PR
```bash
# Option 1: Via GitHub UI (recommended)
# - Click "Merge pull request" on PR #26
# - Select "Squash and merge" or "Create a merge commit"
# - Confirm merge

# Option 2: Via CLI
git checkout main
git pull origin main
git merge claude/custom-categories-donations-tags-011CUyAC363AHgF4Z26sAcWS
git push origin main
```

- [ ] PR merged successfully
- [ ] Vercel deployment triggered automatically

#### 2.2 Monitor Vercel Deployment
- [ ] Watch deployment progress: https://vercel.com/dashboard
- [ ] Expected duration: ~3-5 minutes
- [ ] Verify deployment status: "Ready"
- [ ] Note deployment URL: `_______________`

**Vercel Build Commands (automatic):**
```bash
# Vercel runs these automatically:
npm install
npx prisma generate  # Regenerate Prisma client
npm run build        # Build Next.js app
```

---

### Phase 3: Post-Deployment Data Seeding (CRITICAL!)

#### 3.1 Seed System Categories for Existing Churches

**Why needed:** New churches created via webhook get categories automatically, but existing churches need them seeded.

```bash
# IMPORTANT: Run this ONLY ONCE after merge
# This script is idempotent (safe to run multiple times)

# Step 1: SSH into production or use Vercel CLI
npx vercel env pull .env.production
export $(cat .env.production | xargs)

# Step 2: Run the seed script
npx tsx scripts/seed-system-categories.ts
```

**Expected Output:**
```
🌱 Starting seed process for system categories...

Found X churches to seed

Processing: Church Name (org_xxxxx)
  ✓ Created payment method: Cash
  ✓ Created payment method: Check
  ✓ Created payment method: Card
  ✓ Created payment method: Link
  ✓ Created payment method: Bank Transfer
  ✓ Created expense category: Utilities
  ✓ Created expense category: Salaries
  [... all 11 expense categories]

✅ Seed process completed!

Summary:
  Churches processed: X
  Payment methods created: Y
  Expense categories created: Z

🎉 Seed script finished successfully!
```

**What this script does:**
- Queries all existing churches from `Church` table
- For each church, creates 5 system payment methods (if not exists)
- For each church, creates 11 system expense categories (if not exists)
- Skips churches that already have these categories (idempotent)
- Uses unique constraint: `churchId_name` to prevent duplicates

**Categories Created:**

**Payment Methods (5):**
1. Cash (Green)
2. Check (Blue)
3. Card (Black)
4. Link (Black)
5. Bank Transfer (Amber)

**Expense Categories (11):**
1. Utilities (Red)
2. Salaries (Blue)
3. Maintenance (Orange)
4. Office Supplies (Green)
5. Ministry (Purple)
6. Building (Amber)
7. Events (Pink)
8. Technology (Cyan)
9. Transportation (Lime)
10. Insurance (Indigo)
11. Other (Gray)

- [ ] Script executed successfully
- [ ] No errors in script output
- [ ] Number of churches processed matches expected count
- [ ] Record total categories created: `_______________`

#### 3.2 Verify Seeded Data (Sample Check)

```bash
# Connect to production database (Supabase)
# Option 1: Supabase SQL Editor
# Option 2: Local connection with DATABASE_URL

# Query 1: Verify payment methods exist for a church
SELECT c.name as church_name, pm.name as payment_method, pm.color, pm.isSystemMethod
FROM "Church" c
LEFT JOIN "DonationPaymentMethod" pm ON pm."churchId" = c.id
WHERE c."clerkOrgId" = 'org_xxxxx' -- Replace with real org ID
ORDER BY pm.name;

# Expected: 5 rows (Cash, Check, Card, Link, Bank Transfer)

# Query 2: Verify expense categories exist for a church
SELECT c.name as church_name, ec.name as category, ec.color, ec.isSystemCategory
FROM "Church" c
LEFT JOIN "ExpenseCategory" ec ON ec."churchId" = c.id
WHERE c."clerkOrgId" = 'org_xxxxx' -- Replace with real org ID
ORDER BY ec.name;

# Expected: 11 rows (all system categories)
```

- [ ] Sample church has all 5 payment methods
- [ ] Sample church has all 11 expense categories
- [ ] Colors are correctly assigned
- [ ] `isSystemMethod` = true for all payment methods
- [ ] `isSystemCategory` = true for all expense categories
- [ ] `isDeletable` = false for all system categories

---

### Phase 4: User-Facing Validation (5-10 minutes)

#### 4.1 Test Critical User Flows

**Test Church Account:** Use a real production church or create a test org

**Flow 1: Donations Page**
- [ ] Navigate to `/donations`
- [ ] Verify donation types dropdown loads
- [ ] Verify payment methods dropdown loads
- [ ] Create a test donation with custom category
- [ ] Verify receipt displays correct amount (ALT-82 fix)
- [ ] Check receipt readability improvements

**Flow 2: Expenses Page**
- [ ] Navigate to `/expenses`
- [ ] Verify expense categories dropdown loads
- [ ] Filter by category works
- [ ] Create a test expense with receipt upload
- [ ] Verify category color coding

**Flow 3: Settings - Categories & Tags**
- [ ] Navigate to `/settings` → Categories & Tags tab
- [ ] Verify all tabs visible: Donation Types, Payment Methods, Expense Categories, Tags
- [ ] Test creating a custom donation type
- [ ] Test editing an existing category
- [ ] Test hiding a category (toggle `isHidden`)
- [ ] Verify system categories cannot be deleted
- [ ] Test bilingual search (English/Spanish)

**Flow 4: Financial Reports**
- [ ] Navigate to `/reports` → Financial Analysis tab
- [ ] Verify Growth Metrics Cards render:
  - Net Income
  - Net Income Growth Rate
  - Donation Growth Rate
  - Operating Expenses
- [ ] Verify Revenue vs Expenses Chart loads (12-month trend)
- [ ] Verify Payout Summary Section displays recent payouts
- [ ] Check dark mode rendering for charts
- [ ] Verify export button is hidden on Financial Analysis tab
- [ ] Test date range picker (verify no race conditions)

**Flow 5: Security Validation**
- [ ] Test date range with invalid dates (should reject)
- [ ] Test accessing another org's data (should return 403)
- [ ] Verify no NaN/Infinity in financial calculations
- [ ] Check browser console for errors (should be none)

#### 4.2 Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

#### 4.3 Performance Check
- [ ] Page load time < 3 seconds (Financial Analysis)
- [ ] No memory leaks when changing date ranges rapidly
- [ ] Charts render smoothly
- [ ] No console errors in production build

---

### Phase 5: Monitoring & Rollback Plan (24 hours)

#### 5.1 Monitoring Checklist (First 4 hours)

**Hour 1: Intensive Monitoring**
- [ ] Check Vercel error rate (should be near 0%)
- [ ] Monitor API response times (should be < 500ms)
- [ ] Watch Supabase connection pool (should be stable)
- [ ] Check Clerk authentication (should be normal)

**Hour 2-4: Periodic Checks**
- [ ] No increase in error rates
- [ ] No user complaints or support tickets
- [ ] Database query performance stable
- [ ] No memory leaks or crashes

#### 5.2 Error Detection

**Watch for:**
- TypeScript errors in Vercel logs
- Database connection timeouts
- "Cannot read property X of undefined" errors
- 403/401 authentication errors
- NaN/Infinity in financial calculations
- Race condition bugs (multiple rapid requests)

**Tools:**
- Vercel Logs: https://vercel.com/dashboard/deployments
- Supabase Logs: https://supabase.com/dashboard/project/_/logs
- Browser DevTools: Console errors

#### 5.3 Rollback Plan (If Critical Issues Found)

**Trigger Rollback If:**
- 10+ users report critical bugs
- Error rate > 5% for any endpoint
- Database corruption detected
- Authentication completely broken
- Financial calculations showing incorrect data

**Rollback Steps:**
```bash
# Option 1: Instant Rollback via Vercel UI
# 1. Go to Vercel Dashboard > Deployments
# 2. Find previous successful deployment (before this PR)
# 3. Click "..." → "Promote to Production"
# 4. Confirm rollback

# Option 2: Rollback via Git
git checkout main
git revert HEAD --no-commit  # Revert the merge commit
git commit -m "Rollback: Revert PR #26 due to [REASON]"
git push origin main
# Vercel will auto-deploy the rollback
```

**After Rollback:**
- [ ] Notify team in Slack/Discord
- [ ] Document the issue that caused rollback
- [ ] Create hotfix branch to address issues
- [ ] Test hotfix thoroughly before re-deploying

---

## 📊 Post-Deployment Metrics (24 hours)

### Success Criteria

**Performance:**
- [ ] API response times remain < 500ms (p95)
- [ ] Page load time < 3 seconds for Financial Analysis
- [ ] Database query count within normal range
- [ ] No memory leaks detected

**Functionality:**
- [ ] 0 critical bugs reported
- [ ] All CRUD operations working (Create, Read, Update, Delete)
- [ ] Financial calculations accurate (no NaN/Infinity)
- [ ] Categories seeded for all churches

**Security:**
- [ ] 0 security vulnerabilities in production
- [ ] No cross-tenant data leakage incidents
- [ ] No SQL injection attempts successful
- [ ] No prototype pollution exploits

**User Experience:**
- [ ] No user complaints about broken features
- [ ] Positive feedback on new Financial Analysis tab
- [ ] Settings page usable and intuitive
- [ ] Bilingual support working correctly

---

## 🔧 Troubleshooting Guide

### Issue: Seed Script Fails

**Symptoms:**
```
❌ Error during seed process: P2002: Unique constraint failed
```

**Solution:**
- This is expected if categories already exist
- Script is idempotent - safe to re-run
- Check logs to see which churches succeeded
- Manually verify problematic churches

### Issue: Categories Not Showing in Dropdown

**Symptoms:** Dropdowns empty or missing categories

**Diagnosis:**
```sql
-- Check if categories exist for church
SELECT * FROM "DonationPaymentMethod" WHERE "churchId" = 'xxx';
SELECT * FROM "ExpenseCategory" WHERE "churchId" = 'xxx';
```

**Solution:**
```bash
# Re-run seed script for specific church
# Or create categories manually via Settings UI
```

### Issue: Financial Analysis Showing NaN

**Symptoms:** Growth metrics display "NaN" or "Infinity"

**Diagnosis:** Check browser console for division by zero errors

**Solution:**
- Fixed in this PR with EPSILON constant
- If still occurring, check date range for invalid data
- Verify previous period has data to compare against

### Issue: "Organization Mismatch" 403 Errors

**Symptoms:** Users getting 403 errors when accessing their own data

**Diagnosis:** Check Clerk session and organization ID

**Solution:**
- Verify user is in correct organization
- Check `orgId` matches `churchId` in request
- Clear Clerk cache: `localStorage.clear()` in browser

### Issue: Race Condition / Stale Data

**Symptoms:** Changing date range shows old data briefly

**Diagnosis:** Check if AbortController is working

**Solution:**
- Fixed in this PR with AbortController
- If still occurring, check browser console for "AbortError"
- Verify fetch requests are being cancelled properly

---

## 📝 Deployment Completion Checklist

### Final Sign-Off

- [ ] All tests passed
- [ ] Seed script executed successfully
- [ ] Sample validation completed
- [ ] No critical errors in first 4 hours
- [ ] Monitoring dashboards showing green
- [ ] Team notified of successful deployment
- [ ] Documentation updated (if needed)

### Communication

- [ ] Notify team in Slack/Discord: "PR #26 deployed successfully ✅"
- [ ] Update Linear issue ALT-83: "Deployed to Production"
- [ ] Close any related support tickets
- [ ] Announce new features to users (optional)

### Next Steps

- [ ] Monitor for 24-48 hours
- [ ] Gather user feedback on new features
- [ ] Plan next sprint work (ALT-87: Pino + Sentry)
- [ ] Document any lessons learned

---

## 🎯 Quick Reference

**Critical Commands:**
```bash
# Check migration status
npx prisma migrate status

# Run seed script (ONE TIME ONLY)
npx tsx scripts/seed-system-categories.ts

# Check production logs
npx vercel logs --production

# Rollback deployment
# Via UI: Vercel Dashboard → Previous Deployment → Promote
```

**Key URLs:**
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- GitHub PR: https://github.com/jsau0309/altarflowdev/pull/26
- Linear Issues: https://linear.app/altarflow/team/ALT

---

## 📚 Related Documentation

- `docs/PREVENT_SCHEMA_DRIFT.md` - Prisma migration workflow
- `docs/PRISMA_PRODUCTION_WORKFLOW.md` - Production deployment guide
- `scripts/seed-system-categories.ts` - Seed script source code
- `CLAUDE.md` - Project overview and development guide

---

**Prepared by:** Claude Code
**Date:** 2025-11-14
**PR:** #26
**Linear Issues:** ALT-83, ALT-82, ALT-87

🤖 Generated with [Claude Code](https://claude.com/claude-code)
