#!/usr/bin/env node

/**
 * Script to fix historical payment method data
 * Updates transactions that were incorrectly marked as 'card'
 * by fetching the actual payment method from Stripe
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

async function fixPaymentMethods() {
  console.log(chalk.blue('\n🔧 Fixing Historical Payment Method Data\n'));
  console.log('='.repeat(60));

  try {
    // Get all transactions with Stripe payment intent IDs
    const transactions = await prisma.donationTransaction.findMany({
      where: {
        stripePaymentIntentId: { not: null },
        source: 'stripe',
        status: 'succeeded'
      },
      include: {
        church: true
      }
    });

    console.log(`Found ${transactions.length} Stripe transactions to check\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const transaction of transactions) {
      process.stdout.write(`Processing ${transaction.id.substring(0, 8)}... `);
      
      try {
        // Get the church's Connect account
        let stripeAccount: string | undefined;
        
        if (transaction.church.clerkOrgId) {
          const connectAccount = await prisma.stripeConnectAccount.findUnique({
            where: { churchId: transaction.church.clerkOrgId },
            select: { stripeAccountId: true }
          });
          stripeAccount = connectAccount?.stripeAccountId;
        }

        // Retrieve the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(
          transaction.stripePaymentIntentId!,
          stripeAccount ? { stripeAccount } : undefined
        );

        // Get the actual payment method type
        let actualType = 'card'; // default
        
        if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'string') {
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(
              paymentIntent.payment_method,
              stripeAccount ? { stripeAccount } : undefined
            );
            actualType = paymentMethod.type;
          } catch (pmError) {
            // If we can't retrieve the payment method, use the first available type
            actualType = paymentIntent.payment_method_types[0] || 'card';
          }
        }

        // Check if update is needed
        if (transaction.paymentMethodType !== actualType) {
          await prisma.donationTransaction.update({
            where: { id: transaction.id },
            data: { paymentMethodType: actualType }
          });
          console.log(chalk.green(`✓ Updated from '${transaction.paymentMethodType}' to '${actualType}'`));
          updated++;
        } else {
          console.log(chalk.gray(`✓ Already correct (${actualType})`));
          skipped++;
        }
      } catch (error: any) {
        console.log(chalk.red(`✗ Error: ${error.message}`));
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue('\n📊 Results Summary\n'));
    console.log(`${chalk.green('✓ Updated:')} ${updated} transactions`);
    console.log(`${chalk.gray('⊘ Skipped:')} ${skipped} transactions (already correct)`);
    console.log(`${chalk.red('✗ Errors:')} ${errors} transactions`);
    
    // Show breakdown of payment methods found
    const methodCounts = await prisma.donationTransaction.groupBy({
      by: ['paymentMethodType'],
      where: {
        source: 'stripe',
        status: 'succeeded'
      },
      _count: true
    });

    console.log(chalk.blue('\n📈 Payment Method Distribution:\n'));
    for (const method of methodCounts) {
      console.log(`  ${method.paymentMethodType || 'null'}: ${method._count} transactions`);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Utility function to generate test UUID
function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the script
fixPaymentMethods()
  .then(() => {
    console.log(chalk.green('\n✅ Payment method fix completed successfully!\n'));
  })
  .catch((error) => {
    console.error(chalk.red('\n❌ Script failed:'), error);
    process.exit(1);
  });