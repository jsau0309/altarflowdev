import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod'; // For input validation

const prisma = new PrismaClient();

// Initialize Stripe with the secret key from environment variables

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', 
  typescript: true,
});
 
// Define a schema for input validation using Zod
const initiateDonationSchema = z.object({
  idempotencyKey: z.string().uuid(), 
  churchId: z.string().uuid(), 
  donationTypeId: z.string().trim().min(1), 
  baseAmount: z.number().int().positive(), 
  currency: z.string().length(3).toLowerCase().default('usd'), 
  isRecurring: z.boolean().default(false), 
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  donorEmail: z.string().email().optional(),
  phone: z.string().optional(),
  

  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(), 
  country: z.string().optional(),

  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  isAnonymous: z.boolean().default(false),
  donorClerkId: z.string().optional(),
  coverFees: z.boolean().optional(), 
  donorId: z.string().optional(), 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = initiateDonationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      idempotencyKey,
      churchId: churchUUIDFromInput, // This is the internal DB UUID from the input
      donationTypeId,
      baseAmount,
      currency,
      // isRecurring will be false for this phase.
      firstName,
      lastName,
      donorEmail,
      phone,
      address,
      isAnonymous,
      donorClerkId,
      coverFees, // Destructure coverFees
      donorId,
    } = validation.data;


    // Update Donor record if donorId is provided and details are available
    if (donorId && !isAnonymous) {
      const donorUpdateData: any = {}; // Using 'any' for Prisma.DonorUpdateInput flexibility, ensure Prisma types are correctly inferred or imported if strictness is paramount
      if (validation.data.firstName) donorUpdateData.firstName = validation.data.firstName;
      if (validation.data.lastName) donorUpdateData.lastName = validation.data.lastName;
      if (validation.data.donorEmail) donorUpdateData.email = validation.data.donorEmail; 
      
      // Use flat properties from validation.data for address details
      if (validation.data.street) donorUpdateData.addressLine1 = validation.data.street;
      if (validation.data.city) donorUpdateData.addressCity = validation.data.city;
      if (validation.data.state) donorUpdateData.addressState = validation.data.state;
      if (validation.data.zipCode) donorUpdateData.addressPostalCode = validation.data.zipCode; // formData.zipCode maps to donor.addressPostalCode
      if (validation.data.country) donorUpdateData.addressCountry = validation.data.country;

      if (Object.keys(donorUpdateData).length > 0) {

        try {
          const updatedDonor = await prisma.donor.update({
            where: { id: donorId },
            data: donorUpdateData,
          });
        } catch (dbError) {
          console.error("Initiate API: Error updating donor in DB:", dbError);
          // Decide if this error should halt the process or just be logged
        }
      }
    }

    console.log(`Attempting to find church with internal UUID: '${churchUUIDFromInput}'`);

    // Check for existing transaction with this idempotency key
    const existingTransaction = await prisma.donationTransaction.findUnique({
      where: { idempotencyKey },
    });

    if (existingTransaction) {
      if (existingTransaction.status === 'succeeded') {
        return NextResponse.json({ 
          error: 'Donation already processed.', 
          message: 'This donation has already been successfully completed.',
          transactionId: existingTransaction.id,
          clientSecret: null, // No new client secret needed
        }, { status: 409 }); // 409 Conflict
      }
      // If pending, retrieve the existing PaymentIntent and return its client_secret
      if (existingTransaction.status === 'pending' && existingTransaction.stripePaymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(existingTransaction.stripePaymentIntentId);
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            transactionId: existingTransaction.id,
            message: 'Existing pending transaction found. Use this clientSecret to complete payment.'
          }, { status: 200 }); // Or 201 if you consider this a new 'initiation' of the existing PI
        } catch (stripeError) {
          console.error('Error retrieving existing PaymentIntent from Stripe:', stripeError);
          // Fall through to create a new one if Stripe retrieval fails, or handle error differently
        }
      }
      // For 'failed' or other statuses, Stripe's idempotency on PI creation will handle it if the PI itself exists.
      // We will proceed to create a new PI, and Stripe will return the existing one if the idempotency key matches an existing PI.
    }

    // 0. Retrieve the internal Church record using its UUID
    const church = await prisma.church.findUnique({
      where: { id: churchUUIDFromInput }, 
    });

    console.log('Result of prisma.church.findUnique:', church); // Log the direct result

    if (!church) {
      // For further debugging, you could temporarily fetch and log all church IDs from the Church table
      const allChurches = await prisma.church.findMany({ select: { id: true, name: true, clerkOrgId: true } });
      console.log('All Church IDs in DB:', allChurches.map(c => ({ name: c.name, id: c.id, clerkOrgId: c.clerkOrgId })));
      return NextResponse.json({ error: 'Church not found for the provided churchId (UUID).' }, { status: 404 });
    }
    // const internalChurchUUID = church.id; // church.id is already the UUID we need

    // Verify that the DonationType exists and belongs to the specified church
    const donationTypeRecord = await prisma.donationType.findFirst({
      where: {
        id: donationTypeId,
        churchId: church.id, // Use church.id directly
      },
    });

    if (!donationTypeRecord) {
      console.error(`DonationType with id '${donationTypeId}' not found for churchId '${church.id}'.`);
      return NextResponse.json({ error: `Donation type ID '${donationTypeId}' not found or does not belong to the specified church.` }, { status: 400 });
    }

    // Fee Calculation Logic
    // These should ideally be configurable (e.g., via environment variables or a settings table)
    const STRIPE_PERCENTAGE_FEE_RATE = 0.029; // 2.9%
    const STRIPE_FIXED_FEE_CENTS = 30;       // $0.30 in cents

    let calculatedProcessingFeeInCents = 0;
    if (coverFees && baseAmount > 0) {
      // Calculate fee on the base amount
      const percentageFeePart = baseAmount * STRIPE_PERCENTAGE_FEE_RATE;
      calculatedProcessingFeeInCents = Math.round(percentageFeePart + STRIPE_FIXED_FEE_CENTS);
    }

    const finalAmountForStripe = baseAmount + calculatedProcessingFeeInCents;
    console.log(`[API /donations/initiate] Fee Calculation: baseAmount: ${baseAmount}, coverFees: ${coverFees}, calculatedProcessingFeeInCents: ${calculatedProcessingFeeInCents}, finalAmountForStripe: ${finalAmountForStripe}`);

    // 1. Retrieve the church's Stripe Connect account ID using the church's clerkOrgId
    if (!church.clerkOrgId) {
      console.error(`Church with UUID ${church.id} does not have a clerkOrgId.`);
      return NextResponse.json({ error: 'Church configuration error: Missing Clerk Organization ID.' }, { status: 500 });
    }
    const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: church.clerkOrgId }, // Use the clerkOrgId from the fetched church record
    });

    if (!stripeConnectAccount || !stripeConnectAccount.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe Connect account not found for this church or not fully set up.' }, { status: 404 });
    }
    const churchStripeAccountId = stripeConnectAccount.stripeAccountId;

    // 2. Create/Retrieve Stripe Customer
    let stripeCustomerId: string | undefined = undefined;

    if (!isAnonymous && donorEmail) {
      const existingCustomers = await stripe.customers.list({ email: donorEmail, limit: 1 });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customerParams: Stripe.CustomerCreateParams = {
          email: donorEmail,
        };
        if (firstName || lastName) {
          customerParams.name = `${firstName || ''} ${lastName || ''}`.trim();
        }
        if (phone) {
          customerParams.phone = phone;
        }
        if (address && Object.keys(address).some(key => address[key as keyof typeof address])) { // Check if address object has any values
          const stripeAddress: Stripe.AddressParam = {};
          if (address.line1) stripeAddress.line1 = address.line1;
          if (address.line2) stripeAddress.line2 = address.line2;
          if (address.city) stripeAddress.city = address.city;
          if (address.state) stripeAddress.state = address.state;
          if (address.postal_code) stripeAddress.postal_code = address.postal_code;
          if (address.country) stripeAddress.country = address.country;
          customerParams.address = stripeAddress;
        }
        // Link to Clerk ID if available and not anonymous
        if (donorClerkId && donorClerkId !== 'guest') {
          customerParams.metadata = { ...customerParams.metadata, dbDonorClerkId: donorClerkId };
        }

        const newStripeCustomer = await stripe.customers.create(customerParams);
        stripeCustomerId = newStripeCustomer.id;
      }
    } else if (isAnonymous) {
      // For anonymous donations, we don't create/link a Stripe customer based on email.
      // However, we might still want to create a customer for guest checkouts without an email if Stripe requires it for certain flows, 
      // or if we want to attach payment methods to a guest customer session.
      // For now, if anonymous, no Stripe customer is explicitly linked here unless other logic dictates it.
      console.log('[API /donations/initiate] Anonymous donation, not creating/linking Stripe customer by email.');
    }

    // 3. Create a Stripe PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      // receipt_email will be added below if donorEmail is present

      amount: finalAmountForStripe, // Use the final amount including fees if covered
      currency: currency,
      customer: stripeCustomerId, // Optional, but good for saving payment methods
      payment_method_types: ['card'], // Or ['card', 'us_bank_account'], etc.
      transfer_data: {
        destination: churchStripeAccountId,
        // amount: calculateApplicationFee(amount) // Optional: if you take an application fee
      },
      metadata: {
        dbChurchId: church.id, // Use church.id (which is the UUID) for metadata
        dbDonationTypeId: donationTypeId,
        dbDonorClerkId: donorClerkId || 'guest',
        transactionType: 'one-time',
        // Add any other relevant metadata
      },
      // capture_method: 'automatic', // Default is automatic
    };

    // Add receipt_email if donorEmail is available from the validated form data
    if (validation.data.donorEmail) {
      paymentIntentParams.receipt_email = validation.data.donorEmail;
    }
    
    // If a specific payment method is sent from client for setup, you might use it here
    // For example, if `paymentMethodId` was in the request:
    // if (body.paymentMethodId) {
    //   paymentIntentParams.payment_method = body.paymentMethodId;
    //   paymentIntentParams.confirm = true; // If you want to confirm immediately
    //   paymentIntentParams.return_url = 'YOUR_RETURN_URL'; // Required if confirm is true
    // }


    console.log('[API /donations/initiate] Creating/retrieving Stripe PaymentIntent with params:', paymentIntentParams, 'and idempotencyKey:', idempotencyKey);
    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      { idempotencyKey: idempotencyKey } // Pass idempotency key to Stripe
    );

    // Determine donor name and email for database record
    let donorDisplayNameForDb: string | null = null;
    let donorEmailForDb: string | null = donorEmail || null;

    if (isAnonymous) {
      donorDisplayNameForDb = 'Anonymous Donor';
      donorEmailForDb = null; // Do not store email for anonymous donations
    } else if (firstName || lastName) {
      donorDisplayNameForDb = `${firstName || ''} ${lastName || ''}`.trim();
      if (donorDisplayNameForDb === '') {
        donorDisplayNameForDb = null; // Or 'Guest Donor' if preferred for empty names
      }
    } else {
      // Not anonymous, but no name provided.
      donorDisplayNameForDb = null; // Or 'Guest Donor'
    }

    // CRITICAL CHECK: See if a transaction for this specific PaymentIntent ID already exists
    // This handles race conditions where Stripe returns an existing PI due to its idempotency,
    // and another request might have already created the local DB record.
    // 4. Create a DonationTransaction record in your database
    let donationTransaction;
    try {
      console.log(`[API /donations/initiate] Attempting to create new DonationTransaction for PI ${paymentIntent.id}`);
      donationTransaction = await prisma.donationTransaction.create({
      data: {
        churchId: church.id, // Use church.id (which is the UUID)
        donorId: donorId, // Link to the Donor record if provided
        donationTypeId: donationTypeId,
        donorClerkId: donorClerkId,
        donorName: donorDisplayNameForDb,
        donorEmail: donorEmailForDb,
        amount: baseAmount,
        currency: currency,
        status: 'pending', // Initial status
        paymentMethodType: null, // Will be updated by webhook
        isRecurring: false,
        stripePaymentIntentId: paymentIntent.id,
        stripeSubscriptionId: null, // Not a subscription
        stripeCustomerId: stripeCustomerId,
        idempotencyKey: idempotencyKey, // Save the client's idempotency key
        processingFeeCoveredByDonor: calculatedProcessingFeeInCents,
        // transactionDate is @default(now())
      },
    });
    } catch (dbError: any) {
      // Check if it's a unique constraint violation on stripePaymentIntentId (P2002)
      if (dbError.code === 'P2002' && dbError.meta?.target?.includes('stripePaymentIntentId')) {
        console.log(`[API /donations/initiate] Unique constraint on stripePaymentIntentId for PI ${paymentIntent.id}. Another request likely created it. Fetching existing.`);
        const existingTx = await prisma.donationTransaction.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
        });
        if (existingTx) {
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            transactionId: existingTx.id,
            message: 'Transaction already recorded due to concurrent request.'
          }, { status: 200 });
        } else {
          // This case should be rare: P2002 hit but couldn't find the record immediately after.
          // Could indicate a more complex race or transaction rollback issue.
          console.error(`[API /donations/initiate] P2002 on stripePaymentIntentId but failed to retrieve existing transaction for PI ${paymentIntent.id}.`, dbError);
          throw dbError; // Re-throw the original error
        }
      } else {
        // Different database error, re-throw
        console.error(`[API /donations/initiate] Database error during DonationTransaction creation for PI ${paymentIntent.id}:`, dbError);
        throw dbError;
      }
    }

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