#!/usr/bin/env node

/**
 * Diagnostic script for Stripe webhook issues
 * Helps identify why some webhooks fail signature verification
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { stripe } from '../lib/stripe';
import chalk from 'chalk';

async function diagnoseWebhooks() {
  console.log(chalk.blue('\n🔍 Diagnosing Stripe Webhook Configuration\n'));
  console.log('='.repeat(60));

  // Check environment
  console.log(chalk.yellow('\n📋 Environment Check:'));
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`STRIPE_SECRET_KEY present: ${!!process.env.STRIPE_SECRET_KEY}`);
  console.log(`STRIPE_WEBHOOK_SECRET present: ${!!process.env.STRIPE_WEBHOOK_SECRET}`);
  console.log(`STRIPE_WEBHOOK_SECRET prefix: ${process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)}...`);
  console.log(`STRIPE_WEBHOOK_SECRET length: ${process.env.STRIPE_WEBHOOK_SECRET?.length}`);

  // List webhook endpoints
  console.log(chalk.yellow('\n🌐 Webhook Endpoints on Stripe:'));
  try {
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (webhookEndpoints.data.length === 0) {
      console.log(chalk.red('No webhook endpoints found'));
    } else {
      webhookEndpoints.data.forEach((endpoint, index) => {
        console.log(`\n${index + 1}. ${endpoint.url}`);
        console.log(`   Status: ${endpoint.status}`);
        console.log(`   Events: ${endpoint.enabled_events.slice(0, 3).join(', ')}${endpoint.enabled_events.length > 3 ? '...' : ''}`);
        console.log(`   Secret: ${endpoint.secret ? endpoint.secret.substring(0, 10) + '...' : 'Not visible'}`);
        console.log(`   Created: ${new Date(endpoint.created * 1000).toLocaleDateString()}`);
      });
    }
  } catch (error) {
    console.error(chalk.red('Failed to list webhook endpoints:'), error);
  }

  // Check for common issues
  console.log(chalk.yellow('\n⚠️  Common Issues to Check:'));
  console.log('\n1. ' + chalk.cyan('Multiple webhook endpoints:'));
  console.log('   If you have both Stripe CLI and production webhooks, they use different secrets.');
  console.log('   Stripe CLI: Uses a temporary secret (whsec_...)');
  console.log('   Production: Uses the secret from your Stripe Dashboard');
  
  console.log('\n2. ' + chalk.cyan('Using ngrok or similar:'));
  console.log('   Make sure you\'re forwarding to the correct URL:');
  console.log('   stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe');
  
  console.log('\n3. ' + chalk.cyan('Secret mismatch:'));
  console.log('   The STRIPE_WEBHOOK_SECRET in .env must match:');
  console.log('   - The secret shown by "stripe listen" command (for local testing)');
  console.log('   - The webhook endpoint secret in Stripe Dashboard (for production)');

  console.log('\n4. ' + chalk.cyan('Body parsing issues:'));
  console.log('   Next.js 13+ automatically parses the body. Our route uses req.text() correctly.');

  // Recommendations
  console.log(chalk.yellow('\n✅ Recommendations:'));
  console.log('\n1. For local testing with Stripe CLI:');
  console.log(chalk.green('   stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe'));
  console.log('   Then update .env with the webhook secret shown by the command');
  
  console.log('\n2. Check if events are duplicated:');
  console.log('   Look for multiple webhook endpoints pointing to the same URL');
  
  console.log('\n3. Verify the webhook secret:');
  console.log('   The secret in .env should start with "whsec_"');

  console.log('\n' + '='.repeat(60));
}

// Run diagnostics
diagnoseWebhooks()
  .catch((error) => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  });