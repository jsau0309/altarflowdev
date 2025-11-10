# Prisma Production Workflow & Safety Guidelines

## 🎯 Purpose
This document establishes a safe, predictable workflow for Prisma schema changes in production. Following these guidelines prevents deployment failures, data loss, and schema drift.

**⚠️ CRITICAL:** We have real users and real data in production. Any mistake can cause:
- Production deployment failures
- Data loss or corruption
- Service downtime
- Customer impact

---

## 🗄️ **CRITICAL: Understanding Our Two-Database System**

### The Setup
We have **TWO separate databases**:

1. **Development Database** (`qdoyonfjxwqefvsfjchx.supabase.co`)
   - This is where we work and test
   - Connected via `.env.development`
   - Safe to modify and experiment
   - Changes here don't affect production

2. **Production Database** (`uhoovjoeitxecfcbzndj.supabase.co`)
   - **WE NEVER TOUCH THIS DIRECTLY**
   - Only modified through deployment
   - Connected via Vercel environment variables
   - Contains real user data

### The Source of Truth
**Prisma Schema (`prisma/schema.prisma`) is the SOURCE OF TRUTH**

Not the database. Not migrations. The schema file is what defines our data structure.

### The Correct Workflow for Schema Changes

When you want to add a new field or make any schema change:

**Step 1: Modify the Prisma Schema**
```prisma
// Edit prisma/schema.prisma
model LandingPageConfig {
  id String @id @default(uuid()) @db.Uuid
  // ... existing fields
  ogBackgroundColor String? @default("#3B82F6")  // ← Add your new field
}
```

**Step 2: Create Migration Folder Manually**
```bash
# Create folder with timestamp
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
mkdir -p "prisma/migrations/${TIMESTAMP}_add_og_background_color"
```

**Step 3: Write the Migration SQL**
Create `prisma/migrations/[TIMESTAMP]_name/migration.sql`:
```sql
-- AlterTable
ALTER TABLE "LandingPageConfig" ADD COLUMN "ogBackgroundColor" TEXT DEFAULT '#3B82F6';
```

**Step 4: Sync Development Database with Schema**
```bash
# This applies the migration to development database
npx prisma migrate dev

# Or if migration folder already exists:
npx prisma generate
```

**Step 5: Commit Everything**
```bash
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "feat: Add ogBackgroundColor to landing config"
```

**Step 6: Deploy to Production**
When you push to `main` and Vercel deploys:
- Vercel runs `npx prisma migrate deploy`
- This applies pending migrations to **production database**
- Production database gets updated automatically
- **You never touch production database directly**

### Why This Workflow?

✅ **Correct:**
1. Schema change in `schema.prisma`
2. Create migration folder + SQL manually
3. Run `npx prisma migrate dev` to sync dev database
4. Commit schema + migration
5. Deploy → Vercel applies to production

