# Prisma Schema Drift Analysis & Solution

## Problem Statement

**User Frustration**: "It is extremely frustrated to me that we being able to manage prisma migration on the 2 db we have one for porduction and one for development. We try everything and we always had ths issues. Im scare that one deployment will wiped out the information we currently have on our production db."

**Recurring Issue**: Every new feature branch requires resetting the development database, but schema drift keeps appearing during development.

## Current State (2025-11-07)

### Production Database (`uhoovjoeitxecfcbzndj.supabase.co`)
- ✅ **63 applied migrations** in `_prisma_migrations` table
- ✅ **No drift detected**
- ✅ **Clean migration history**
- ⏳ **Waiting for 2 new migrations** from `improvment/11042025` branch:
  1. `20251107205730_add_donor_language_to_transactions`
  2. `20251107211635_add_donor_language_index`

### Development Database (`qdoyonfjxwqefvsfjchx.supabase.co`)
- ⚠️ **Schema drift detected**
- ⚠️ **1 pending migration** not applied
- ⚠️ **Database has changes not in migration history**:
  - Added `donorLanguage` column to `DonationTransaction`
  - Added various indexes

## Root Cause Analysis

### Why Does Drift Keep Happening?

Based on the evidence from this session, here's what's happening:

1. **At Start of Branch**: User runs `npx prisma migrate reset`
   - This drops the entire dev database
   - Reapplies all migrations from scratch
   - Dev database is now clean and in sync

2. **During Development**: Schema changes are made
   - **Problem**: Sometimes changes are applied using `npx prisma db push`
   - **Problem**: OR schema is modified and `npx prisma generate` is run without creating migration
   - **Problem**: OR database is modified directly via SQL
   - These methods apply changes to database BUT don't create migration files

3. **When Creating Migration**: `npx prisma migrate dev` detects drift
   - Database has changes that aren't in migration history
   - Migration system refuses to proceed
   - User is stuck

### Specific Example from This Session

In this branch (`improvment/11042025`):

1. ✅ **Correct**: Created migration `20251107205730_add_donor_language_to_transactions`
   ```sql
   ALTER TABLE "DonationTransaction" ADD COLUMN "donorLanguage" TEXT DEFAULT 'en';
   ```

2. ✅ **Correct**: Created migration `20251107211635_add_donor_language_index`
   ```sql
   CREATE INDEX "DonationTransaction_donorLanguage_idx" ON "DonationTransaction"("donorLanguage");
   ```

3. ⚠️ **BUT**: When running `npx prisma migrate status`, it shows:
   ```
   Database schema is not in sync with migration history.
   [*] Changed the `DonationTransaction` table
     [+] Added column `donorLanguage`
   ```

This means the column was added to the database BEFORE the migration was applied.

## The Two-Database System Explained

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRISMA SCHEMA FILE                      │
│              prisma/schema.prisma (Git tracked)             │
│                    ▲ SOURCE OF TRUTH ▲                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ migrations created from
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │  DEV DATABASE       │   │  PROD DATABASE      │
    │  (qdoyon...)        │   │  (uhoovj...)        │
    │                     │   │                     │
    │  - Test changes     │   │  - Real user data   │
    │  - Safe to reset    │   │  - NEVER reset      │
    │  - Can drift        │   │  - Must stay clean  │
    └─────────────────────┘   └─────────────────────┘
             │                           │
             │ migrate dev               │ migrate deploy
             │ (create & apply)          │ (apply only)
             │                           │
             ▼                           ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │  MIGRATION FILES    │   │  MIGRATION FILES    │
    │  (Git tracked)      │   │  (Git tracked)      │
    └─────────────────────┘   └─────────────────────┘
```

### Key Principles

1. **Prisma Schema = Source of Truth**
   - All changes start in `prisma/schema.prisma`
   - Git tracked, reviewed in PRs
   - Single source of truth for both databases

2. **Development Database = Testing Ground**
   - Can be reset, wiped, rebuilt
   - Used to test migrations before production
   - Okay to have drift temporarily during development

3. **Production Database = Sacred**
   - Real user data, NEVER wiped
   - Only receives migrations via `npx prisma migrate deploy`
   - Must always be clean, no drift allowed

4. **Migration Files = Bridge**
   - Git tracked SQL files
   - Created in dev, applied in prod
   - Version control for database changes

## The Correct Workflow (Step by Step)

### Starting a New Feature Branch

```bash
# 1. Create feature branch
git checkout -b feature/my-new-feature

# 2. Check current migration status
npx prisma migrate status

# 3. If dev database is out of sync, reset it
npx prisma migrate reset
# ⚠️ This is SAFE for dev database, NEVER run on production

# 4. Your dev database now matches production migration history
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# Add your new field/model

# 2. Create AND apply migration in one step
npx prisma migrate dev --name descriptive_name

