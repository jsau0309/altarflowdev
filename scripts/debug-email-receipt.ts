#!/usr/bin/env node

/**
 * Debug script to check why email receipts might not be sending
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function debugEmailReceipts() {
  console.log(chalk.blue('\n🔍 Debugging Email Receipt Issues\n'));
  console.log('='.repeat(60));

  // Check environment variables
  console.log(chalk.yellow('📋 Environment Check:\n'));
  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || 'Not set (using fallback)'}`);
  console.log(`YOUR_VERIFIED_RESEND_DOMAIN: ${process.env.YOUR_VERIFIED_RESEND_DOMAIN || 'Not set'}`);
  
  // Check recent transactions
  console.log(chalk.yellow('\n📊 Recent Transactions:\n'));
  
  const recentTransactions = await prisma.donationTransaction.findMany({
    where: {
      status: 'succeeded',
      source: 'stripe'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      donor: true
    }
  });

  console.log(`Found ${recentTransactions.length} recent successful transactions:\n`);

  recentTransactions.forEach((tx, index) => {
    console.log(`${index + 1}. Transaction ${tx.id.substring(0, 8)}...`);
    console.log(`   Created: ${tx.createdAt.toLocaleString()}`);
    console.log(`   Processed: ${tx.processedAt ? tx.processedAt.toLocaleString() : chalk.red('NOT SET')}`);
    console.log(`   Donor Email: ${tx.donorEmail ? chalk.green(tx.donorEmail) : chalk.red('MISSING')}`);
    console.log(`   Donor Name: ${tx.donorName || 'Not set'}`);
    console.log(`   Amount: $${(tx.amount / 100).toFixed(2)}`);
    console.log(`   Payment Method: ${tx.paymentMethodType}`);
    
    if (!tx.donorEmail && tx.donor) {
      console.log(`   Donor Record Email: ${tx.donor.email ? chalk.yellow(tx.donor.email) : chalk.red('Also missing')}`);
    }
    
    console.log();
  });

  // Check for common issues
  console.log(chalk.yellow('⚠️  Common Email Receipt Issues:\n'));

  const noEmailCount = recentTransactions.filter(tx => !tx.donorEmail && !tx.donor?.email).length;
  if (noEmailCount > 0) {
    console.log(chalk.red(`❌ ${noEmailCount} transactions have no email address - receipts cannot be sent`));
  }

  const noProcessedAtCount = recentTransactions.filter(tx => !tx.processedAt).length;
  if (noProcessedAtCount > 0) {
    console.log(chalk.yellow(`⚠️  ${noProcessedAtCount} transactions missing processedAt timestamp`));
  }

  // Recommendations
  console.log(chalk.blue('\n✅ Recommendations:\n'));
  
  console.log('1. Ensure donor email is collected during donation flow');
  console.log('2. Check webhook logs for errors during processing');
  console.log('3. Verify Resend API key is valid');
  console.log('4. Check Resend dashboard for failed sends');
  console.log('5. Test with a known good email address');

  // Test email configuration
  console.log(chalk.blue('\n🧪 Testing Email Configuration:\n'));
  
  if (process.env.RESEND_API_KEY) {
    console.log('To test Resend directly, run:');
    console.log(chalk.green(`
curl -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer ${process.env.RESEND_API_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "from": "${process.env.RESEND_FROM_EMAIL || 'Altarflow <hello@altarflow.com>'}",
    "to": "your-email@example.com",
    "subject": "Test Receipt",
    "html": "<p>This is a test receipt email</p>"
  }'
    `));
  }
}

// Run the debug script
debugEmailReceipts()
  .catch((error) => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });