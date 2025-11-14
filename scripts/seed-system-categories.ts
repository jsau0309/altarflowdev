/**
 * Seed System Payment Methods and Expense Categories
 *
 * This script creates default payment methods and expense categories for all churches.
 * Run this after the schema migration to ensure all churches have the basic categories.
 *
 * Usage:
 *   npx tsx scripts/seed-system-categories.ts
 */

import { prisma } from '../lib/db';

const SYSTEM_PAYMENT_METHODS = [
  { name: 'Cash', color: '#10B981', isSystemMethod: true },      // Green
  { name: 'Check', color: '#3B82F6', isSystemMethod: true },     // Blue
  { name: 'Card', color: '#000000', isSystemMethod: true },      // Black
  { name: 'Link', color: '#000000', isSystemMethod: true },      // Black
  { name: 'Bank Transfer', color: '#F59E0B', isSystemMethod: true }, // Amber
];

const SYSTEM_EXPENSE_CATEGORIES = [
  { name: 'Utilities', color: '#EF4444', isSystemCategory: true },      // Red
  { name: 'Salaries', color: '#3B82F6', isSystemCategory: true },       // Blue
  { name: 'Maintenance', color: '#F97316', isSystemCategory: true },    // Orange
  { name: 'Office Supplies', color: '#10B981', isSystemCategory: true }, // Green
  { name: 'Ministry', color: '#8B5CF6', isSystemCategory: true },       // Purple
  { name: 'Building', color: '#F59E0B', isSystemCategory: true },       // Amber
  { name: 'Events', color: '#EC4899', isSystemCategory: true },         // Pink
  { name: 'Technology', color: '#06B6D4', isSystemCategory: true },     // Cyan
  { name: 'Transportation', color: '#84CC16', isSystemCategory: true }, // Lime
  { name: 'Insurance', color: '#6366F1', isSystemCategory: true },      // Indigo
  { name: 'Other', color: '#6B7280', isSystemCategory: true },          // Gray
];

async function seedSystemCategories() {
  console.log('🌱 Starting seed process for system categories...\n');

  try {
    // Get all churches
    const churches = await prisma.church.findMany({
      select: { id: true, name: true, clerkOrgId: true },
    });

    console.log(`Found ${churches.length} churches to seed\n`);

    let totalPaymentMethodsCreated = 0;
    let totalExpenseCategoriesCreated = 0;

    for (const church of churches) {
      console.log(`Processing: ${church.name} (${church.clerkOrgId})`);

      // Seed Payment Methods
      for (const method of SYSTEM_PAYMENT_METHODS) {
        try {
          const existing = await prisma.donationPaymentMethod.findUnique({
            where: {
              churchId_name: {
                churchId: church.id,
                name: method.name,
              },
            },
          });

          if (!existing) {
            await prisma.donationPaymentMethod.create({
              data: {
                churchId: church.id,
                name: method.name,
                color: method.color,
                isSystemMethod: method.isSystemMethod,
                isDeletable: false, // System methods shouldn't be deleted
              },
            });
            totalPaymentMethodsCreated++;
            console.log(`  ✓ Created payment method: ${method.name}`);
          } else {
            console.log(`  - Payment method already exists: ${method.name}`);
          }
        } catch (error) {
          console.error(`  ✗ Error creating payment method ${method.name}:`, error);
        }
      }

      // Seed Expense Categories
      for (const category of SYSTEM_EXPENSE_CATEGORIES) {
        try {
          const existing = await prisma.expenseCategory.findUnique({
            where: {
              churchId_name: {
                churchId: church.id,
                name: category.name,
              },
            },
          });

          if (!existing) {
            await prisma.expenseCategory.create({
              data: {
                churchId: church.id,
                name: category.name,
                color: category.color,
                isSystemCategory: category.isSystemCategory,
                isDeletable: false, // System categories shouldn't be deleted
              },
            });
            totalExpenseCategoriesCreated++;
            console.log(`  ✓ Created expense category: ${category.name}`);
          } else {
            console.log(`  - Expense category already exists: ${category.name}`);
          }
        } catch (error) {
          console.error(`  ✗ Error creating expense category ${category.name}:`, error);
        }
      }

      console.log(''); // Empty line between churches
    }

    console.log('✅ Seed process completed!');
    console.log(`\nSummary:`);
    console.log(`  Churches processed: ${churches.length}`);
    console.log(`  Payment methods created: ${totalPaymentMethodsCreated}`);
    console.log(`  Expense categories created: ${totalExpenseCategoriesCreated}`);
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSystemCategories()
  .then(() => {
    console.log('\n🎉 Seed script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
