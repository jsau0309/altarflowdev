import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDonorId = 'cmbr7e7gq0002y4du1cmit3vx'; // Jeffrey Alonso's correct donorId
  const targetDonorName = 'Jeffrey Alonso';
  const targetDonorEmail = 'hola@jeffunderwood.me';

  console.log(`Attempting to update transactions for '${targetDonorName}' or '${targetDonorEmail}' that DO NOT have donorId '${targetDonorId}'...`);

  try {
    const updateResult = await prisma.donationTransaction.updateMany({
      where: {
        churchId: '5be2355b-9e7e-4df6-a249-fda411e10155', // Specify the churchId to be safe
        OR: [
          { donorName: { equals: targetDonorName, mode: 'insensitive' } },
          { donorEmail: { equals: targetDonorEmail, mode: 'insensitive' } },
        ],
        // Condition to find transactions that need fixing:
        // Their donorId is either NULL or NOT EQUAL to the targetDonorId
        AND: [
          {
            OR: [
              { donorId: { not: targetDonorId } },
              { donorId: null },
            ],
          },
        ],
      },
      data: {
        donorId: targetDonorId,
      },
    });

    if (updateResult.count > 0) {
      console.log(`Successfully updated ${updateResult.count} transactions to donorId '${targetDonorId}'.`);
      console.log('Please verify the Donor Details drawer in the application now.');
    } else {
      console.log('No transactions found for Jeffrey Alonso that required donorId correction, or they were already correct.');
    }

  } catch (error) {
    console.error('Error updating transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Script finished.');
  })
  .catch(e => {
    console.error('Script failed:', e);
    process.exit(1);
  });
