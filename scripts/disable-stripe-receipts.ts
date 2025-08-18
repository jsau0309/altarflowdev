#!/usr/bin/env npx tsx
/**
 * Script to disable Stripe automatic receipts for existing Connect accounts
 * This prevents duplicate receipts (Stripe + Resend)
 * 
 * Usage: npx tsx scripts/disable-stripe-receipts.ts
 *        npx tsx scripts/disable-stripe-receipts.ts --church-id <uuid>
 */

import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { parse } from 'ts-command-line-args';

interface Args {
  'church-id'?: string;
  help?: boolean;
}

const args = parse<Args>({
  'church-id': { type: String, optional: true, description: 'Specific church UUID to update' },
  help: { type: Boolean, optional: true, alias: 'h', description: 'Show help' },
});

async function disableStripeReceipts(stripeAccountId: string): Promise<boolean> {
  try {
    console.log(`Updating Stripe account ${stripeAccountId}...`);
    
    // Disable automatic receipts for this Connect account
    await stripe.accounts.update(stripeAccountId, {
      settings: {
        payments: {
          statement_descriptor: 'ALTARFLOW DONATION',
        },
      },
    });
    
    console.log(`✅ Successfully disabled automatic receipts for ${stripeAccountId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${stripeAccountId}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Disabling Stripe automatic receipts for Connect accounts\n');
  
  try {
    let accounts;
    
    if (args['church-id']) {
      // Update specific church
      const church = await prisma.church.findUnique({
        where: { id: args['church-id'] },
        include: {
          stripeConnectAccount: true,
        },
      });
      
      if (!church) {
        console.error(`❌ Church with ID ${args['church-id']} not found`);
        process.exit(1);
      }
      
      if (!church.stripeConnectAccount) {
        console.error(`❌ Church ${church.name} does not have a Stripe Connect account`);
        process.exit(1);
      }
      
      accounts = [church.stripeConnectAccount];
      console.log(`Processing single church: ${church.name}`);
    } else {
      // Update all churches with Connect accounts
      accounts = await prisma.stripeConnectAccount.findMany({
        include: {
          church: true,
        },
      });
      
      console.log(`Found ${accounts.length} Connect accounts to update`);
    }
    
    if (accounts.length === 0) {
      console.log('No Connect accounts found to update');
      process.exit(0);
    }
    
    // Process each account
    let successCount = 0;
    let failCount = 0;
    
    for (const account of accounts) {
      const churchName = 'church' in account ? account.church?.name : 'Unknown';
      console.log(`\nProcessing: ${churchName || 'Church'} (${account.stripeAccountId})`);
      
      const success = await disableStripeReceipts(account.stripeAccountId);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Summary:');
    console.log(`✅ Successfully updated: ${successCount} account(s)`);
    if (failCount > 0) {
      console.log(`❌ Failed to update: ${failCount} account(s)`);
    }
    console.log('='.repeat(50));
    
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});