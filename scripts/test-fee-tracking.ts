#!/usr/bin/env node

/**
 * Test script to verify Stripe fee tracking is working correctly
 * Tests fee calculation for different payment methods
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
});

interface FeeTestResult {
  paymentMethod: string;
  amount: number;
  expectedFee: number;
  actualFee: number;
  amountReceived: number;
  passed: boolean;
  error?: string;
}

async function calculateExpectedFee(amount: number, paymentMethod: string): Promise<number> {
  // Standard Stripe fees
  if (paymentMethod === 'card' || paymentMethod === 'link') {
    // 2.9% + $0.30
    return Math.round(amount * 0.029 + 30);
  } else if (paymentMethod === 'us_bank_account' || paymentMethod === 'ach_debit') {
    // 0.8% capped at $5
    const fee = Math.round(amount * 0.008);
    return Math.min(fee, 500); // $5 in cents
  }
  // Unknown payment method
  return 0;
}

async function testFeeTracking() {
  console.log(chalk.blue('\n🧪 Testing Stripe Fee Tracking\n'));
  console.log('='.repeat(60));

  const results: FeeTestResult[] = [];

  // Get recent transactions with fee data
  console.log(chalk.yellow('\n📊 Analyzing Recent Transactions:\n'));
  
  const recentTransactions = await prisma.donationTransaction.findMany({
    where: {
      status: 'succeeded',
      source: 'stripe',
      stripeFee: { not: null }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      amount: true,
      stripeFee: true,
      amountReceived: true,
      paymentMethodType: true,
      stripePaymentIntentId: true,
      createdAt: true,
      paymentMethodDetails: true
    }
  });

  console.log(`Found ${recentTransactions.length} transactions with fee data\n`);

  for (const tx of recentTransactions) {
    const expectedFee = await calculateExpectedFee(tx.amount, tx.paymentMethodType || 'card');
    const actualFee = tx.stripeFee || 0;
    const expectedAmountReceived = tx.amount - actualFee;
    
    const result: FeeTestResult = {
      paymentMethod: tx.paymentMethodType || 'unknown',
      amount: tx.amount,
      expectedFee: expectedFee,
      actualFee: actualFee,
      amountReceived: tx.amountReceived || 0,
      passed: false
    };

    // Check if fee is within reasonable range (allow 10% variance for rounding)
    const feeVariance = Math.abs(actualFee - expectedFee);
    const allowedVariance = Math.max(expectedFee * 0.1, 1); // At least 1 cent variance allowed
    
    if (feeVariance <= allowedVariance && tx.amountReceived === expectedAmountReceived) {
      result.passed = true;
    } else if (feeVariance > allowedVariance) {
      result.error = `Fee variance too high: ${feeVariance} cents`;
    } else if (tx.amountReceived !== expectedAmountReceived) {
      result.error = `Amount received mismatch: expected ${expectedAmountReceived}, got ${tx.amountReceived}`;
    }

    results.push(result);

    // Display result
    const statusIcon = result.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${statusIcon} Transaction ${tx.id.substring(0, 8)}...`);
    console.log(`   Payment Method: ${chalk.cyan(result.paymentMethod)}`);
    console.log(`   Amount: $${(result.amount / 100).toFixed(2)}`);
    console.log(`   Stripe Fee: $${(result.actualFee / 100).toFixed(2)} (expected: $${(result.expectedFee / 100).toFixed(2)})`);
    console.log(`   Net Amount: $${(result.amountReceived / 100).toFixed(2)}`);
    
    if (result.error) {
      console.log(chalk.red(`   Error: ${result.error}`));
    }

    // Check if we have payment method details
    if (tx.paymentMethodDetails) {
      console.log(chalk.gray(`   Details: ${JSON.stringify(tx.paymentMethodDetails).substring(0, 50)}...`));
    }
    
    console.log();
  }

  // Check manual donations (should have 0 fees)
  console.log(chalk.yellow('\n💵 Checking Manual Donations:\n'));
  
  const manualDonations = await prisma.donationTransaction.findMany({
    where: {
      source: 'manual',
      status: 'succeeded'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      stripeFee: true,
      amountReceived: true,
      paymentMethodType: true,
      createdAt: true
    }
  });

  console.log(`Found ${manualDonations.length} manual donations\n`);

  for (const manual of manualDonations) {
    const hasCorrectFees = manual.stripeFee === 0 && manual.amountReceived === manual.amount;
    const statusIcon = hasCorrectFees ? chalk.green('✅') : chalk.red('❌');
    
    console.log(`${statusIcon} Manual Donation ${manual.id.substring(0, 8)}...`);
    console.log(`   Payment Method: ${chalk.cyan(manual.paymentMethodType || 'cash/check')}`);
    console.log(`   Amount: $${(manual.amount / 100).toFixed(2)}`);
    console.log(`   Stripe Fee: $${((manual.stripeFee || 0) / 100).toFixed(2)} (should be $0.00)`);
    console.log(`   Net Amount: $${((manual.amountReceived || 0) / 100).toFixed(2)}`);
    
    if (!hasCorrectFees) {
      console.log(chalk.red(`   Error: Manual donations should have 0 fees`));
    }
    console.log();
  }

  // Summary
  console.log(chalk.blue('\n📈 Test Summary:\n'));
  console.log('='.repeat(60));
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
  
  console.log(`Tests Passed: ${chalk.green(passedTests)} / ${totalTests}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  // Fee accuracy statistics
  if (results.length > 0) {
    const totalExpectedFees = results.reduce((sum, r) => sum + r.expectedFee, 0);
    const totalActualFees = results.reduce((sum, r) => sum + r.actualFee, 0);
    const feeAccuracy = 100 - Math.abs(totalActualFees - totalExpectedFees) / totalExpectedFees * 100;
    
    console.log(`\nFee Accuracy: ${feeAccuracy.toFixed(1)}%`);
    console.log(`Total Expected Fees: $${(totalExpectedFees / 100).toFixed(2)}`);
    console.log(`Total Actual Fees: $${(totalActualFees / 100).toFixed(2)}`);
  }

  // Recommendations
  console.log(chalk.blue('\n💡 Recommendations:\n'));
  
  if (recentTransactions.length === 0) {
    console.log(chalk.yellow('⚠️  No transactions with fee data found. Make sure:'));
    console.log('   1. The webhook handler is properly updating stripeFee field');
    console.log('   2. You have processed new donations after the fee tracking update');
    console.log('   3. The database migration has been applied');
  }
  
  if (Number(passRate) < 90) {
    console.log(chalk.yellow('⚠️  Fee calculation accuracy is below 90%. Check:'));
    console.log('   1. Stripe API version for fee structure changes');
    console.log('   2. Special pricing agreements on your Stripe account');
    console.log('   3. International card fees which may be higher');
  }

  // Test Stripe API directly for comparison
  if (process.env.STRIPE_SECRET_KEY && recentTransactions.length > 0) {
    console.log(chalk.blue('\n🔍 Verifying with Stripe API:\n'));
    
    const sampleTx = recentTransactions[0];
    if (sampleTx.stripePaymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          sampleTx.stripePaymentIntentId,
          { expand: ['latest_charge.balance_transaction'] }
        );
        
        const charge = paymentIntent.latest_charge as Stripe.Charge;
        const balanceTransaction = charge?.balance_transaction as Stripe.BalanceTransaction;
        
        if (balanceTransaction) {
          console.log(`Sample verification for ${sampleTx.id.substring(0, 8)}:`);
          console.log(`   Stripe Gross: $${(balanceTransaction.amount / 100).toFixed(2)}`);
          console.log(`   Stripe Fee: $${(balanceTransaction.fee / 100).toFixed(2)}`);
          console.log(`   Stripe Net: $${(balanceTransaction.net / 100).toFixed(2)}`);
          console.log(`   Our Stored Fee: $${((sampleTx.stripeFee || 0) / 100).toFixed(2)}`);
          
          const feeMatch = balanceTransaction.fee === sampleTx.stripeFee;
          console.log(`   Fee Match: ${feeMatch ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
        }
      } catch (error) {
        console.log(chalk.red('   Could not retrieve from Stripe:', error));
      }
    }
  }
}

// Run the test
testFeeTracking()
  .catch((error) => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });