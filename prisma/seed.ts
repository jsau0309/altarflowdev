import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting seed script...`);
  // This script currently does not seed any default data.
  // Default donation types are created by the Clerk webhook handler (/app/api/clerk-webhook/route.ts)
  // when a new church (Clerk organization) is created.
  // Add other specific seeding logic here in the future if needed.
  console.log(`Seed script finished.`);
}

main()
  .catch((e) => {
    console.error('Unhandled error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
