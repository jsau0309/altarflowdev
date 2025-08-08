#!/usr/bin/env node

/**
 * Script to add Stripe-specific performance indexes to the database
 * Run this script to improve donation flow performance
 * 
 * Usage:
 *   npx ts-node scripts/add-stripe-indexes.ts
 * 
 * Or if in production:
 *   npm run add-indexes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addIndexes() {
  console.log('🚀 Starting to add Stripe performance indexes...\n');

  // Note: CONCURRENTLY can't be used in a transaction, so we'll use regular CREATE INDEX
  // For production with zero downtime, run these directly in Supabase SQL editor with CONCURRENTLY
  const indexes = [
    {
      name: 'idx_donor_church_phone',
      description: 'Speeds up OTP verification (finding donors by phone)',
      sql: `CREATE INDEX IF NOT EXISTS "idx_donor_church_phone" ON "Donor"("churchId", "phone")`
    },
    {
      name: 'idx_stripe_connect_church',
      description: 'Speeds up finding church payment accounts',
      sql: `CREATE INDEX IF NOT EXISTS "idx_stripe_connect_church" ON "StripeConnectAccount"("churchId")`
    },
    {
      name: 'idx_donation_transaction_stripe',
      description: 'Speeds up webhook processing',
      sql: `CREATE INDEX IF NOT EXISTS "idx_donation_transaction_stripe" ON "DonationTransaction"("stripePaymentIntentId")`
    },
    {
      name: 'idx_donor_church_email',
      description: 'Speeds up donor email lookups',
      sql: `CREATE INDEX IF NOT EXISTS "idx_donor_church_email" ON "Donor"("churchId", "email")`
    },
    {
      name: 'idx_donation_transaction_idempotency',
      description: 'Prevents duplicate donations',
      sql: `CREATE INDEX IF NOT EXISTS "idx_donation_transaction_idempotency" ON "DonationTransaction"("idempotencyKey")`
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      console.log(`📊 Creating index: ${index.name}`);
      console.log(`   Purpose: ${index.description}`);
      
      const startTime = Date.now();
      await prisma.$executeRawUnsafe(index.sql);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Created successfully in ${duration}ms\n`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`   ⚠️  Index already exists (skipping)\n`);
        successCount++;
      } else {
        console.error(`   ❌ Error creating index: ${error.message}\n`);
        errorCount++;
      }
    }
  }

  console.log('📈 Checking index statistics...\n');
  
  try {
    const indexStats = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
      index_size: string;
    }>>`
      SELECT 
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      AND indexname IN (
        'idx_donor_church_phone',
        'idx_stripe_connect_church',
        'idx_donation_transaction_stripe',
        'idx_donor_church_email',
        'idx_donation_transaction_idempotency'
      )
      ORDER BY tablename, indexname;
    `;

    if (indexStats.length > 0) {
      console.log('Index Statistics:');
      console.table(indexStats);
    }
  } catch (error) {
    console.log('Could not fetch index statistics (this is normal for new databases)');
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Index creation complete!`);
  console.log(`   Successfully created: ${successCount} indexes`);
  if (errorCount > 0) {
    console.log(`   Failed: ${errorCount} indexes`);
  }
  console.log('='.repeat(50));

  // Performance tips
  console.log('\n💡 Performance Tips:');
  console.log('1. These indexes will improve query performance immediately');
  console.log('2. Monitor your database CPU usage in Supabase dashboard');
  console.log('3. Run ANALYZE to update statistics: npx prisma db execute --sql "ANALYZE;"');
  console.log('4. Check slow queries in Supabase: Dashboard > Database > Query Performance');
}

// Run the script
addIndexes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });