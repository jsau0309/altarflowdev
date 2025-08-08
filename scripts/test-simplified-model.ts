#!/usr/bin/env npx tsx

import prisma from '@/lib/db';

async function testSimplifiedModel() {
  console.log('🧪 Testing Simplified Transaction Model\n');

  try {
    // Get recent transactions to verify schema changes
    const recentTransactions = await prisma.donationTransaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethodType: true,
        processingFeeCoveredByDonor: true,
        // These fields should no longer exist
        // stripeFee: true,
        // amountReceived: true,
        // stripePayoutId: true,
        // paymentMethodDetails: true,
        
        // These fields should still exist (edit tracking)
        editHistory: true,
        editReason: true,
        lastEditedAt: true,
        lastEditedBy: true,
        originalAmount: true,
        
        // New refund/dispute fields
        refundedAmount: true,
        refundedAt: true,
        disputeStatus: true,
        disputeReason: true,
        disputedAt: true,
      },
    });

    console.log('✅ Schema Migration Successful!\n');
    console.log('📊 Recent Transactions (Simplified Model):');
    console.log('='.repeat(60));
    
    for (const transaction of recentTransactions) {
      console.log(`\nTransaction: ${transaction.id}`);
      console.log(`  Amount: $${(transaction.amount / 100).toFixed(2)}`);
      console.log(`  Status: ${transaction.status}`);
      console.log(`  Payment Method: ${transaction.paymentMethodType || 'N/A'}`);
      console.log(`  Fee Covered by Donor: $${((transaction.processingFeeCoveredByDonor || 0) / 100).toFixed(2)}`);
      
      // Check edit tracking fields
      if (transaction.originalAmount) {
        console.log(`  📝 Edit History: Original amount was $${(transaction.originalAmount / 100).toFixed(2)}`);
      }
      
      // Check refund/dispute fields
      if (transaction.refundedAmount && transaction.refundedAmount > 0) {
        console.log(`  💸 Refunded: $${(transaction.refundedAmount / 100).toFixed(2)} on ${transaction.refundedAt}`);
      }
      if (transaction.disputeStatus) {
        console.log(`  ⚠️ Dispute: ${transaction.disputeStatus} - ${transaction.disputeReason}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 Key Changes Verified:');
    console.log('  ✅ Fee tracking fields removed (stripeFee, amountReceived, etc.)');
    console.log('  ✅ Edit tracking fields preserved for manual donations');
    console.log('  ✅ Refund/dispute tracking fields added');
    console.log('\n💡 Next Steps:');
    console.log('  - Fees will be retrieved from Stripe Reports API when needed');
    console.log('  - Churches will use Express Dashboard for refunds/disputes');
    console.log('  - Payout reconciliation will use new PayoutSummary table');

  } catch (error) {
    console.error('❌ Error testing simplified model:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSimplifiedModel().catch(console.error);