#!/usr/bin/env node

/**
 * Test Stripe Webhook Configuration
 * 
 * This script helps test your webhook configuration by:
 * 1. Creating a test payment intent
 * 2. Confirming the payment
 * 3. Checking if the webhook was received and processed
 * 
 * Usage: node scripts/test-webhook.js
 */

// Load environment variables first
require('dotenv').config();

// Check environment before initializing
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  console.error('Make sure you have a .env file with STRIPE_SECRET_KEY set');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWebhook() {
  console.log('🧪 Starting Stripe Webhook Test...\n');

  let transaction = null;
  
  try {
    // 1. Create a test payment intent
    console.log('1️⃣  Creating test payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      automatic_payment_methods: { 
        enabled: true,
        allow_redirects: 'never' // Prevent redirect-based payment methods
      },
      metadata: {
        test: 'true',
        testTimestamp: new Date().toISOString(),
      },
    });
    console.log(`✅ Created payment intent: ${paymentIntent.id}`);

    // 2. Create a test transaction record
    console.log('\n2️⃣  Creating test transaction record...');
    const church = await prisma.church.findFirst();
    if (!church) {
      throw new Error('No church found in database. Please create a church first.');
    }

    const donationType = await prisma.donationType.findFirst({
      where: { churchId: church.id },
    });
    if (!donationType) {
      throw new Error('No donation type found. Please create a donation type first.');
    }

    transaction = await prisma.donationTransaction.create({
      data: {
        churchId: church.id,
        donationTypeId: donationType.id,
        amount: 1000,
        currency: 'usd',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        donorName: 'Webhook Test',
        donorEmail: 'test@webhook.com',
      },
    });
    console.log(`✅ Created transaction: ${transaction.id}`);

    // 3. Confirm the payment intent with a test card
    console.log('\n3️⃣  Confirming payment with test card...');
    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa', // Test card that always succeeds
    });
    console.log(`✅ Payment confirmed: ${confirmedPayment.status}`);

    // 4. Wait for webhook to process
    console.log('\n4️⃣  Waiting for webhook to process (10 seconds)...');
    await sleep(10000);

    // 5. Check if transaction was updated
    console.log('\n5️⃣  Checking transaction status...');
    const updatedTransaction = await prisma.donationTransaction.findUnique({
      where: { id: transaction.id },
    });

    if (updatedTransaction?.status === 'succeeded') {
      console.log('✅ SUCCESS: Transaction status updated to "succeeded"');
      console.log('🎉 Webhook is working correctly!');
    } else {
      console.log(`❌ FAILED: Transaction status is still "${updatedTransaction?.status}"`);
      console.log('\nPossible issues:');
      
      // Check if we're in local development
      if (process.env.STRIPE_WEBHOOK_SECRET?.includes('whsec_test_') || process.env.NODE_ENV === 'development') {
        console.log('\n🔧 LOCAL DEVELOPMENT DETECTED');
        console.log('For local testing, you need to run Stripe CLI:');
        console.log('\n1. In a new terminal, run:');
        console.log('   stripe listen --forward-to localhost:3000/api/webhooks/stripe');
        console.log('\n2. Update your .env file with the webhook secret shown by Stripe CLI');
        console.log('   STRIPE_WEBHOOK_SECRET=whsec_test_...');
        console.log('\n3. Keep Stripe CLI running while testing');
      } else {
        console.log('- Webhook endpoint not configured in Stripe Dashboard');
        console.log('- Wrong webhook secret in environment variables');
        console.log('- Webhook endpoint not accessible from internet');
      }
      
      console.log('\n- Check your server logs for webhook errors');
      
      // Check health endpoint
      console.log('\n📊 Run webhook health check:');
      console.log('curl http://localhost:3000/api/webhooks/stripe/health');
    }

    // 6. Cleanup (optional)
    console.log('\n6️⃣  Cleaning up test data...');
    await prisma.donationTransaction.delete({
      where: { id: transaction.id },
    });
    console.log('✅ Test transaction deleted');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Cleanup on error
    if (transaction) {
      try {
        console.log('\n🧹 Cleaning up test transaction due to error...');
        await prisma.donationTransaction.delete({
          where: { id: transaction.id },
        });
        console.log('✅ Test transaction deleted');
      } catch (cleanupError) {
        console.error('Failed to cleanup transaction:', cleanupError.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🔧 Test Configuration:');
console.log(`- Stripe Mode: ${process.env.STRIPE_SECRET_KEY.includes('sk_test') ? 'TEST' : 'LIVE'}`);
console.log(`- Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Configured' : 'NOT CONFIGURED'}`);
console.log(`- Node Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Run the test
testWebhook();