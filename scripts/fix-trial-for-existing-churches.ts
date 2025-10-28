/**
 * One-time script to update existing churches to have 30-day trial access
 * Run with: npx ts-node scripts/fix-trial-for-existing-churches.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting trial migration for existing churches...\n');

  // Find all churches with 'free' status
  const freeChurches = await prisma.church.findMany({
    where: {
      subscriptionStatus: 'free',
      setupFeePaid: false, // Only churches that haven't been processed yet
    },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${freeChurches.length} churches with free status to update\n`);

  if (freeChurches.length === 0) {
    console.log('No churches to update. Exiting.');
    return;
  }

  // Calculate trial dates
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  for (const church of freeChurches) {
    console.log(`Updating church: ${church.name} (${church.clerkOrgId})`);

    await prisma.church.update({
      where: { id: church.id },
      data: {
        subscriptionStatus: 'trial',
        setupFeePaid: true,
        freeTrialStartedAt: now,
        trialEndsAt: trialEnd,
      },
    });

    console.log(`  ✅ Trial started: 30 days (ends ${trialEnd.toISOString()})\n`);
  }

  console.log(`\n✅ Successfully updated ${freeChurches.length} churches to trial status!`);
  console.log('All churches now have 30 days of full access.');
}

main()
  .catch((e) => {
    console.error('Error updating churches:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
