import { prisma } from '@/lib/db';

async function checkStripeAccount() {
  try {
    const orgId = 'org_31HyuJiUQ0XmCpt3VaIy0MncE4F';
    
    // Check the StripeConnectAccount
    const stripeAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: orgId },
      include: {
        church: {
          select: {
            name: true,
            subscriptionStatus: true,
            subscriptionPlan: true,
            stripeCustomerId: true,
            createdAt: true
          }
        }
      }
    });
    
    if (stripeAccount) {
      console.log('\n=== Stripe Connect Account Found ===');
      console.log('Account ID:', stripeAccount.stripeAccountId);
      console.log('Created At:', stripeAccount.createdAt);
      console.log('Details Submitted:', stripeAccount.detailsSubmitted);
      console.log('Charges Enabled:', stripeAccount.chargesEnabled);
      console.log('Payouts Enabled:', stripeAccount.payoutsEnabled);
      console.log('\n=== Associated Church ===');
      console.log('Church Name:', stripeAccount.church.name);
      console.log('Subscription Status:', stripeAccount.church.subscriptionStatus);
      console.log('Subscription Plan:', stripeAccount.church.subscriptionPlan);
      console.log('Stripe Customer ID:', stripeAccount.church.stripeCustomerId);
      console.log('Church Created At:', stripeAccount.church.createdAt);
    } else {
      console.log('No Stripe Connect account found for org:', orgId);
    }
    
    // Check if there are any other Connect accounts
    const allAccounts = await prisma.stripeConnectAccount.findMany({
      select: {
        churchId: true,
        stripeAccountId: true,
        createdAt: true,
        church: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('\n=== All Stripe Connect Accounts ===');
    console.log('Total accounts:', allAccounts.length);
    allAccounts.forEach(acc => {
      console.log(`- ${acc.church.name} (${acc.churchId}): ${acc.stripeAccountId} created at ${acc.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStripeAccount();