# Scripts Folder Cleanup Analysis

## Current Scripts (33 total files)

### ✅ KEEP - Production Utility Scripts (7)

**Active/Useful:**
1. `add-stripe-indexes.ts` - Database performance optimization
2. `debug-subscription-status.ts` - Production debugging tool
3. `disable-stripe-receipts.ts` - Stripe configuration utility
4. `test-campaign-cache.ts` - Campaign performance testing
5. `verify-financial-calculations.ts` - Financial integrity checks
6. `README-debug-subscription.md` - Documentation for debugging

**Recently created (today's migration work):**
7. `standardize-migration-names.sh` - Migration maintenance tool

### ❌ DELETE - Temporary/One-Time Scripts (10)

**Migration sync scripts (used once, now obsolete):**
1. `check-dev-migrations.sql` - One-time migration check
2. `fix-dev-database-sync.sql` - One-time phantom migration cleanup
3. `migration-comparison.md` - Analysis document (temporary)
4. `sync-dev-database.sh` - One-time sync script
5. `update-migration-names-in-db.sql` - One-time rename (already run)
6. `verify-dev-sync.sql` - One-time verification
7. `get-production-migration-history.sql` - (if exists) One-time check
8. `get-all-production-migrations.sql` - (if exists) One-time check
9. `export-production-migrations.sql` - (if exists) One-time check

**Bug testing scripts (investigation complete):**
10. `test-api-validation.ts` - Bug investigation (Droid's false alarm)
11. `test-manual-donation-api.sh` - Bug investigation (confirmed no bug)
12. `verify-donation-table-usage.ts` - One-time table verification
13. `test-donation-type-id-format.ts` - (if exists) Bug investigation

### 📁 KEEP - Nested scripts/scripts/ Folder (16)

**Database utilities:**
- `add-performance-indexes.sql` - Performance optimization
- `analyze.sql` - Database analysis
- `verify-indexes.sql` - Index verification
- `drop-indexes.sql` - Index cleanup

**Demo/Test data:**
- `demo-donations.sql` - Demo data generator
- `demo-expenses.sql` - Demo data generator
- `demo-members.sql` - Demo data generator
- `demo-visitors.sql` - Demo data generator
- `create-donation-types.sql` - Test data utility

**Stripe utilities:**
- `check-stripe-account.ts` - Stripe debugging
- `cleanup-stripe-account.ts` - Stripe maintenance

**Historical fixes (reference):**
- `fix-donation-amounts.sql` - Historical data fix
- `fix-donation-types.sql` - Historical data fix
- `fix-supabase-performance.sql` - Performance optimization

**These should stay for:**
- Demo environment setup
- Testing
- Performance debugging
- Historical reference

---

## Recommended Actions

### DELETE (10-13 files):
```bash
# Migration sync scripts (obsolete after today's work)
rm scripts/check-dev-migrations.sql
rm scripts/fix-dev-database-sync.sql
rm scripts/migration-comparison.md
rm scripts/sync-dev-database.sh
rm scripts/update-migration-names-in-db.sql
rm scripts/verify-dev-sync.sql

# Bug investigation scripts (investigation complete)
rm scripts/test-api-validation.ts
rm scripts/test-manual-donation-api.sh
rm scripts/verify-donation-table-usage.ts

# If these exist, delete them too:
rm scripts/get-production-migration-history.sql 2>/dev/null || true
rm scripts/get-all-production-migrations.sql 2>/dev/null || true
rm scripts/export-production-migrations.sql 2>/dev/null || true
rm scripts/test-donation-type-id-format.ts 2>/dev/null || true
```

### KEEP (20 files):
- 7 production utility scripts (top level)
- 13 database/demo scripts (in scripts/scripts/)

### Result:
- **Before**: 33 files
- **After**: 20 files
- **Removed**: 13 temporary/obsolete scripts (39% cleanup)

---

## Why Delete These?

**Migration sync scripts:**
- ✅ Migration sync complete
- ✅ Phantom migration removed
- ✅ Names standardized
- ❌ No longer needed

**Bug investigation scripts:**
- ✅ Bug investigation complete (Droid's bug was a false alarm)
- ✅ Production verified working
- ❌ No longer needed for reference

**Keep the rest because:**
- Production debugging tools (subscription, Stripe, performance)
- Demo data generators (useful for testing)
- Historical fix references (may need to replicate in future)
- Database performance utilities (active use)