❌ **Wrong:**
1. ~~Run `npx prisma migrate dev` first~~ (causes shadow DB issues)
2. ~~Modify production database directly~~ (causes drift)
3. ~~Use `npx prisma db push`~~ (doesn't create migrations)
4. ~~Mark migrations as applied without running SQL~~ (causes schema mismatch)

---

## 📋 Quick Reference Checklist

**Before ANY Prisma schema change:**
- [ ] Read this document completely
- [ ] Backup production database (Supabase dashboard)
- [ ] Ensure you're on latest `main` branch
- [ ] Check current migration status: `npx prisma migrate status`
- [ ] Communicate with team about pending changes

---

## 🔄 The Safe Development Workflow

### Phase 1: Pre-Development (REQUIRED)

#### 1.1 Environment Check
```bash
# Verify you're in development
echo $DATABASE_URL  # Should point to development DB

# Check current migration status
npx prisma migrate status

# Pull latest changes
git pull origin main
npm install
```

#### 1.2 Backup Production Database
**ALWAYS backup before schema changes!**

**In Supabase Dashboard:**
1. Go to Database → Backups
2. Click "Create Backup"
3. Name it: `pre_migration_[feature_name]_[date]`
4. Note backup timestamp in migration PR description

**Why this matters:** If something goes wrong, you can restore from this backup.

#### 1.3 Team Communication
**Required before major schema changes:**
- Notify team in Slack/Discord: "Working on Prisma schema for [feature]"
- Check if anyone else is working on Prisma
- Coordinate timing for production deployment
- Schedule during low-traffic period

---

### Phase 2: Development (Schema Changes)

#### 2.1 Make Schema Changes
Edit `prisma/schema.prisma` following these rules:

**✅ ALWAYS DO:**

1. **Add `@default()` to ALL new `id` fields:**
   ```prisma
   // For UUID fields
   id String @id @default(uuid()) @db.Uuid

   // For CUID fields (most tables)
   id String @id @default(cuid())
   ```

2. **Use `@updatedAt` for timestamp fields:**
   ```prisma
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt  // Auto-updates on every change
   ```

3. **Use PascalCase for relation names (matches model names):**
   ```prisma
   model DonationTransaction {
     Church Church @relation(...)           // ✅ PascalCase
     DonationType DonationType @relation(...)
     Donor Donor? @relation(...)
   }
   ```

4. **Add descriptive comments for complex changes:**
   ```prisma
   // Tracks when member last submitted connect form
   lastSubmittedConnectFormAt DateTime?
   ```

5. **Keep foreign keys nullable when adding to existing tables:**
   ```prisma
   // When adding new relation to existing table
   newFieldId String? @db.Uuid  // ✅ Nullable - won't break existing data
   ```

**❌ NEVER DO:**

1. **Remove `@default()` from existing id fields** - Causes TypeScript errors
2. **Use lowercase for relation names** (`church` → ❌, `Church` → ✅)
3. **Make breaking changes without migration strategy**
4. **Modify id field types on tables with data** - Can corrupt data
5. **Add required fields without defaults to tables with data** - Migration will fail

#### 2.2 Create Migration
```bash
# Create migration with descriptive name
npx prisma migrate dev --name add_user_preferences_table

# This will:
# 1. Generate SQL in prisma/migrations/
# 2. Apply to development database
# 3. Regenerate Prisma client
```

**Migration naming conventions:**
- `add_[table_name]` - Creating new tables
  - Example: `add_user_preferences_table`
- `update_[table]_add_[field]` - Adding fields
  - Example: `update_member_add_phone_verified`
- `remove_unused_[table]` - Dropping tables
  - Example: `remove_unused_invitation_table`
- `fix_[issue]` - Correcting issues
  - Example: `fix_email_quota_unique_constraint`

**Always use snake_case and be descriptive!**

#### 2.3 Review Generated SQL
**CRITICAL: Always review the migration SQL before committing!**

```bash
# Check the generated SQL
cat prisma/migrations/TIMESTAMP_migration_name/migration.sql
```

**Verify these items:**

✅ **Safety checks:**
- [ ] No unexpected `DROP TABLE` commands
- [ ] Correct column types (UUID vs TEXT vs INT)
- [ ] Proper indexes added where needed
- [ ] Foreign keys correctly defined
- [ ] Default values are appropriate
- [ ] No data loss commands (unless intended and documented)

❌ **Red flags to watch for:**
- `DROP TABLE` without explicit intent in your PR
- Type mismatches (e.g., `UUID` field getting `TEXT` default)
- Missing `IF EXISTS` on drops
- Destructive changes without data migration strategy
- `::text` casting on UUID fields (use `gen_random_uuid()` not `gen_random_uuid()::text`)

**Example of GOOD migration SQL:**
```sql
-- Add user preferences table
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT DEFAULT 'light',
    "language" TEXT DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- Add index for common queries
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");
```

**Example of BAD migration SQL:**
```sql
-- ❌ Dropping table without IF EXISTS
DROP TABLE "ImportantData";

-- ❌ Wrong type cast
ALTER TABLE "Church" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- ❌ Adding required field to table with data
ALTER TABLE "Member" ADD COLUMN "requiredField" TEXT NOT NULL;
```

---

### Phase 3: Testing & Validation

#### 3.1 Test Locally
```bash
# Regenerate Prisma client
npx prisma generate

# Run TypeScript check
npx tsc --noEmit

# Run full build
npm run build

# Run development server
npm run dev
```

**Test these scenarios:**

1. **Create new records** - Test defaults work
   ```typescript
   // Should work without providing id
   const church = await prisma.church.create({
     data: { name: "Test Church", slug: "test" }
   });
   ```

2. **Update existing records** - Test updatedAt auto-updates
   ```typescript
   await prisma.church.update({
     where: { id: churchId },
     data: { name: "Updated Name" }
   });
   ```

3. **Query with new fields/relations** - Test TypeScript types
   ```typescript
   const result = await prisma.church.findFirst({
     include: { DonationType: true }  // Test PascalCase works
   });
   ```

4. **Test affected API endpoints** - Make HTTP requests
5. **Verify UI still works** - Navigate to affected pages

#### 3.2 Validate Migration Status
```bash
# Should show all migrations applied
npx prisma migrate status

# Expected output:
# "Database schema is up to date!"
```

**If drift detected:**
```bash
# Fix drift before proceeding
npx prisma migrate resolve --applied "migration_name"

# Document why drift occurred
```

#### 3.3 Update TypeScript Code
Update code to match new schema:

**Relation name updates:**
```typescript
// ✅ Correct - PascalCase matching schema
const donations = await prisma.donationTransaction.findMany({
  include: {
    Church: true,
    DonationType: true,
    Donor: true,
  }
});

// Access included data
donations[0].Church.name;
donations[0].DonationType.name;

// ❌ Wrong - lowercase will cause TypeScript error
include: {
  church: true,      // Property 'church' does not exist
  donationType: true // Property 'donationType' does not exist
}
```

**Handle new required fields:**
```typescript
// If you added required fields, update all create operations
await prisma.emailCampaign.create({
  data: {
    subject: "Test",
    // ... existing fields
    updatedAt: new Date(),  // ← Add if now required
  }
})
```

---

### Phase 4: Pre-Production Validation

#### 4.1 Create Pull Request

```bash
git add prisma/schema.prisma
git add prisma/migrations/
git add [any TypeScript files changed]
git commit -m "feat: Add user preferences table with migration"
git push origin feature/user-preferences
```

**PR Description Must Include:**

```markdown
## Summary
Add UserPreference table to store user theme and language preferences.

## Database Changes
- **New table:** `UserPreference`
- **Migration:** `20241019123456_add_user_preferences_table`
- **Breaking changes:** None
- **Data migration required:** No

## Migration SQL Review
- [x] Reviewed generated SQL
- [x] No destructive changes
- [x] Proper defaults added
- [x] Indexes added for performance

## Testing Completed
- [x] TypeScript compiles without errors
- [x] Full build succeeds locally
- [x] Tested create/update/query operations
- [x] Verified affected API endpoints work

## Pre-Deployment Checklist
- [x] Production backup created
  - Backup name: `pre_migration_user_prefs_2024_10_19`
  - Timestamp: 2024-10-19 12:00 UTC
- [x] Team notified in Slack
- [x] Migration tested in development
- [x] Deployment scheduled for low-traffic period

## Rollback Plan
If migration fails:

1. **If caught during build:**
   - Revert PR
   - Fix migration SQL
   - Re-test locally
   - Redeploy

2. **If caught after deployment:**
   - Immediately revert deployment in Vercel
   - Run rollback SQL:
     ```sql
     DROP TABLE "UserPreference";
     DELETE FROM "_prisma_migrations"
     WHERE migration_name = '20241019123456_add_user_preferences_table';
     ```
   - Restore from backup if needed

## Estimated Impact
- Migration time: <1 second (new table, no data)
- Downtime: None expected
- Affected users: None (new feature)
```

#### 4.2 Code Review Requirements

**Reviewer must verify:**
- [ ] Migration SQL reviewed and safe
- [ ] No risk of data loss
- [ ] TypeScript compiles successfully
- [ ] All tests pass
- [ ] Migration is reversible OR has documented rollback plan
- [ ] Production backup documented
- [ ] Team coordination completed

**Reviewer should ask:**
- "What happens to existing data?"
- "What if this migration fails halfway?"
- "Can we roll this back safely?"
- "Did you test with production-like data volume?"

---

### Phase 5: Production Deployment

#### 5.1 Pre-Deployment (30 minutes before)

1. **Verify production backup is fresh:**
   - Check Supabase dashboard
   - Confirm backup completed successfully
   - Note exact timestamp

2. **Announce deployment** (if major migration):
   - Update status page if you have one
   - Post in team chat
   - For large migrations: enable maintenance mode

3. **Verify Vercel configuration:**
   ```bash
   # Build command should be:
   npx prisma migrate deploy && npx prisma generate && npx next build
   ```

4. **Double-check environment variables:**
   - `DATABASE_URL` points to production
   - `DIRECT_URL` set for migrations

#### 5.2 Deploy Process

```bash
# Merge PR to main (after approval)
git checkout main
git pull origin main
git merge feature/user-preferences

# Push to trigger Vercel deployment
git push origin main
```

**Vercel will automatically:**
1. Run `npx prisma migrate deploy` - Applies pending migrations
2. Run `npx prisma generate` - Regenerates Prisma client
3. Run `npx next build` - Builds application
4. Deploy if all succeed

#### 5.3 Monitor Deployment

**Watch Vercel build logs carefully:**

✅ **Success indicators:**
```
Applying migration `20241019123456_add_user_preferences_table`
Migration applied successfully
✓ Generated Prisma Client
✓ Compiled successfully
```

❌ **Failure indicators:**
```
Error: P3018 - Migration failed to apply
Database error code: 42804
ERROR: column type mismatch
```

**If migration fails:**
1. ⚠️ **Don't panic** - Your backup is safe
2. ⚠️ **Don't retry blindly** - Fix the issue first
3. Check error message carefully
4. Follow rollback procedure (see Phase 6)

#### 5.4 Post-Deployment Validation

**Within 5 minutes of deployment:**

1. **Check migration status in production:**
   ```bash
   # With production DATABASE_URL set
   npx prisma migrate status

   # Expected: "Database schema is up to date!"
   ```

2. **Test critical user flows:**
   - Create a test record (if safe)
   - Verify new features work
   - Check existing features still work

3. **Monitor error tracking:**
   - Check Sentry for new errors
   - Watch Vercel function logs
   - Monitor database performance

4. **Verify data integrity:**
   - Check a few records manually
   - Verify relationships are correct
   - Confirm no data was lost

---

## 🚨 Phase 6: Emergency Rollback Procedures

### 6.1 If Migration Fails During Deployment

**Immediate Actions:**

1. **Check the error** in Vercel build logs
2. **Don't retry deployment** - Fix the issue first
3. **Alert team** in Slack/Discord

**Common failures and fixes:**

#### Scenario A: Column Type Mismatch
```
ERROR: column "id" is of type uuid but default expression is of type text
```

**Fix:**
```sql
-- In your migration file, change:
ALTER TABLE "Table" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
-- To:
ALTER TABLE "Table" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
```

#### Scenario B: Migration Already Applied
```
Error: Migration already applied
```

**Fix in Supabase SQL Editor:**
```sql
-- Remove the failed migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = 'FAILED_MIGRATION_NAME';

-- Then retry deployment
```

#### Scenario C: Foreign Key Constraint Violation
```
ERROR: insert or update on table violates foreign key constraint
```

**Fix:**
- Add data migration step to handle existing data
- Or make foreign key nullable initially
- Update migration file with proper data handling

### 6.2 If Migration Applied But App is Broken

**Immediate Actions:**

1. **Revert deployment in Vercel:**
   - Vercel Dashboard → Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Rollback the migration in database:**

   **Option A: Manual SQL rollback (if simple):**
   ```sql
   -- Example: Reverse the changes
   DROP TABLE "NewTable";

   -- Remove migration record
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = 'problematic_migration';
   ```

   **Option B: Restore from backup (if complex):**
   - See section 6.3 below

3. **Mark migration as rolled back in dev:**
   ```bash
   npx prisma migrate resolve --rolled-back "migration_name"
   ```

4. **Fix the issue:**
   - Update schema
   - Create new migration
   - Test thoroughly
   - Redeploy

### 6.3 Complete Restore from Backup

**Only if severe data corruption or complex rollback:**

**⚠️ This will lose all data changes since backup!**

1. **In Supabase Dashboard:**
   - Database → Backups
   - Select backup from before migration
   - Click "Restore"

2. **Wait for restore** (~5-30 minutes depending on size)

3. **Verify data integrity:**
   - Check a few critical records
   - Verify user count matches
   - Confirm no corruption

4. **Reset migration state:**
   ```sql
   -- Remove the failed migration
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = 'failed_migration_name';
   ```

5. **Redeploy previous working version:**
   - Revert code to last working commit
   - Push to trigger Vercel deployment

---

## 👥 Team Coordination Guidelines

### Before Starting Prisma Work

**Required communication:**
1. Post in team chat: "Starting Prisma schema work on [feature name]"
2. Check if anyone else is modifying schema
3. Avoid parallel schema changes if possible

### During Development

**Keep team informed:**
- Daily standup: Mention schema changes in progress
- Share migration SQL preview for team review
- Ask for second pair of eyes on complex migrations

### Deployment Timing

**Coordinate deployments:**
- ❌ Avoid Friday deployments (weekend incidents)
- ❌ Avoid end-of-month (billing/reporting cycles)
- ❌ Avoid high-traffic periods
- ✅ Prefer low-traffic times (early morning, weekends for US users)
- ✅ Have backup person available during deployment
- ✅ Block calendar for monitoring post-deployment

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Schema Drift

**Problem:** Prisma schema doesn't match database

**Symptoms:**
```bash
npx prisma migrate status
# Output: "Your database schema is not in sync with your migration history"
```

**Root Causes:**
- Someone used `npx prisma db push`
- Database was modified manually
- Migration was partially applied

**Solution:**
```bash
# Option 1: Create baseline migration
npx prisma migrate dev --name sync_schema_with_database

# Option 2: Mark existing state as applied
npx prisma migrate resolve --applied "migration_name"

# Always document why drift occurred!
```

**Prevention:**
- Never use `db push` in production code
- Never manually modify production database
- Always use migrations for schema changes

### Pitfall 2: Merge Conflicts in Schema

**Problem:** Two people modified `schema.prisma`

**Wrong approach:**
```bash
# ❌ Don't just accept one version
git checkout --theirs prisma/schema.prisma
```

**Right approach:**
```bash
# 1. Merge both changes manually in schema.prisma
# 2. Delete conflicting migration folders
rm -rf prisma/migrations/[conflicting_migration_1]
rm -rf prisma/migrations/[conflicting_migration_2]

# 3. Create fresh migration with both changes
npx prisma migrate dev --name merge_schema_changes

# 4. Document what was merged in PR
```

**Prevention:**
- Coordinate schema changes with team
- Use feature branches
- Merge main into your branch frequently

### Pitfall 3: Lost `@default()` Directives

**Problem:** Merge conflict removes defaults from id fields

**Symptoms:**
```typescript
// TypeScript errors:
Property 'id' is missing in type '...' but required
```

**Detection:**
```bash
# Search for id fields without defaults
grep -n "@id" prisma/schema.prisma | grep -v "@default"
```

**Fix:**
```prisma
// Add back defaults
model Church {
  id String @id @default(uuid()) @db.Uuid  // ✅ Fixed
  // ... rest of model
}
```

**Prevention:**
- Always review schema changes in PR diff
- Look for removed `@default()` directives
- Run `npx tsc --noEmit` before committing

### Pitfall 4: Wrong Relation Casing

**Problem:** Using lowercase relation names in queries

**Symptoms:**
```typescript
// TypeScript error:
Property 'church' does not exist on type ...
Did you mean 'Church'?
```

**Wrong code:**
```typescript
include: {
  church: true,      // ❌ Lowercase
  donationType: true // ❌ Lowercase
}
```

**Fixed code:**
```typescript
include: {
  Church: true,      // ✅ PascalCase
  DonationType: true // ✅ PascalCase
}
```

**Prevention:**
- Always use PascalCase for relations
- Relation names match model names exactly
- Enable TypeScript strict mode

### Pitfall 5: UUID Type Casting Error

**Problem:** Adding `::text` cast to UUID defaults

**Symptoms:**
```
ERROR: column "id" is of type uuid but default expression is of type text
```

**Wrong SQL:**
```sql
ALTER TABLE "Church"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
```

**Fixed SQL:**
```sql
ALTER TABLE "Church"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
```

**Prevention:**
- Review migration SQL before committing
- UUID columns don't need text casting
- Test migrations locally first

---

## 📚 Learning from Past Issues

### Case Study: October 2024 Production Outage

**Timeline of Events:**

**August 2024:**
- Failed index migrations due to wrong column names (camelCase vs schema)
- Warning signs ignored
- Partial rollbacks created noise in migration history

**October 15-17:**
- Campaign/Donation refactor
- Multiple migrations in quick succession
- Schema drift began (Donation model in schema but table dropped)

**October 18:**
- Someone removed `@default()` directives (likely merge conflict)
- TypeScript types regenerated with stricter requirements
- 80+ TypeScript errors appeared

**October 19:**
- Production builds completely blocked
- Team unable to deploy critical fixes
- Emergency session to fix all errors

**What Went Wrong:**

1. ❌ Used `db push` instead of migrations
2. ❌ Merge conflicts resolved incorrectly
3. ❌ No pre-deployment testing
4. ❌ No production backups before changes
5. ❌ Multiple people changing schema without coordination
6. ❌ Migration SQL not reviewed
7. ❌ TypeScript errors ignored until critical mass

**What We Learned:**

1. ✅ **Always backup before schema changes**
2. ✅ **Review migration SQL** - Don't trust auto-generation blindly
3. ✅ **Test migrations locally** before deploying
4. ✅ **Coordinate schema changes** - One person at a time
5. ✅ **Never remove `@default()`** without very good reason
6. ✅ **Use PascalCase for relations** consistently
7. ✅ **Document all schema changes** in PRs
8. ✅ **Have rollback plans** for all migrations

**Preventions Implemented:**

- This document you're reading
- Mandatory PR reviews for Prisma changes
- Pre-deployment backup requirement
- TypeScript build check in CI/CD
- Team coordination requirement
- Migration SQL review checklist

---

## 🎓 Best Practices Summary

### Golden Rules

1. **Never use `npx prisma db push` in production code**
   - Only for quick local prototypes
   - Always use `migrate dev` to create tracked migrations

2. **Always add `@default()` to id fields**
   - UUID: `@default(uuid())`
   - CUID: `@default(cuid())`

3. **Use PascalCase for all relation names**
   - Match model names exactly
   - `Church`, `DonationType`, `Member`

4. **Review migration SQL before committing**
   - Check for unexpected drops
   - Verify type correctness
   - Look for data loss risks

5. **Test migrations locally first**
   - Run full build
   - Test affected features
   - Verify TypeScript compiles

6. **Backup before any production migration**
   - Use Supabase backup feature
   - Document backup timestamp
   - Test restore procedure periodically

7. **Communicate with team before schema changes**
   - Avoid parallel schema work
   - Coordinate deployment timing
   - Share migration plans

### Migration Quality Checklist

Before committing any migration:
- [ ] Descriptive migration name (snake_case)
- [ ] Migration SQL reviewed for safety
- [ ] No unexpected drops or truncates
- [ ] Defaults properly set
- [ ] TypeScript compiles without errors
- [ ] Full build succeeds
- [ ] Tests pass (if applicable)
- [ ] Rollback plan documented

### Deployment Safety Checklist

Before deploying to production:
- [ ] Production backup created and verified
- [ ] Team notified of pending deployment
- [ ] Migration tested in development
- [ ] TypeScript builds successfully
- [ ] Migration SQL reviewed by second person
- [ ] Deployment scheduled during low-traffic time
- [ ] Monitoring tools ready
- [ ] Rollback procedure documented and tested
- [ ] On-call person available for next 2 hours

---

## 🆘 Emergency Contacts & Resources

### Who to Contact

**For Prisma/Database issues:**
- Primary: [Lead Developer Name]
- Backup: [Senior Engineer Name]

**For Vercel/Deployment issues:**
- DevOps: [DevOps Engineer Name]
- On-call: Check team calendar

**For Emergency (Production Down):**
- Escalation: [CTO/Tech Lead]
- All-hands: Post in #engineering-urgent

### Useful Resources

**Documentation:**
- Prisma Docs: https://www.prisma.io/docs
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard

**Monitoring:**
- Sentry: [Your Sentry link]
- Vercel Logs: [Your Vercel project]
- Supabase Metrics: [Supabase project metrics]

**Internal Docs:**
- Team Notion: [Internal wiki]
- Runbooks: `/docs/runbooks/`
- Architecture Docs: `/docs/architecture/`

---

## 📝 Document Change Log

| Date | Change | Author |
|------|--------|--------|
| 2024-10-19 | Initial version after October production incident | Team |
| 2024-10-19 | Added emergency rollback procedures | Team |
| 2024-10-19 | Added case study from October outage | Team |

---

## ✅ Final Reminder

**When in doubt:**
1. Ask for review
2. Make a backup
3. Test locally first
4. Deploy during low-traffic
5. Monitor closely

**It's better to:**
- Delay deployment by a day for proper testing
- Ask "stupid questions" than cause an outage
- Over-communicate than surprise the team
- Have a rollback plan than hope for the best

**Remember:** Every production incident is a learning opportunity. Document what went wrong, fix the process, and prevent it from happening again.

---

**This document is living and should be updated as we learn more!**

If you found an issue this document didn't cover, please update it and share with the team.
