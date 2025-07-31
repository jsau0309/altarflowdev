import { PrismaClient } from "@prisma/client";
import { hasPaidSubscription, getQuotaLimit } from "../lib/subscription-helpers";

const prisma = new PrismaClient();

/**
 * Generates a comprehensive diagnostic report on church subscription statuses, comparing helper function logic with route logic and highlighting discrepancies.
 *
 * Fetches all churches from the database, groups them by subscription status, and outputs detailed information for each church, including subscription details, campaign counts, and computed values from helper functions. Identifies and logs inconsistencies between the subscription helper logic and the simplified route logic, with special handling for statuses such as 'past_due', 'canceled', and 'grace_period'. Summarizes findings and lists churches with mismatched paid status determinations.
 */
async function debugSubscriptionStatus() {
  console.log("=== Debug Subscription Status Report ===");
  console.log("Generated at:", new Date().toISOString());
  console.log("\n");

  try {
    // Query all churches from the database
    const churches = await prisma.church.findMany({
      select: {
        id: true,
        name: true,
        clerkOrgId: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: {
            emailCampaigns: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total churches found: ${churches.length}\n`);

    // Group churches by subscription status
    const groupedByStatus = churches.reduce((acc, church) => {
      const status = church.subscriptionStatus || 'none';
      if (!acc[status]) acc[status] = [];
      acc[status].push(church);
      return acc;
    }, {} as Record<string, typeof churches>);

    console.log("Churches by subscription status:");
    Object.entries(groupedByStatus).forEach(([status, churchList]) => {
      console.log(`  ${status}: ${churchList.length} churches`);
    });
    console.log("\n");

    // Detailed analysis for each church
    console.log("=== Detailed Church Analysis ===\n");

    for (const church of churches) {
      console.log(`Church: ${church.name}`);
      console.log(`  ID: ${church.id}`);
      console.log(`  Clerk Org ID: ${church.clerkOrgId || 'none'}`);
      console.log(`  Created: ${church.createdAt.toISOString()}`);
      console.log(`  Total campaigns: ${church._count.emailCampaigns}`);
      console.log("\n  Subscription Details:");
      console.log(`    Status: ${church.subscriptionStatus}`);
      console.log(`    Plan: ${church.subscriptionPlan || 'none'}`);
      console.log(`    Ends at: ${church.subscriptionEndsAt ? church.subscriptionEndsAt.toISOString() : 'none'}`);
      console.log(`    Trial ends at: ${church.trialEndsAt ? church.trialEndsAt.toISOString() : 'none'}`);
      
      // Check subscription helpers
      const isPaid = hasPaidSubscription(church);
      const quotaLimit = getQuotaLimit(church);
      
      console.log("\n  Calculated Values:");
      console.log(`    hasPaidSubscription(): ${isPaid}`);
      console.log(`    getQuotaLimit(): ${quotaLimit}`);
      
      // Check the actual quota route logic (simplified version)
      const isPaidByRouteLogic = church.subscriptionStatus === 'active';
      const quotaByRouteLogic = isPaidByRouteLogic ? 9999 : 4;
      
      console.log("\n  Route Logic Values:");
      console.log(`    isPaidChurch (status === 'active'): ${isPaidByRouteLogic}`);
      console.log(`    quotaLimit (route): ${quotaByRouteLogic}`);
      
      // Flag discrepancies
      if (isPaid !== isPaidByRouteLogic) {
        console.log("\n  ⚠️  DISCREPANCY DETECTED!");
        console.log(`    subscription-helpers says isPaid: ${isPaid}`);
        console.log(`    quota route logic says isPaid: ${isPaidByRouteLogic}`);
      }
      
      if (quotaLimit !== quotaByRouteLogic) {
        console.log("\n  ⚠️  QUOTA MISMATCH!");
        console.log(`    subscription-helpers quota: ${quotaLimit}`);
        console.log(`    quota route quota: ${quotaByRouteLogic}`);
      }
      
      // Special cases to watch for
      if (church.subscriptionStatus === 'past_due' || 
          church.subscriptionStatus === 'canceled' || 
          church.subscriptionStatus === 'grace_period') {
        console.log("\n  📌 Special Status Note:");
        console.log(`    This church has status '${church.subscriptionStatus}' which should be handled specially`);
        
        if (church.subscriptionEndsAt) {
          const endDate = new Date(church.subscriptionEndsAt);
          const now = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`    Days remaining: ${daysRemaining}`);
          
          if (church.subscriptionStatus === 'grace_period') {
            const gracePeriodEnd = new Date(endDate);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);
            const graceDaysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`    Grace period days remaining: ${graceDaysRemaining}`);
          }
        }
      }
      
      console.log("\n" + "=".repeat(60) + "\n");
    }

    // Summary of issues
    console.log("=== SUMMARY ===\n");
    
    const paidChurchesByHelpers = churches.filter(c => hasPaidSubscription(c));
    const paidChurchesByRoute = churches.filter(c => c.subscriptionStatus === 'active');
    
    console.log(`Churches with paid subscription (subscription-helpers): ${paidChurchesByHelpers.length}`);
    console.log(`Churches with paid subscription (quota route logic): ${paidChurchesByRoute.length}`);
    
    if (paidChurchesByHelpers.length !== paidChurchesByRoute.length) {
      console.log("\n🚨 ISSUE IDENTIFIED:");
      console.log("The quota route is only checking for 'active' status, but subscription-helpers also includes:");
      console.log("  - past_due");
      console.log("  - canceled (within grace period)");
      console.log("  - grace_period (within 2 extra days)");
      
      const missedStatuses = ['past_due', 'canceled', 'grace_period'];
      const missedChurches = churches.filter(c => 
        missedStatuses.includes(c.subscriptionStatus) && hasPaidSubscription(c)
      );
      
      if (missedChurches.length > 0) {
        console.log(`\nChurches being treated as free but should be paid (${missedChurches.length}):`);
        missedChurches.forEach(church => {
          console.log(`  - ${church.name} (${church.subscriptionStatus})`);
        });
      }
    }

  } catch (error) {
    console.error("Error running debug script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugSubscriptionStatus();