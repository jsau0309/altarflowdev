import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { disableStripeAutomaticReceipts, getStripeConnectAccount } from '@/lib/stripe-connect';
import { prisma } from '@/lib/db';

// IMPORTANT: This endpoint should be protected and only accessible by admins
// Consider adding additional authentication or removing after use

export async function POST(request: Request) {
  try {
    // Basic auth check - you may want to add more security
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { churchId, stripeAccountId } = body;

    // If stripeAccountId is provided directly, use it
    if (stripeAccountId) {
      await disableStripeAutomaticReceipts(stripeAccountId);
      return NextResponse.json({ 
        success: true, 
        message: `Disabled receipts for account ${stripeAccountId}` 
      });
    }

    // If churchId is provided, look up the Stripe account
    if (churchId) {
      const church = await prisma.church.findUnique({
        where: { id: churchId },
        include: { stripeConnectAccount: true }
      });

      if (!church?.stripeConnectAccount) {
        return NextResponse.json({ 
          error: 'Church or Stripe account not found' 
        }, { status: 404 });
      }

      await disableStripeAutomaticReceipts(church.stripeConnectAccount.stripeAccountId);
      return NextResponse.json({ 
        success: true, 
        message: `Disabled receipts for ${church.name}` 
      });
    }

    // If neither is provided, update all accounts (use with caution!)
    if (!churchId && !stripeAccountId && request.headers.get('X-Admin-Action') === 'update-all') {
      const accounts = await prisma.stripeConnectAccount.findMany();
      const results = [];

      for (const account of accounts) {
        try {
          await disableStripeAutomaticReceipts(account.stripeAccountId);
          results.push({ 
            accountId: account.stripeAccountId, 
            status: 'success' 
          });
        } catch (error) {
          results.push({ 
            accountId: account.stripeAccountId, 
            status: 'failed',
            error: (error as Error).message
          });
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Processed ${accounts.length} accounts`,
        results 
      });
    }

    return NextResponse.json({ 
      error: 'Please provide churchId or stripeAccountId' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error disabling Stripe receipts:', error);
    return NextResponse.json({ 
      error: 'Failed to disable receipts',
      details: (error as Error).message
    }, { status: 500 });
  }
}