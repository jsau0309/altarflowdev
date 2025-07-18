import { prisma } from '@/lib/db';

// Test script to verify account.updated webhook handling
async function testAccountWebhook() {
  console.log('Testing account.updated webhook handler...\n');
  
  // First, let's check current state of a StripeConnectAccount
  const churchId = 'org_2nh4V89CenhPPrTOTO5QASiP1b1'; // Puerta de Salvacion
  
  console.log('1. Checking current StripeConnectAccount state...');
  const account = await prisma.stripeConnectAccount.findUnique({
    where: { churchId },
  });
  
  if (!account) {
    console.log('❌ No StripeConnectAccount found for this church');
    return;
  }
  
  console.log('Current state:');
  console.log(`- Account ID: ${account.stripeAccountId}`);
  console.log(`- Charges Enabled: ${account.chargesEnabled}`);
  console.log(`- Verification Status: ${account.verificationStatus}`);
  console.log(`- Updated At: ${account.updatedAt}\n`);
  
  // Simulate webhook payload
  const webhookPayload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'account.updated',
    created: Date.now(),
    livemode: false,
    data: {
      object: {
        id: account.stripeAccountId,
        object: 'account',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          disabled_reason: null,
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
        },
        metadata: {},
      },
    },
  };
  
  console.log('2. Sending test webhook to endpoint...');
  const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test_signature', // This will fail verification but that's ok for testing
    },
    body: JSON.stringify(webhookPayload),
  });
  
  console.log(`Response status: ${response.status}`);
  const responseData = await response.json();
  console.log('Response:', responseData);
  
  // Check if database was updated
  console.log('\n3. Checking if database was updated...');
  const updatedAccount = await prisma.stripeConnectAccount.findUnique({
    where: { churchId },
  });
  
  if (updatedAccount) {
    console.log('Updated state:');
    console.log(`- Charges Enabled: ${updatedAccount.chargesEnabled}`);
    console.log(`- Verification Status: ${updatedAccount.verificationStatus}`);
    console.log(`- Updated At: ${updatedAccount.updatedAt}`);
    
    if (updatedAccount.updatedAt > account.updatedAt) {
      console.log('\n✅ Database was successfully updated!');
    } else {
      console.log('\n❌ Database was not updated');
    }
  }
}

// Run the test
testAccountWebhook()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });