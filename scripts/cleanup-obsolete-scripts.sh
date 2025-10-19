#!/bin/bash

# =====================================================
# Cleanup Obsolete Scripts
# =====================================================
# Removes temporary scripts created during migration
# sync and bug investigation work
# =====================================================

set -e

echo "🧹 Cleaning up obsolete scripts..."
echo ""

# Count files before
BEFORE=$(find scripts -type f | wc -l | tr -d ' ')

echo "📊 Before: $BEFORE files in scripts/"
echo ""

# Remove migration sync scripts (obsolete after migration standardization)
echo "🗑️  Removing migration sync scripts..."
rm -f scripts/check-dev-migrations.sql
rm -f scripts/fix-dev-database-sync.sql
rm -f scripts/migration-comparison.md
rm -f scripts/sync-dev-database.sh
rm -f scripts/update-migration-names-in-db.sql
rm -f scripts/verify-dev-sync.sql

# Remove bug investigation scripts (investigation complete)
echo "🗑️  Removing bug investigation scripts..."
rm -f scripts/test-api-validation.ts
rm -f scripts/test-manual-donation-api.sh
rm -f scripts/verify-donation-table-usage.ts
rm -f scripts/test-donation-type-id-format.ts

# Count files after
AFTER=$(find scripts -type f | wc -l | tr -d ' ')
REMOVED=$((BEFORE - AFTER))

echo ""
echo "✅ Cleanup complete!"
echo "📊 After: $AFTER files in scripts/"
echo "🗑️  Removed: $REMOVED obsolete files"
echo ""
echo "📁 Kept files:"
echo "   - Production utility scripts (debugging, performance)"
echo "   - Demo data generators"
echo "   - Database utilities"
echo "   - Migration standardization script"
echo ""
