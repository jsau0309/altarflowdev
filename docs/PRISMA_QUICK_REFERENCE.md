# Prisma Quick Reference Card

**Print this and tape it to your monitor!**

---

## The ONE Command You Need

```bash
# For ANY schema change:
npx prisma migrate dev --name descriptive_name
```

This creates migration + applies to DB + regenerates client.

**That's it. Don't use anything else.**

---

## Daily Workflow

### 1. Starting New Feature

```bash
git checkout -b feature/my-feature
npx prisma migrate status
# If drift: DATABASE_URL="$DIRECT_URL" npx prisma migrate reset
```

### 2. Making Schema Change

```bash
# Edit prisma/schema.prisma
# Then run:
npx prisma migrate dev --name add_field_name

# Review SQL:
cat prisma/migrations/TIMESTAMP_*/migration.sql

# Test:
npx tsc --noEmit && npm run build
```

### 3. Committing

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Add new field"
git push
```

---

## ❌ NEVER Use

```bash
npx prisma db push          # ❌ Causes drift
npx prisma generate         # ❌ Use after migrate dev, not alone
psql $DATABASE_URL          # ❌ No manual DB changes
```

---

## ✅ Safe Commands

```bash
# Check migration status
npx prisma migrate status

# Create and apply migration (THE MAIN COMMAND)
npx prisma migrate dev --name NAME

# Reset dev database if drift
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# Use direct URL if pooler times out
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

---

## Fix Drift

```bash
# Option 1: Reset (recommended for dev)
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# Option 2: Create baseline
npx prisma migrate dev --name baseline_fix --create-only
echo "-- Baseline" > prisma/migrations/TIMESTAMP_baseline_fix/migration.sql
npx prisma migrate resolve --applied "TIMESTAMP_baseline_fix"
```

---

## Checklist Before Commit

```
[ ] Edited prisma/schema.prisma
[ ] Ran: npx prisma migrate dev --name DESCRIPTIVE_NAME
[ ] Reviewed generated SQL
[ ] Tested: npx tsc --noEmit
[ ] Built: npm run build
[ ] Checked: npx prisma migrate status
[ ] Added: prisma/schema.prisma + prisma/migrations/
```

---

## Common Errors

### "Can't reach database server (P1001)"
```bash
# Pooler timeout - use direct URL
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
```

### "Migration already applied"
```bash
# In Supabase SQL Editor:
DELETE FROM "_prisma_migrations" WHERE migration_name = 'FAILED_NAME';
```

### "Database schema not in sync"
```bash
# Schema drift detected
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset
```

---

## Production Safety

**Production is SAFE because:**
- Deployments only apply NEW migrations
- Never resets database
- Never re-applies old migrations
- All changes are incremental
- Git-tracked and PR-reviewed

**When you deploy:**
```
Vercel runs: npx prisma migrate deploy
Checks: Which migrations are new?
Applies: Only new ones
Result: Production DB updated safely
```

---

## Remember

**If in doubt:**
1. Don't use `db push`
2. Always use `migrate dev`
3. Always commit schema + migrations together
4. Always review generated SQL
5. Always test locally first

**The #1 cause of drift:**
Using `npx prisma db push` or `npx prisma generate` after schema changes instead of `npx prisma migrate dev`

---

**Last Updated**: 2025-11-07
**For Details**: See `/docs/PREVENT_SCHEMA_DRIFT.md`
