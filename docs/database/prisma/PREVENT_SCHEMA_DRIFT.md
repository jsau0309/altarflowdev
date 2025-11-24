# How to Prevent Prisma Schema Drift

**Created**: 2025-11-07
**Last Incident**: Every new feature branch
**Status**: CRITICAL - Recurring Issue

---

## The Problem

Every time we start a new feature branch, we reset the development database. During development, schema drift appears again. This cycle is frustrating and wastes time.

**User Quote**: "It is extremely frustrated to me that we being able to manage prisma migration on the 2 db we have one for porduction and one for development. We try everything and we always had ths issues. Im scare that one deployment will wiped out the information we currently have on our production db."

---

## Root Cause

Schema drift happens when:
1. Database schema changes without creating migration files
2. Changes are applied to database BEFORE migrations are created
3. Using wrong Prisma commands during development

**The Pattern**:
- Start of branch: Reset dev database (clean state)
- During development: Make schema changes
- **Problem**: Changes applied to database without proper migrations
- Result: Database schema doesn't match migration history
- Result: Prisma detects drift and refuses to proceed

---

## The #1 Rule to Prevent Drift

### ✅ ALWAYS Use This Command

```bash
# For ANY schema change:
npx prisma migrate dev --name descriptive_name
```

This single command does 3 things correctly:
1. Creates migration SQL file
2. Applies migration to database
3. Regenerates Prisma Client

### ❌ NEVER Use These Commands

```bash
# ❌ DON'T: Apply changes without creating migration
npx prisma db push

# ❌ DON'T: Generate client after schema change without migration
npx prisma generate

# ❌ DON'T: Modify database via SQL manually
psql $DATABASE_URL -c "ALTER TABLE ..."
```

---

## The Correct Workflow (Step by Step)

### Starting a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Check migration status
npx prisma migrate status

# 3. If drift detected, reset dev database
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# 4. Start with clean slate
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# Add your new field/model

# 2. Create AND apply migration in ONE command
npx prisma migrate dev --name add_field_name

# This is the ONLY command you need!
# It creates migration + applies to DB + regenerates client

# 3. Test your changes
npm run dev

# 4. Commit BOTH schema and migration
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Add new field"
```

### Deploying to Production

```bash
# 1. Push to GitHub
git push origin feature/my-feature

# 2. Create PR and merge

# 3. Vercel automatically runs:
# npx prisma migrate deploy
# (Applies pending migrations to production)
```

---

## Why Drift Keeps Happening

### Scenario A: Using `prisma generate` After Schema Change

**What happens:**
```bash
# 1. You edit schema.prisma
# 2. You run: npx prisma generate  ❌ WRONG
# 3. Prisma Client regenerates with new field
# 4. TypeScript now expects new field
# 5. But NO migration was created
# 6. Database doesn't have new field yet
# 7. DRIFT DETECTED
```

**What you should have done:**
```bash
# 1. Edit schema.prisma
# 2. Run: npx prisma migrate dev --name add_field  ✅ CORRECT
# 3. Migration created + applied + client regenerated
# 4. Database matches schema
# 5. No drift
```

### Scenario B: Using `prisma db push`

**What happens:**
```bash
# 1. You edit schema.prisma
# 2. You run: npx prisma db push  ❌ WRONG
# 3. Schema changes applied to database
# 4. But NO migration files created
# 5. Production won't get these changes
# 6. Migration history is incomplete
# 7. DRIFT DETECTED
```

**What you should have done:**
```bash
# 1. Edit schema.prisma
# 2. Run: npx prisma migrate dev --name add_field  ✅ CORRECT
# 3. Migration file created in prisma/migrations/
# 4. Tracked in Git
# 5. Will deploy to production automatically
# 6. No drift
```

### Scenario C: Manual Database Changes

**What happens:**
```bash
# 1. You connect to database directly
# 2. Run: ALTER TABLE "Table" ADD COLUMN "field" TEXT;  ❌ WRONG
# 3. Database schema changed
# 4. But Prisma schema not updated
# 5. No migration created
# 6. Prisma doesn't know about change
# 7. DRIFT DETECTED
```

**What you should have done:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Run: npx prisma migrate dev --name add_field  ✅ CORRECT
# 3. Migration SQL auto-generated
# 4. Everything stays in sync
# 5. No drift
```

---

## How to Fix Drift When It Happens

### Quick Fix: Reset Development Database

This is ALWAYS safe for development database:

```bash
# Use direct URL to avoid pooler timeouts
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# This will:
# 1. Drop entire database
# 2. Recreate from scratch
# 3. Apply ALL migrations in order
# 4. Regenerate Prisma Client
# 5. Database now matches migration history perfectly
```

**When to use**: Anytime you have drift in development

**Why it's safe**: Development database has no real user data

### If Reset Keeps Failing (Pooler Timeout)

```bash
# Option 1: Use direct URL
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# Option 2: If that still fails, check .env.development
# Make sure DIRECT_URL is set correctly

# Option 3: Temporarily disable pooler
# In Supabase dashboard: Database → Connection Pooling → Pause
# Then run reset
# Then re-enable pooling
```

### Advanced: Create Baseline Migration

If reset won't work and you need to move forward:

```bash
# 1. Create baseline migration
npx prisma migrate dev --name baseline_drift_fix --create-only

# 2. Edit generated SQL to be empty
# The changes are already in database
echo "-- Baseline migration - changes already applied" > \
  prisma/migrations/TIMESTAMP_baseline_drift_fix/migration.sql

# 3. Mark as applied
npx prisma migrate resolve --applied "TIMESTAMP_baseline_drift_fix"

# 4. Check status
npx prisma migrate status
# Should now show: "Database schema is up to date!"
```

