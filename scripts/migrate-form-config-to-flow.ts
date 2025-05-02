// scripts/migrate-form-config-to-flow.ts

import { PrismaClient, FlowType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Define the structure we expect within configJson for the NEW_MEMBER flow
interface NewMemberFlowConfig {
  serviceTimes: any[]; // Use 'any' for now, refine with actual ServiceTime type if imported
  ministries: any[];   // Use 'any' for now, refine with actual Ministry type if imported
  settings: any;       // Use 'any' for now, refine with actual Settings type if imported
}

async function main() {
  console.log('Starting migration of Church form config to default Flow...');

  const churches = await prisma.church.findMany({
    select: {
      id: true,
      clerkOrgId: true,
      serviceTimesJson: true,
      ministriesJson: true,
      settingsJson: true,
      _count: { // Check if a NEW_MEMBER flow already exists
        select: { flows: { where: { type: FlowType.NEW_MEMBER } } }
      }
    }
  });5

  console.log(`Found ${churches.length} churches to process.`);
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const church of churches) {
    if (church._count.flows > 0) {
      console.log(`  Skipping Church ID ${church.id}: Default NEW_MEMBER flow already exists.`);
      skippedCount++;
      continue;
    }

    if (!church.clerkOrgId) {
        console.error(`  ERROR for Church ID ${church.id}: Missing clerkOrgId. Cannot generate slug. Skipping.`);
        errorCount++;
        continue;
    }

    console.log(`  Processing Church ID ${church.id} (Org ID: ${church.clerkOrgId})...`);

    // Prepare configJson data, providing defaults if source fields are null/invalid
    let serviceTimes: any[] = [];
    if (church.serviceTimesJson && typeof church.serviceTimesJson === 'object') {
        try { serviceTimes = JSON.parse(JSON.stringify(church.serviceTimesJson)); } catch (e) { /* ignore parse error */ }
    }
    let ministries: any[] = [];
    if (church.ministriesJson && typeof church.ministriesJson === 'object') {
        try { ministries = JSON.parse(JSON.stringify(church.ministriesJson)); } catch (e) { /* ignore parse error */ }
    }
    let settings: any = {}; // Use empty object as default
    if (church.settingsJson && typeof church.settingsJson === 'object') {
        try { settings = JSON.parse(JSON.stringify(church.settingsJson)); } catch (e) { /* ignore parse error */ }
    }

    const flowConfig: NewMemberFlowConfig = {
      serviceTimes: Array.isArray(serviceTimes) ? serviceTimes : [],
      ministries: Array.isArray(ministries) ? ministries : [],
      settings: typeof settings === 'object' && settings !== null ? settings : {},
    };

    // Generate default slug and name
    const slug = `connect-${church.clerkOrgId}`; // Use clerkOrgId for uniqueness and readability
    const name = "New Member Connect Flow";

    try {
      await prisma.flow.create({
        data: {
          name: name,
          slug: slug,
          type: FlowType.NEW_MEMBER,
          configJson: flowConfig as unknown as Prisma.JsonObject,
          isEnabled: true,
          church: {
            connect: { id: church.id }
          }
        }
      });
      console.log(`    -> Successfully created default Flow (slug: ${slug})`);
      createdCount++;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             // Likely means slug wasn't unique, maybe script run twice or manual entry?
             console.warn(`    -> WARNING: Flow with slug ${slug} already exists for Church ID ${church.id}. Skipping creation.`);
             skippedCount++; // Count as skipped if unique constraint fails
        } else {
             console.error(`    -> ERROR creating flow for Church ID ${church.id}:`, error);
             errorCount++;
        }
    }
  }

  console.log(`\nMigration finished.`);
  console.log(`  Flows created: ${createdCount}`);
  console.log(`  Churches skipped (already had flow or slug exists): ${skippedCount}`);
  console.log(`  Errors encountered: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error('Migration script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 