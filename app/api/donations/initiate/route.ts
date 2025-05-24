import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod'; // For input validation

const prisma = new PrismaClient();

// Initialize Stripe with the secret key from environment variables
// Ensure your STRIPE_SECRET_KEY is set in your .env file
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the API version you are targeting
  typescript: true,
});

// Define a schema for input validation using Zod
const initiateDonationSchema = z.object({
  churchId: z.string().trim().min(1), // MODIFIED: Accepts org_... ID (Clerk Org ID)
  donationTypeId: z.string().trim().min(1), // Ensure it's a non-empty string and trim whitespace
  amount: z.number().int().positive(), // Amount in cents
  currency: z.string().length(3).toLowerCase().default('usd'), // Default to 'usd'
  isRecurring: z.boolean().default(false), // For this step, it will be false
  donorName: z.string().optional(),
  donorEmail: z.string().email().optional(),
  donorClerkId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = initiateDonationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      churchId: clerkOrgIdFromInput, // RENAMED for clarity
      donationTypeId,
      amount,
      currency,
      // isRecurring will be false for this phase
      donorName,
      donorEmail,
      donorClerkId,
    } = validation.data;

    const clerkOrgId = clerkOrgIdFromInput.trim(); // Trim whitespace

    console.log(`Attempting to find church with clerkOrgId: '${clerkOrgId}' (Length: ${clerkOrgId.length})`); // Enhanced Log

    // 0. Retrieve the internal Church record using the clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: clerkOrgId }, 
    });

    console.log('Result of prisma.church.findUnique:', church); // Log the direct result

    if (!church) {
      // For further debugging, you could temporarily fetch and log all clerkOrgIds from the Church table
      const allChurches = await prisma.church.findMany({ select: { clerkOrgId: true, name: true } });
      console.log('All clerkOrgIds in DB:', allChurches.map(c => ({ name: c.name, id: `'${c.clerkOrgId}' (Length: ${c.clerkOrgId?.length})` })));
      return NextResponse.json({ error: 'Church not found for the provided churchId.' }, { status: 404 });
    }
    const internalChurchUUID = church.id; // This is the actual UUID for the church

    // Verify that the DonationType exists and belongs to the specified church
    const donationTypeRecord = await prisma.donationType.findFirst({
      where: {
        id: donationTypeId,
        churchId: internalChurchUUID,
      },
    });

    if (!donationTypeRecord) {
      console.error(`DonationType with id '${donationTypeId}' not found for churchId '${internalChurchUUID}'.`);
      return NextResponse.json({ error: `Donation type ID '${donationTypeId}' not found or does not belong to the specified church.` }, { status: 400 });
    }

    // 1. Retrieve the church's Stripe Connect account ID using the clerkOrgId
    const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: clerkOrgId }, // This lookup uses the org_... ID
    });

    if (!stripeConnectAccount || !stripeConnectAccount.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe Connect account not found for this church or not fully set up.' }, { status: 404 });
    }
    const churchStripeAccountId = stripeConnectAccount.stripeAccountId;

    // 2. Create/Retrieve Stripe Customer
    // For simplicity in this step, we'll create a new customer if email is provided,
    // or proceed without one if not. A more robust solution would search for existing customers.
    let stripeCustomer: Stripe.Customer | undefined;
    if (donorEmail) {
      // Optional: Search for existing customer by email
      const existingCustomers = await stripe.customers.list({ email: donorEmail, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
      } else {
        stripeCustomer = await stripe.customers.create({
          email: donorEmail,
          name: donorName,
          // metadata: { clerkId: donorClerkId } // If you want to link Clerk ID
        });
      }
    }
    const stripeCustomerId = stripeCustomer?.id;


    // 3. Create a Stripe PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: currency,
      customer: stripeCustomerId, // Optional, but good for saving payment methods
      payment_method_types: ['card'], // Or ['card', 'us_bank_account'], etc.
      transfer_data: {
        destination: churchStripeAccountId,
        // amount: calculateApplicationFee(amount) // Optional: if you take an application fee
      },
      metadata: {
        dbChurchId: internalChurchUUID, // Use internal UUID for metadata
        dbDonationTypeId: donationTypeId,
        dbDonorClerkId: donorClerkId || 'guest',
        transactionType: 'one-time',
        // Add any other relevant metadata
      },
      // capture_method: 'automatic', // Default is automatic
    };
    
    // If a specific payment method is sent from client for setup, you might use it here
    // For example, if `paymentMethodId` was in the request:
    // if (body.paymentMethodId) {
    //   paymentIntentParams.payment_method = body.paymentMethodId;
    //   paymentIntentParams.confirm = true; // If you want to confirm immediately
    //   paymentIntentParams.return_url = 'YOUR_RETURN_URL'; // Required if confirm is true
    // }


    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // 4. Create a DonationTransaction record in your database
    const donationTransaction = await prisma.donationTransaction.create({
      data: {
        churchId: internalChurchUUID, // MODIFIED: Use the internal Church UUID
        donationTypeId: donationTypeId,
        donorClerkId: donorClerkId,
        donorName: donorName,
        donorEmail: donorEmail,
        amount: amount,
        currency: currency,
        status: 'pending', // Initial status
        paymentMethodType: null, // Will be updated by webhook
        isRecurring: false,
        stripePaymentIntentId: paymentIntent.id,
        stripeSubscriptionId: null, // Not a subscription
        stripeCustomerId: stripeCustomerId,
        // transactionDate is @default(now())
      },
    });

    // 5. Return client_secret of the PaymentIntent and the id of your DonationTransaction
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: donationTransaction.id,
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to initiate donation:', error);
    let errorMessage = 'Failed to initiate donation.';
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function (example, if you need to calculate an application fee)
// function calculateApplicationFee(totalAmount: number): number {
//   // Example: 1% application fee
//   return Math.floor(totalAmount * 0.01);
// }