---

## Checklist: Before Every Schema Change

Print this and tape it to your monitor:

```
BEFORE CHANGING PRISMA SCHEMA:

[ ] I am editing prisma/schema.prisma
[ ] After editing, I will run: npx prisma migrate dev --name DESCRIPTIVE_NAME
[ ] I will NOT run: npx prisma db push
[ ] I will NOT run: npx prisma generate (by itself)
[ ] I will NOT modify database directly
[ ] I will commit schema + migrations together
[ ] I will check: npx prisma migrate status (should show "up to date")
```

---

## Production Safety

### Why Production Never Has Drift

Production is protected because:

1. **No direct access** - We never touch production database manually
2. **Only via deployments** - Changes only through Vercel `migrate deploy`
3. **Incremental migrations** - Only new migrations applied, never reset
4. **Git-tracked** - All migrations reviewed in PRs before deployment

### What Happens on Deployment

```
Your Local Development:
┌─────────────────────────┐
│ Edit schema.prisma      │
│ Run: migrate dev        │
│ Creates: migration SQL  │
│ Commit to Git          │
└─────────────────────────┘
            ↓
      Push to GitHub
            ↓
┌─────────────────────────┐
│ Vercel Deployment       │
│ Runs: migrate deploy    │
│ Checks: What migrations │
│         are new?        │
│ Applies: Only new ones  │
│ Result: Production DB   │
│         updated safely  │
└─────────────────────────┘
```

**Your fear**: "Im scare that one deployment will wiped out the information we currently have on our production db."

**Reality**: This CANNOT happen because:
- `migrate deploy` only applies NEW migrations
- It never drops tables unless migration explicitly says to
- It never resets the database
- It never re-applies old migrations
- All changes are incremental (ADD COLUMN, CREATE INDEX, etc.)

---

## Command Reference

### Daily Development Commands

```bash
# Check if database is in sync
npx prisma migrate status

# Create and apply migration (USE THIS FOR ALL SCHEMA CHANGES)
npx prisma migrate dev --name descriptive_name

# Reset dev database if drift occurs
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# View pending migrations
npx prisma migrate status
```

### Emergency Commands (Use Sparingly)

```bash
# Mark migration as applied (if you're SURE it's already in DB)
npx prisma migrate resolve --applied "migration_name"

# Mark migration as rolled back (if you manually reverted it)
npx prisma migrate resolve --rolled-back "migration_name"
```

### NEVER Use These in Development

```bash
# ❌ Applies changes but doesn't create migrations
npx prisma db push

# ❌ Only for production deployments
npx prisma migrate deploy
```

---

## Mental Model: The Three States

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  STATE 1: SCHEMA FILE (Source of Truth)         │
│  prisma/schema.prisma                            │
│                                                  │
│  This is what you edit when making changes       │
│                                                  │
└──────────────────────────────────────────────────┘
                      ↓
            npx prisma migrate dev
                      ↓
┌──────────────────────────────────────────────────┐
│                                                  │
│  STATE 2: MIGRATION FILES (Change History)      │
│  prisma/migrations/TIMESTAMP_name/migration.sql  │
│                                                  │
│  Auto-generated SQL that documents every change  │
│                                                  │
└──────────────────────────────────────────────────┘
                      ↓
            Applies SQL to database
                      ↓
┌──────────────────────────────────────────────────┐
│                                                  │
│  STATE 3: DATABASE SCHEMA (Current Reality)     │
│  PostgreSQL tables, columns, indexes             │
│                                                  │
│  The actual database structure                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Drift happens when**: State 3 doesn't match State 2

**Prisma checks**: "Does database match migration history?"

**Solution**: Always use `migrate dev` to keep all 3 states in sync

---

## Success Metrics

You'll know this is working when:

1. ✅ You can run `npx prisma migrate status` and always see "Database schema is up to date!"
2. ✅ You never see drift errors during development
3. ✅ Deployments to production always succeed
4. ✅ You don't need to reset dev database every feature
5. ✅ TypeScript compiles without Prisma-related errors

---

## Quick Troubleshooting

### "Migration failed to apply"

```bash
# Check the error message carefully
# Usually tells you exactly what's wrong

# Common fixes:
# - UUID type mismatch: Remove ::text cast
# - Column already exists: Migration already partially applied
# - Constraint violation: Need data migration first
```

### "Can't reach database server (P1001)"

```bash
# Pooler timeout
# Solution: Use direct URL
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

### "Migration already applied"

```bash
# Migration exists in _prisma_migrations but failed
# Solution: Remove failed migration record
# Then retry

# In Supabase SQL Editor:
DELETE FROM "_prisma_migrations"
WHERE migration_name = 'failed_migration_name';
```

### "Shadow database error"

```bash
# Prisma can't create shadow database
# Usually happens when using pooler

# Solution: Use direct URL
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

---

## The One Thing to Remember

**If you remember NOTHING else from this document, remember this:**

```
┌─────────────────────────────────────────────┐
│                                             │
│  For ANY Prisma schema change, ONLY use:   │
│                                             │
│  npx prisma migrate dev --name NAME        │
│                                             │
│  NEVER use db push, NEVER generate alone   │
│                                             │
└─────────────────────────────────────────────┘
```

This one command prevents 99% of schema drift issues.

---

**Last Updated**: 2025-11-07
**Next Review**: When drift happens again (hopefully never!)