# This does 3 things:
# a) Creates migration SQL file in prisma/migrations/
# b) Applies migration to dev database
# c) Regenerates Prisma Client

# 3. Test your changes
npm run dev

# 4. Commit BOTH schema and migration
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Add new field"
```

### ❌ NEVER Do These

```bash
# ❌ DON'T: Apply schema changes without creating migration
npx prisma db push
# This applies changes to DB but doesn't create migration files
# Causes drift because production won't get these changes

# ❌ DON'T: Generate client before creating migration
npx prisma generate
# If schema changed but no migration exists, this causes drift

# ❌ DON'T: Modify database directly via SQL
psql $DATABASE_URL -c "ALTER TABLE ..."
# Bypasses migration system entirely

# ❌ DON'T: Use migrate deploy in development
npx prisma migrate deploy
# This is for production only, doesn't create new migrations
```

### ✅ ALWAYS Do These

```bash
# ✅ DO: Create migration for every schema change
npx prisma migrate dev --name add_field_name

# ✅ DO: Commit schema + migration together
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Add field"

# ✅ DO: Check migration status before pushing
npx prisma migrate status

# ✅ DO: Use direct URL if pooler times out
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

## How Deployment Works (Production Safety)

### Local Development → Production Flow

```
1. Developer (You)
   └─> Modify prisma/schema.prisma
   └─> Run: npx prisma migrate dev --name my_change
       ├─> Creates: prisma/migrations/TIMESTAMP_my_change/migration.sql
       ├─> Applies to: Dev database
       └─> Regenerates: Prisma Client
   └─> Commit: schema.prisma + migration files
   └─> Push to GitHub

2. GitHub PR Merge
   └─> Code merged to main branch
   └─> Triggers: Vercel deployment

3. Vercel Deployment (Automatic)
   └─> Runs: npx prisma migrate deploy
       ├─> Reads: _prisma_migrations table in prod DB
       ├─> Finds: Migrations not yet applied
       ├─> Applies: Only new migrations in order
       └─> Updates: _prisma_migrations table
   └─> Runs: npx prisma generate
   └─> Runs: npm run build
   └─> Deploys: New version to production

4. Production Database
   └─> Receives: Only new migrations
   └─> No risk: Existing data preserved
   └─> No drift: Migration history stays clean
```

### Why This Is Safe

1. **Migrations are incremental**: Only new migrations are applied, never re-applies old ones
2. **Order is guaranteed**: `_prisma_migrations` table tracks what's been applied
3. **No data loss**: Migrations are additive (ADD COLUMN, CREATE INDEX, etc.)
4. **Rollback available**: Can revert code deploy, database changes are minimal
5. **Git tracked**: All changes are reviewed in PR before production

### Example: This Branch's Deployment

**Current Production State**:
- Has 63 migrations applied
- Missing 2 new migrations from this branch

**When PR #24 Merges to Main**:
```
Vercel runs: npx prisma migrate deploy

Checks _prisma_migrations table:
✅ Migration 1-63: Already applied, skip
⏳ Migration 64 (20251107205730_add_donor_language_to_transactions): NEW, apply
⏳ Migration 65 (20251107211635_add_donor_language_index): NEW, apply

Result:
✅ Production now has 65 migrations
✅ donorLanguage column exists
✅ donorLanguage index exists
✅ All existing data preserved
✅ No drift
```

**What Won't Happen** (Your Fears Addressed):
- ❌ Won't drop existing tables
- ❌ Won't delete existing data
- ❌ Won't reset the database
- ❌ Won't re-apply old migrations
- ❌ Won't cause downtime

## Fixing Current Drift Issue

### Option 1: Reset Dev Database (Recommended)

This is the cleanest solution when you have drift:

```bash
# Use direct URL to avoid pooler timeout
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# This will:
# 1. Drop all tables
# 2. Reapply all migrations from scratch
# 3. Run seed script (if configured)
# 4. Regenerate Prisma Client
```

**When to use**: Anytime dev database is out of sync

**Why it's safe**: Dev database has no real user data

### Option 2: Mark Migration as Applied (If Reset Fails)

If pooler keeps timing out:

```bash
# Use direct URL
DATABASE_URL="$DIRECT_URL" npx prisma migrate resolve --applied "20251107211635_add_donor_language_index"

# This tells Prisma: "I manually applied this migration"
# Only use if you're certain the changes are already in the database
```

**When to use**: When drift exists but changes are correct

**Risk**: Can cause issues if changes aren't actually applied

### Option 3: Create Baseline Migration (For Major Drift)

If drift is extensive:

```bash
# 1. Create a migration that matches current database state
npx prisma migrate dev --name baseline_existing_changes --create-only

# 2. Edit the generated migration.sql to be empty (changes already applied)
echo "-- Baseline migration - changes already in database" > prisma/migrations/TIMESTAMP_baseline/migration.sql

# 3. Mark it as applied
npx prisma migrate resolve --applied "TIMESTAMP_baseline_existing_changes"
```

**When to use**: When drift is too complex to untangle

**Why it works**: Tells Prisma the database is correct as-is

## Prevention Strategy (Going Forward)

### 1. Update CLAUDE.md with Strict Rules

Add to `/docs/CLAUDE.md`:

```markdown
## 🚨 CRITICAL: Prisma Migration Rules

**NEVER:**
- Use `npx prisma db push` (except rapid prototyping, then reset after)
- Modify database directly via SQL
- Run `npx prisma generate` after schema change without creating migration
- Apply migrations manually via psql

**ALWAYS:**
- Use `npx prisma migrate dev --name descriptive_name` for ALL schema changes
- Commit schema.prisma + migration files together
- Run `npx prisma migrate status` before pushing to GitHub
- Use direct URL if pooler times out: `DATABASE_URL="$DIRECT_URL"`
```

### 2. Add Pre-Commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for schema changes without migrations
if git diff --cached --name-only | grep -q "prisma/schema.prisma"; then
  if ! git diff --cached --name-only | grep -q "prisma/migrations/"; then
    echo "⚠️  WARNING: schema.prisma changed but no migration files added!"
    echo "Did you run 'npx prisma migrate dev'?"
    exit 1
  fi
fi
```

### 3. Establish Migration Checklist

Before every PR merge:

```markdown
- [ ] Schema changes have corresponding migrations
- [ ] Ran `npx prisma migrate status` locally
- [ ] No drift detected in dev database
- [ ] Both schema.prisma AND migration files committed
- [ ] Migration tested locally
- [ ] TypeScript compiles without errors
```

### 4. Use Direct URL for Migrations

Update `.env.local` to prefer direct connections:

```bash
# For migrations, use direct URL to avoid pooler issues
MIGRATION_DATABASE_URL="${DIRECT_URL}"
```

Then use:
```bash
DATABASE_URL="$MIGRATION_DATABASE_URL" npx prisma migrate dev
```

## Common Drift Scenarios & Solutions

### Scenario 1: "I ran prisma generate before creating migration"

**What happened**: Schema changed, client regenerated, but no migration created

**Fix**:
```bash
# Create migration for the schema change
npx prisma migrate dev --name add_missing_field
```

### Scenario 2: "I used db push during development"

**What happened**: Changes applied to DB but no migration file created

**Fix**:
```bash
# Reset dev database to clean state
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# Then create proper migration
npx prisma migrate dev --name proper_migration_name
```

### Scenario 3: "Pooler keeps timing out"

**What happened**: Supabase pooler has connection limits

**Fix**:
```bash
# Always use direct URL for migrations
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

### Scenario 4: "Production deployment failed due to migration error"

**What happened**: Migration SQL has error or conflict

**Fix**:
```bash
# 1. Fix migration SQL locally
edit prisma/migrations/TIMESTAMP_name/migration.sql

# 2. Test on dev database
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# 3. If works, commit fix and redeploy
git add prisma/migrations/
git commit -m "fix: Correct migration SQL"
git push
```

## Monitoring & Verification

### Check Migration Status

```bash
# Development
npx prisma migrate status

# Production (via Vercel logs)
# Look for "prisma migrate deploy" output in deployment logs
```

### Verify Production Migrations

```bash
# Query production _prisma_migrations table
# (Do this via Supabase dashboard, not locally)

SELECT migration_name, finished_at, applied_steps_count
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 10;
```

### Expected Output (After ALT-78 Deploys)

```
migration_name                                    | finished_at          | applied_steps_count
--------------------------------------------------|----------------------|--------------------
20251107211635_add_donor_language_index           | 2025-11-07 22:XX:XX  | 1
20251107205730_add_donor_language_to_transactions | 2025-11-07 22:XX:XX  | 1
(... 63 previous migrations ...)
```

## Summary & Action Items

### Immediate Actions (To Fix Current Drift)

1. **Wait for PR #24 to deploy to production** ✅ Already merged
2. **Verify production deployment succeeded** (check Vercel logs)
3. **Fix dev database drift**:
   ```bash
   DATABASE_URL="$DIRECT_URL" npx prisma migrate reset
   ```

### Long-Term Prevention

1. **Update CLAUDE.md** with strict migration rules
2. **Add pre-commit hook** to catch schema changes without migrations
3. **Always use direct URL for migrations** to avoid pooler timeouts
4. **Never use `prisma db push`** except for throwaway prototyping
5. **Always commit schema + migrations together**

### Key Takeaway

**The problem isn't the two-database system** - it's the workflow during development.

**Root cause**: Using `prisma db push` or making schema changes without creating migrations causes dev database to get ahead of migration history.

**Solution**: ALWAYS use `npx prisma migrate dev` for schema changes, even during rapid iteration.

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
**Status**: Active - Preventing future drift issues
