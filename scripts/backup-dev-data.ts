import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backupDevData() {
  console.log('Starting backup of development data...');

  const backup = {
    timestamp: new Date().toISOString(),
    churches: await prisma.church.findMany({
      include: {
        StripeConnectAccount: true,
        EmailSettings: true,
      },
    }),
    profiles: await prisma.profile.findMany(),
    donationTypes: await prisma.donationType.findMany(),
    donationTransactions: await prisma.donationTransaction.findMany(),
    donors: await prisma.donor.findMany(),
    members: await prisma.member.findMany(),
  };

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const backupFile = path.join(
    backupDir,
    `dev-backup-${new Date().toISOString().replace(/:/g, '-')}.json`
  );

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup completed!`);
  console.log(`📁 Backup saved to: ${backupFile}`);
  console.log(`\nBackup summary:`);
  console.log(`- Churches: ${backup.churches.length}`);
  console.log(`- Profiles: ${backup.profiles.length}`);
  console.log(`- Donation Types: ${backup.donationTypes.length}`);
  console.log(`- Donation Transactions: ${backup.donationTransactions.length}`);
  console.log(`- Donors: ${backup.donors.length}`);
  console.log(`- Members: ${backup.members.length}`);

  await prisma.$disconnect();
}

backupDevData().catch((error) => {
  console.error('Backup failed:', error);
  process.exit(1);
});
