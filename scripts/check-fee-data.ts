#!/usr/bin/env node

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkFeeData() {
  console.log(chalk.blue('\n📊 Checking Fee Data in Database\n'));
  
  // Check recent Stripe donations
  const stripeDonations = await prisma.donationTransaction.findMany({
    where: {
      source: 'stripe',
      status: 'succeeded'
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      amount: true,
      stripeFee: true,
      amountReceived: true,
      paymentMethodType: true,
      createdAt: true,
      stripePaymentIntentId: true
    }
  });

  console.log(chalk.yellow('Stripe Donations:'));
  console.log('ID | Amount | Fee | Net | Method | Has Fee Data');
  console.log('-'.repeat(70));
  
  stripeDonations.forEach(d => {
    const hasFeeData = d.stripeFee !== null && d.amountReceived !== null;
    console.log(
      `${d.id.substring(0, 8)} | $${(d.amount / 100).toFixed(2)} | $${((d.stripeFee || 0) / 100).toFixed(2)} | $${((d.amountReceived || 0) / 100).toFixed(2)} | ${d.paymentMethodType || 'N/A'} | ${hasFeeData ? '✅' : '❌'}`
    );
  });

  // Check manual donations
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

  console.log(chalk.yellow('\n\nManual Donations:'));
  console.log('ID | Amount | Fee | Net | Method | Correct');
  console.log('-'.repeat(70));
  
  manualDonations.forEach(d => {
    const isCorrect = d.stripeFee === 0 && d.amountReceived === d.amount;
    console.log(
      `${d.id.substring(0, 8)} | $${(d.amount / 100).toFixed(2)} | $${((d.stripeFee || 0) / 100).toFixed(2)} | $${((d.amountReceived || 0) / 100).toFixed(2)} | ${d.paymentMethodType || 'N/A'} | ${isCorrect ? '✅' : '❌'}`
    );
  });
}

checkFeeData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());