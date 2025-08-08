#!/usr/bin/env node

/**
 * Test script to verify payment method detection is working correctly
 * Tests different payment methods to ensure proper detection
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log(chalk.blue('\n🧪 Payment Method Detection Test\n'));
console.log('='.repeat(60));

// Test payment methods with their Stripe test tokens/numbers
const testMethods = [
  {
    type: 'card',
    name: 'Visa Card',
    testNumber: '4242424242424242',
    description: 'Standard credit card payment'
  },
  {
    type: 'us_bank_account',
    name: 'ACH Bank Transfer',
    testNumber: 'Routing: 110000000, Account: 000123456789',
    description: 'ACH direct debit (takes 3-5 days)'
  },
  {
    type: 'link',
    name: 'Stripe Link',
    testNumber: 'Use test email with Link enabled',
    description: 'Stripe Link saved payment method'
  },
  {
    type: 'cashapp',
    name: 'Cash App Pay',
    testNumber: 'Test via Stripe Dashboard',
    description: 'Cash App mobile payment'
  }
];

console.log(chalk.yellow('Payment Methods to Test:\n'));

testMethods.forEach((method, index) => {
  console.log(chalk.cyan(`${index + 1}. ${method.name} (${method.type})`));
  console.log(`   Test with: ${method.testNumber}`);
  console.log(`   ${chalk.gray(method.description)}`);
  console.log();
});

console.log('='.repeat(60));
console.log(chalk.yellow('\n📝 Manual Testing Instructions:\n'));

console.log('1. Start your development server:');
console.log(chalk.green('   npm run dev\n'));

console.log('2. Start Stripe CLI webhook forwarding:');
console.log(chalk.green('   stripe listen --forward-to https://testaltarflow.ngrok.app/api/webhooks/stripe\n'));

console.log('3. Visit a church donation page and test each payment method\n');

console.log('4. For Card payments:');
console.log('   - Use test card: 4242 4242 4242 4242');
console.log('   - Any future expiry date and any CVC\n');

console.log('5. For ACH/Bank payments:');
console.log('   - Use test routing: 110000000');
console.log('   - Use test account: 000123456789');
console.log('   - This will show as "processing" for ACH\n');

console.log('6. After each test, check the database:');
console.log(chalk.green(`   SELECT id, status, "paymentMethodType", "processedAt" 
   FROM "DonationTransaction" 
   ORDER BY "createdAt" DESC 
   LIMIT 5;\n`));

console.log('7. Verify in the donations dashboard that payment methods show correctly\n');

console.log('='.repeat(60));
console.log(chalk.blue('\n🎯 Expected Results:\n'));

console.log('✅ Card payments should show as:', chalk.green('"card"'));
console.log('✅ ACH payments should show as:', chalk.green('"us_bank_account"'));
console.log('✅ Link payments should show as:', chalk.green('"link"'));
console.log('✅ Cash App should show as:', chalk.green('"cashapp"'));
console.log('✅ Manual cash/check should show as:', chalk.green('"cash" or "check"'));

console.log('\n' + '='.repeat(60));
console.log(chalk.yellow('\n⚠️  Common Issues:\n'));

console.log('• If all show as "card": Payment method detection not working');
console.log('• If ACH shows "succeeded" immediately: Should be "processing" first');
console.log('• If webhook fails: Check ngrok URL and webhook secret\n');

console.log(chalk.green('Ready to test! Follow the instructions above.\n'));