import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Test Slack Notification Integration
 *
 * Run this script to verify Slack webhook is configured correctly:
 * npx tsx scripts/test-slack-notification.ts
 */

async function testSlackNotification() {
  console.log('🔔 Testing Slack notification integration...\n');

  try {
    // Test 1: Payment Failure Notification
    console.log('Sending test payment failure notification...');
    await sendSlackNotification(SlackNotifications.paymentFailed({
      amount: 100,
      churchName: 'Test Church',
      error: 'This is a test notification - please ignore! ✅',
    }));
    console.log('✅ Payment failure notification sent!\n');

    // Wait a bit between notifications
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Slow Query Notification
    console.log('Sending test slow query notification...');
    await sendSlackNotification(SlackNotifications.slowQuery({
      query: 'donations.findMany',
      duration: 2500,
      endpoint: '/api/donations/list',
    }));
    console.log('✅ Slow query notification sent!\n');

    // Wait a bit between notifications
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Custom Notification
    console.log('Sending custom test notification...');
    await sendSlackNotification({
      title: 'Slack Integration Test',
      message: 'If you can see this message, your Slack integration is working perfectly! 🎉',
      severity: 'info',
      fields: [
        { title: 'Status', value: 'Connected', short: true },
        { title: 'Environment', value: 'Development', short: true },
      ],
    });
    console.log('✅ Custom notification sent!\n');

    console.log('🎉 All test notifications sent successfully!');
    console.log('📱 Check your Slack channel to see the messages.\n');
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check that SLACK_WEBHOOK_URL is set in .env.local');
    console.error('2. Verify the webhook URL is correct');
    console.error('3. Make sure the Slack app has permission to post to the channel\n');
    process.exit(1);
  }
}

testSlackNotification();
