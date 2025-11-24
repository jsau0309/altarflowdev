/**
 * Test script to verify health check notification logic
 * 
 * This script simulates the health check behavior and verifies that:
 * 1. Notifications are sent only on state transitions (healthy → unhealthy)
 * 2. Notifications are NOT sent on subsequent cache misses while still unhealthy
 * 3. Recovery notifications are sent when transitioning back (unhealthy → healthy)
 * 4. No spam occurs during extended outages
 */

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Simulate the health check state management
interface HealthCheckCache {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
}

let healthCheckCache: HealthCheckCache | null = null;
let lastNotificationStatus: 'healthy' | 'unhealthy' | null = null;
let notificationsSent: string[] = [];

function shouldSendFailureNotification(): boolean {
  const wasHealthy = healthCheckCache?.status === 'healthy' || healthCheckCache === null;
  return wasHealthy && lastNotificationStatus !== 'unhealthy';
}

function shouldSendRecoveryNotification(): boolean {
  const wasUnhealthy = healthCheckCache?.status === 'unhealthy';
  return wasUnhealthy && lastNotificationStatus === 'unhealthy';
}

function simulateHealthCheck(status: 'healthy' | 'unhealthy', checkNumber: number) {
  log(`\n--- Check ${checkNumber}: ${status.toUpperCase()} ---`, 'cyan');
  
  if (status === 'unhealthy') {
    // Check if we should send notification
    const shouldNotify = shouldSendFailureNotification();
    
    if (shouldNotify) {
      notificationsSent.push(`Check ${checkNumber}: FAILURE notification`);
      log('  🔔 NOTIFICATION SENT: Service unhealthy', 'red');
      lastNotificationStatus = 'unhealthy';
    } else {
      log('  🔕 Notification suppressed (already notified)', 'yellow');
    }
    
    // Update cache
    healthCheckCache = {
      status: 'unhealthy',
      timestamp: Date.now(),
    };
  } else {
    // Check if we should send recovery notification
    const shouldNotify = shouldSendRecoveryNotification();
    
    if (shouldNotify) {
      notificationsSent.push(`Check ${checkNumber}: RECOVERY notification`);
      log('  🔔 NOTIFICATION SENT: Service recovered', 'green');
      lastNotificationStatus = 'healthy';
    } else {
      log('  ✓ Service healthy (no notification needed)', 'green');
    }
    
    // Update cache
    healthCheckCache = {
      status: 'healthy',
      timestamp: Date.now(),
    };
  }
  
  log(`  Cache: ${healthCheckCache.status}`, 'blue');
  log(`  Last notification: ${lastNotificationStatus || 'none'}`, 'blue');
}

function runTest() {
  log('═══════════════════════════════════════════', 'magenta');
  log('  Health Check Notification Test', 'magenta');
  log('═══════════════════════════════════════════', 'magenta');
  
  log('\nSimulating uptime monitoring (5-minute intervals):', 'cyan');
  log('Cache expires after 4 minutes, triggering new API calls\n', 'yellow');
  
  // Test scenario: Service goes down, stays down for multiple checks, then recovers
  
  // Initial healthy state
  simulateHealthCheck('healthy', 1);
  
  // Cache expires (4 min), check fails - SHOULD NOTIFY (transition to unhealthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('unhealthy', 2);
  
  // Cache expires (4 min), still failing - SHOULD NOT NOTIFY (already unhealthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('unhealthy', 3);
  
  // Cache expires (4 min), still failing - SHOULD NOT NOTIFY (still unhealthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('unhealthy', 4);
  
  // Cache expires (4 min), still failing - SHOULD NOT NOTIFY (still unhealthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('unhealthy', 5);
  
  // Cache expires (4 min), service recovers - SHOULD NOTIFY (transition to healthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('healthy', 6);
  
  // Cache expires (4 min), still healthy - SHOULD NOT NOTIFY (already healthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('healthy', 7);
  
  // Another failure - SHOULD NOTIFY (new transition to unhealthy)
  log('\n⏰ 4 minutes pass... cache expires', 'yellow');
  simulateHealthCheck('unhealthy', 8);
  
  // Results
  log('\n═══════════════════════════════════════════', 'magenta');
  log('  Test Results', 'magenta');
  log('═══════════════════════════════════════════', 'magenta');
  
  log(`\nTotal health checks: 8`, 'cyan');
  log(`Total notifications sent: ${notificationsSent.length}`, 'cyan');
  log('\nNotifications:', 'cyan');
  notificationsSent.forEach(notification => {
    log(`  - ${notification}`, 'blue');
  });
  
  // Validation
  log('\n═══════════════════════════════════════════', 'magenta');
  log('  Validation', 'magenta');
  log('═══════════════════════════════════════════', 'magenta');
  
  const expectedNotifications = 3; // 2 failures + 1 recovery
  const expectedSequence = [
    'Check 2: FAILURE notification',   // First failure
    'Check 6: RECOVERY notification',  // Recovery
    'Check 8: FAILURE notification',   // Second failure
  ];
  
  let passed = true;
  
  if (notificationsSent.length !== expectedNotifications) {
    log(`\n✗ FAILED: Expected ${expectedNotifications} notifications, got ${notificationsSent.length}`, 'red');
    passed = false;
  } else {
    log(`\n✓ Correct number of notifications (${expectedNotifications})`, 'green');
  }
  
  for (let i = 0; i < expectedSequence.length; i++) {
    if (notificationsSent[i] !== expectedSequence[i]) {
      log(`✗ FAILED: Expected "${expectedSequence[i]}", got "${notificationsSent[i]}"`, 'red');
      passed = false;
    } else {
      log(`✓ Notification ${i + 1} correct`, 'green');
    }
  }
  
  if (passed) {
    log('\n🎉 All validations passed!', 'green');
    log('\n✓ Notifications only sent on state transitions', 'green');
    log('✓ No spam during extended outages', 'green');
    log('✓ Recovery notifications sent when service comes back', 'green');
    return 0;
  } else {
    log('\n❌ Some validations failed', 'red');
    return 1;
  }
}

// Run test
process.exit(runTest());

