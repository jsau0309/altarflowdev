// Test script to send account.updated webhook to ngrok endpoint
const https = require('https');

const webhookPayload = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'acct_1RT72i4esY43ZMyQ',
      object: 'account',
      business_type: 'non_profit',
      capabilities: {
        card_payments: 'active',
        transfers: 'active'
      },
      charges_enabled: true,
      country: 'US',
      created: 1729874778,
      default_currency: 'usd',
      details_submitted: true,
      email: 'pastor@puertadesalvacion.com',
      metadata: {},
      payouts_enabled: true,
      requirements: {
        current_deadline: null,
        currently_due: [],
        disabled_reason: null,
        errors: [],
        eventually_due: [],
        past_due: [],
        pending_verification: []
      },
      settings: {
        dashboard: {
          display_name: 'Puerta de Salvacion'
        }
      },
      tos_acceptance: {
        date: 1729874800,
        ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      },
      type: 'express'
    },
    previous_attributes: {
      charges_enabled: false,
      payouts_enabled: false,
      requirements: {
        currently_due: ['external_account'],
        eventually_due: ['external_account']
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null
  },
  type: 'account.updated'
};

const data = JSON.stringify(webhookPayload);

const options = {
  hostname: 'testaltarflow.ngrok.app',
  port: 443,
  path: '/api/webhooks/stripe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'stripe-signature': 't=1234567890,v1=test_signature' // Will fail verification but that's ok for testing
  }
};

console.log('Sending test account.updated webhook to https://testaltarflow.ngrok.app/api/webhooks/stripe');
console.log('Account ID:', webhookPayload.data.object.id);
console.log('Charges Enabled:', webhookPayload.data.object.charges_enabled);
console.log('Payouts Enabled:', webhookPayload.data.object.payouts_enabled);

const req = https.request(options, (res) => {
  console.log(`\nStatus Code: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    
    if (res.statusCode === 400 && responseData.includes('Signature verification failed')) {
      console.log('\n⚠️  Webhook signature verification failed (expected in dev)');
      console.log('To test properly, you need to:');
      console.log('1. Set SKIP_WEBHOOK_VERIFICATION=true in your .env');
      console.log('2. Or use the actual Stripe webhook secret');
    } else if (res.statusCode === 200) {
      console.log('\n✅ Webhook processed successfully!');
      console.log('Check your database to verify the StripeConnectAccount was updated.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error sending webhook:', error);
});

req.write(data);
req.end();