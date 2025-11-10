import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreDevData() {
  // Find the most recent backup file
  const backupDir = path.join(process.cwd(), 'backups');
  const files = fs.readdirSync(backupDir);
  const backupFiles = files.filter(f => f.startsWith('dev-backup-') && f.endsWith('.json'));

  if (backupFiles.length === 0) {
    console.error('❌ No backup files found!');
    process.exit(1);
  }

  // Sort by filename (which includes timestamp) and get the most recent
  const latestBackup = backupFiles.sort().reverse()[0];
  const backupFile = path.join(backupDir, latestBackup);

  console.log(`📁 Restoring from: ${backupFile}`);

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  console.log('Starting data restore...\n');

  // Restore in correct order (respecting foreign key constraints)

  // 1. Churches first (no dependencies)
  console.log('Restoring churches...');
  for (const church of backupData.churches) {
    const { StripeConnectAccount, EmailSettings, ...churchData } = church;
    await prisma.church.create({ data: churchData });
    console.log(`  ✓ Church: ${church.name}`);

    // Restore related StripeConnectAccount if exists
    if (StripeConnectAccount) {
      await prisma.stripeConnectAccount.create({ data: StripeConnectAccount });
      console.log(`    ✓ Stripe Connect Account: ${StripeConnectAccount.stripeAccountId}`);
    }

    // Restore related EmailSettings if exists
    if (EmailSettings) {
      await prisma.emailSettings.create({ data: EmailSettings });
      console.log(`    ✓ Email Settings`);
    }
  }

  // 2. Profiles (depend on nothing)
  console.log('\nRestoring profiles...');
  for (const profile of backupData.profiles) {
    await prisma.profile.create({ data: profile });
    console.log(`  ✓ Profile: ${profile.email}`);
  }

  // 3. Donation Types (depend on Church)
  console.log('\nRestoring donation types...');
  for (const donationType of backupData.donationTypes) {
    await prisma.donationType.create({ data: donationType });
    console.log(`  ✓ Donation Type: ${donationType.name}`);
  }

  // 4. Donors (depend on Church and optionally Member)
  console.log('\nRestoring donors...');
  for (const donor of backupData.donors) {
    await prisma.donor.create({ data: donor });
    console.log(`  ✓ Donor: ${donor.email || donor.name}`);
  }

  // 5. Members (depend on Church)
  console.log('\nRestoring members...');
  for (const member of backupData.members) {
    await prisma.member.create({ data: member });
    console.log(`  ✓ Member: ${member.email}`);
  }

  // 6. Donation Transactions (depend on Church, DonationType, Donor)
  console.log('\nRestoring donation transactions...');
  for (const transaction of backupData.donationTransactions) {
    await prisma.donationTransaction.create({ data: transaction });
  }
  console.log(`  ✓ ${backupData.donationTransactions.length} transactions restored`);

  console.log('\n✅ Data restore completed!');
  console.log('\nRestore summary:');
  console.log(`- Churches: ${backupData.churches.length}`);
  console.log(`- Profiles: ${backupData.profiles.length}`);
  console.log(`- Donation Types: ${backupData.donationTypes.length}`);
  console.log(`- Donors: ${backupData.donors.length}`);
  console.log(`- Members: ${backupData.members.length}`);
  console.log(`- Donation Transactions: ${backupData.donationTransactions.length}`);

  await prisma.$disconnect();
}

restoreDevData().catch((error) => {
  console.error('Restore failed:', error);
  process.exit(1);
});
