import { prisma } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

async function cleanupStripeAccount() {
  try {
    const orgId = 'org_31HyuJiUQ0XmCpt3VaIy0MncE4F';
    
    // Find the Stripe Connect account
    const account = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: orgId }
    });
    
    if (!account) {
      console.log('No Stripe Connect account found in database');
      return;
    }
    
    console.log('Found account:', account.stripeAccountId);
    
    // Try to delete from Stripe
    try {
      const deleted = await stripe.accounts.del(account.stripeAccountId);
      console.log('Deleted from Stripe:', deleted.id);
    } catch (error: any) {
      console.error('Could not delete from Stripe (may already be deleted):', error.message);
    }
    
    // Delete from database
    await prisma.stripeConnectAccount.delete({
      where: { churchId: orgId }
    });
    
    console.log('✅ Deleted from database');
    console.log('Ready to test the new onboarding flow!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupStripeAccount();