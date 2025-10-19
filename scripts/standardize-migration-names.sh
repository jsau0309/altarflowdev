#!/bin/bash

# =====================================================
# Standardize Migration Names to Prisma Format
# =====================================================
# This script renames migrations to follow Prisma's
# standard YYYYMMDDHHMMSS format
# =====================================================

set -e  # Exit on error

echo "📦 Standardizing migration folder names..."
echo ""

# Migration 1: 20251016 -> 20251015231509 (based on folder creation time)
OLD_NAME_1="20251016_add_campaign_to_donation_transaction"
NEW_NAME_1="20251015231509_add_campaign_to_donation_transaction"

# Migration 2: 20251017 -> 20251017162252 (based on folder creation time)
OLD_NAME_2="20251017_add_isactive_to_campaign"
NEW_NAME_2="20251017162252_add_isactive_to_campaign"

echo "🔄 Renaming migration folders..."
echo "   $OLD_NAME_1 → $NEW_NAME_1"
mv "prisma/migrations/$OLD_NAME_1" "prisma/migrations/$NEW_NAME_1"

echo "   $OLD_NAME_2 → $NEW_NAME_2"
mv "prisma/migrations/$OLD_NAME_2" "prisma/migrations/$NEW_NAME_2"

echo ""
echo "✅ Migration folders renamed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Run the SQL script to update the database migration table"
echo "   2. Run 'npx prisma migrate status' to verify"
echo ""
