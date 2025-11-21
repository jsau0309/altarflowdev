/**
 * Simple Slack Webhook Test
 *
 * This bypasses all our code and tests the webhook directly
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error('❌ SLACK_WEBHOOK_URL not found in environment');
  process.exit(1);
}

console.log('Testing Slack webhook...');
console.log('Webhook URL:', WEBHOOK_URL);

async function testWebhook() {
  try {
    // Test 1: Simple text message
    console.log('\n📤 Sending simple text message...');
    const response1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello from AltarFlow! 🎉 This is a simple test message.'
      }),
    });

    const text1 = await response1.text();
    console.log('Response:', response1.status, text1);

    if (response1.status === 200) {
      console.log('✅ Simple message sent!');
    } else {
      console.log('❌ Failed:', text1);
    }

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Attachment with color
    console.log('\n📤 Sending message with attachment...');
    const response2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: '#ff0000',
          title: '🔥 Test Alert',
          text: 'This is a test alert with red color bar',
          footer: 'AltarFlow Monitoring',
          ts: Math.floor(Date.now() / 1000),
        }]
      }),
    });

    const text2 = await response2.text();
    console.log('Response:', response2.status, text2);

    if (response2.status === 200) {
      console.log('✅ Attachment message sent!');
    } else {
      console.log('❌ Failed:', text2);
    }

    console.log('\n📱 Check your #monitoring channel in Slack!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testWebhook();
