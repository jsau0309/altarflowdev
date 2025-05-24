import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding default donation types...`);

  const churches = await prisma.church.findMany();

  if (churches.length === 0) {
    console.log('No churches found in the database. Seed script will not add default donation types.');
    // You might want to create a default church here if your app requires at least one.
    // For now, we'll just log and exit if no churches exist.
  } else {
    const defaultDonationTypes = [
      { name: 'Tithe', description: 'Regular giving to support the church\'s mission and ministries.', isRecurringAllowed: true },
      { name: 'Offering', description: 'General contributions and special one-time gifts.', isRecurringAllowed: true },
      // You can add more default types here if needed in the future
      // { name: 'Building Fund', description: 'Contributions towards new building projects or renovations.', isRecurringAllowed: true },
      // { name: 'Missions', description: 'Support for local and international mission work.', isRecurringAllowed: true },
    ];

    for (const church of churches) {
      console.log(`Processing church: ${church.name} (ID: ${church.id})`);
      for (const type of defaultDonationTypes) {
        try {
          const existingType = await prisma.donationType.findUnique({
            where: {
              churchId_name: { // Using the @@unique constraint
                churchId: church.id,
                name: type.name,
              },
            },
          });

          if (!existingType) {
            await prisma.donationType.create({
              data: {
                churchId: church.id,
                name: type.name,
                description: type.description,
                isRecurringAllowed: type.isRecurringAllowed,
              },
            });
            console.log(`  ✅ Created default donation type "${type.name}" for church "${church.name}".`);
          } else {
            console.log(`  ℹ️ Default donation type "${type.name}" already exists for church "${church.name}".`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing donation type "${type.name}" for church "${church.name}":`, error);
        }
      }
    }
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error('Unhandled error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
