import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { z } from 'zod'; // For input validation

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
  // isRecurring: z.boolean().default(false), // Removed
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  donorEmail: z.string().email().optional(),
  phone: z.string().optional(),
  addressLine2: z.string().optional(), // Top-level addressLine2 from form
  street: z.string().optional(),       // Top-level street (for line1) from form
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(), 
  country: z.string().optional(),

  // This 'address' object in Zod is for potentially structured address input,
  // but we will primarily use the flat fields above for Stripe consistency.
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
      churchId: churchUUIDFromInput,
      donationTypeId,
      baseAmount,
      currency,
      firstName,
      lastName,
      donorEmail,
      phone,
      // Note: 'address' here is validation.data.address (the Zod object),
      // but we'll use the top-level flat fields (validation.data.street, validation.data.addressLine2, etc.)
      // for Stripe customer address details for consistency with Prisma and form data.
      // address, // We will not directly use the nested 'address' object for Stripe customer details.
      isAnonymous, // Ensure isAnonymous is destructured
      donorClerkId,
      coverFees,
      donorId,
    } = validation.data;


    // Update Donor record if donorId is provided and details are available
    if (donorId && !isAnonymous) {
      // Debug logging removed: attempting to update donor with validation data
      const donorUpdateData: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        phone: string;
        isPhoneVerified: boolean;
      }> = {};
      if (validation.data.firstName) donorUpdateData.firstName = validation.data.firstName;
      if (validation.data.lastName) donorUpdateData.lastName = validation.data.lastName;
      if (validation.data.donorEmail) donorUpdateData.email = validation.data.donorEmail; 
      if (validation.data.street) donorUpdateData.addressLine1 = validation.data.street;
      if (validation.data.addressLine2) donorUpdateData.addressLine2 = validation.data.addressLine2;
      if (validation.data.city) donorUpdateData.city = validation.data.city; // Corrected
      if (validation.data.state) donorUpdateData.state = validation.data.state; // Corrected
      if (validation.data.zipCode) donorUpdateData.postalCode = validation.data.zipCode; // Corrected
      if (validation.data.country) donorUpdateData.country = validation.data.country; // Corrected

      // If this API is hit after OTP for a public donation, the phone is considered verified for this donor.
      donorUpdateData.isPhoneVerified = true;

      // Debug logging removed: constructed donor update data

      if (Object.keys(donorUpdateData).length > 0) {
        try {
          await prisma.donor.update({
            where: { id: donorId },
            data: donorUpdateData,
          });
          // Debug logging removed: donor successfully updated
        } catch (dbError) {
          console.error("[API /donations/initiate] Error updating donor in DB:", dbError);
        }
      } else {
         // Debug logging removed: no donor update performed (empty data)
      }
    } else {
        // Debug logging removed: skipped donor update
    }

    // Debug logging removed: attempting to find church

    const existingTransaction = await prisma.donationTransaction.findUnique({
      where: { idempotencyKey },
    });

    if (existingTransaction) {
      if (existingTransaction.status === 'succeeded') {
        return NextResponse.json({ 
          error: 'Donation already processed.', 
          message: 'This donation has already been successfully completed.',
          transactionId: existingTransaction.id,
          clientSecret: null,
        }, { status: 409 });
      }
      if (existingTransaction.status === 'pending' && existingTransaction.stripePaymentIntentId) {
        try {
          // Need to retrieve the church's Stripe account ID first
          const churchForExisting = await prisma.church.findUnique({
            where: { id: churchUUIDFromInput },
            select: { clerkOrgId: true }
          });
          
          if (churchForExisting?.clerkOrgId) {
            const stripeConnectAccountForExisting = await prisma.stripeConnectAccount.findUnique({
              where: { churchId: churchForExisting.clerkOrgId },
              select: { stripeAccountId: true }
            });
            
            if (stripeConnectAccountForExisting?.stripeAccountId) {
              // Retrieve from the Connect account
              const paymentIntent = await stripe.paymentIntents.retrieve(
                existingTransaction.stripePaymentIntentId,
                { stripeAccount: stripeConnectAccountForExisting.stripeAccountId }
              );
              return NextResponse.json({
                clientSecret: paymentIntent.client_secret,
                transactionId: existingTransaction.id,
                stripeAccount: stripeConnectAccountForExisting.stripeAccountId,
                message: 'Existing pending transaction found. Use this clientSecret to complete payment.'
              }, { status: 200 });
            }
          }
        } catch (stripeError) {
          console.error('Error retrieving existing PaymentIntent from Stripe:', stripeError);
        }
      }
    }

    const church = await prisma.church.findUnique({
      where: { id: churchUUIDFromInput }, 
    });

    // Debug logging removed: church lookup result

    if (!church) {
      // Debug logging removed: all church IDs in database
      return NextResponse.json({ error: 'Church not found for the provided churchId (UUID).' }, { status: 404 });
    }

    const donationTypeRecord = await prisma.donationType.findFirst({
      where: {
        id: donationTypeId,
        churchId: church.id,
      },
    });

    if (!donationTypeRecord) {
      console.error(`DonationType with id '${donationTypeId}' not found for churchId '${church.id}'.`);
      return NextResponse.json({ error: `Donation type ID '${donationTypeId}' not found or does not belong to the specified church.` }, { status: 400 });
    }

    const STRIPE_PERCENTAGE_FEE_RATE = 0.029;
    const STRIPE_FIXED_FEE_CENTS = 30;

    let finalAmountForStripe = baseAmount; // baseAmount is in cents, this is the default if fees are not covered
    let calculatedProcessingFeeInCents = 0;

    if (coverFees && baseAmount > 0) {
      // Gross-up calculation to ensure the church receives the full baseAmount
      // finalAmountForStripe will be the total amount charged to the donor.
      finalAmountForStripe = Math.ceil((baseAmount + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_PERCENTAGE_FEE_RATE));
      calculatedProcessingFeeInCents = finalAmountForStripe - baseAmount;
    }
    // If coverFees is false, finalAmountForStripe remains baseAmount (initial value), and calculatedProcessingFeeInCents remains 0.
    // Debug logging removed: fee calculation details

    if (!church.clerkOrgId) {
      console.error(`Church with UUID ${church.id} does not have a clerkOrgId.`);
      return NextResponse.json({ error: 'Church configuration error: Missing Clerk Organization ID.' }, { status: 500 });
    }
    const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: church.clerkOrgId },
    });

    if (!stripeConnectAccount || !stripeConnectAccount.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe Connect account not found for this church or not fully set up.' }, { status: 404 });
    }
    const churchStripeAccountId = stripeConnectAccount.stripeAccountId;
    
    // Validate that the Connect account is ready to receive funds
    try {
      const stripeAccount = await stripe.accounts.retrieve(churchStripeAccountId);
      if (!stripeAccount.charges_enabled) {
        console.error(`Church Connect account ${churchStripeAccountId} cannot accept charges yet`);
        return NextResponse.json({ 
          error: 'This church is not yet set up to accept donations. Please contact the church administrator.' 
        }, { status: 400 });
      }
    } catch (verifyError) {
      console.error(`Error verifying Connect account ${churchStripeAccountId}:`, verifyError);
      return NextResponse.json({ 
        error: 'Unable to verify church payment account. Please try again later.' 
      }, { status: 500 });
    }

    let stripeCustomerId: string | undefined = undefined;

    if (!isAnonymous && donorEmail) {
      // Search for existing customers on the church's Connect account
      const existingCustomers = await stripe.customers.list(
        { email: donorEmail, limit: 1 },
        { stripeAccount: churchStripeAccountId } // Use church's Connect account
      );

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
        
        // Update existing Stripe Customer
        const updatePayload: Stripe.CustomerUpdateParams = {};
        const stripeAddressUpdate: Stripe.AddressParam = {};
        let needsAddressUpdate = false;

        // Use top-level fields from validation.data for address
        if (validation.data.street) { stripeAddressUpdate.line1 = validation.data.street; needsAddressUpdate = true; }
        if (validation.data.addressLine2) { stripeAddressUpdate.line2 = validation.data.addressLine2; needsAddressUpdate = true; }
        if (validation.data.city) { stripeAddressUpdate.city = validation.data.city; needsAddressUpdate = true; }
        if (validation.data.state) { stripeAddressUpdate.state = validation.data.state; needsAddressUpdate = true; }
        if (validation.data.zipCode) { stripeAddressUpdate.postal_code = validation.data.zipCode; needsAddressUpdate = true; }
        if (validation.data.country) { stripeAddressUpdate.country = validation.data.country; needsAddressUpdate = true; }

        if (needsAddressUpdate) {
          updatePayload.address = stripeAddressUpdate;
        }
        
        if (validation.data.firstName || validation.data.lastName) {
          updatePayload.name = `${validation.data.firstName || ''} ${validation.data.lastName || ''}`.trim();
        }
        if (validation.data.phone) {
          updatePayload.phone = validation.data.phone;
        }
        if (validation.data.donorClerkId && validation.data.donorClerkId !== 'guest') {
            updatePayload.metadata = { ...updatePayload.metadata, dbDonorClerkId: validation.data.donorClerkId };
        }

        if (Object.keys(updatePayload).length > 0) {
          try {
            await stripe.customers.update(
              stripeCustomerId, 
              updatePayload,
              { stripeAccount: churchStripeAccountId } // Use church's Connect account
            );
            // Debug logging removed: Stripe customer updated
          } catch (stripeError) {
            console.error(`[API /donations/initiate] Error updating Stripe customer ${stripeCustomerId}:`, stripeError);
          }
        }

      } else { // Create a new Stripe customer
        const customerParams: Stripe.CustomerCreateParams = {
          email: donorEmail,
        };
        if (firstName || lastName) {
          customerParams.name = `${firstName || ''} ${lastName || ''}`.trim();
        }
        if (phone) {
          customerParams.phone = phone;
        }
        
        // Set address for new Stripe Customer using flat fields from validation.data
        const stripeAddress: Stripe.AddressParam = {};
        let hasAddressData = false;

        if (validation.data.street) { stripeAddress.line1 = validation.data.street; hasAddressData = true; }
        if (validation.data.addressLine2) { stripeAddress.line2 = validation.data.addressLine2; hasAddressData = true; }
        if (validation.data.city) { stripeAddress.city = validation.data.city; hasAddressData = true; }
        if (validation.data.state) { stripeAddress.state = validation.data.state; hasAddressData = true; }
        if (validation.data.zipCode) { stripeAddress.postal_code = validation.data.zipCode; hasAddressData = true; }
        if (validation.data.country) { stripeAddress.country = validation.data.country; hasAddressData = true; }
        
        if (hasAddressData) {
          customerParams.address = stripeAddress;
        }

        if (donorClerkId && donorClerkId !== 'guest') {
          customerParams.metadata = { ...customerParams.metadata, dbDonorClerkId: donorClerkId };
        }

        const newStripeCustomer = await stripe.customers.create(
          customerParams,
          { stripeAccount: churchStripeAccountId } // Create customer on church's Connect account
        );
        stripeCustomerId = newStripeCustomer.id;
      }
    } else if (isAnonymous) {
      // Debug logging removed: anonymous donation, no Stripe customer
    }

    // Update Donor record with Stripe Customer ID if available
    if (donorId && stripeCustomerId && !isAnonymous) {
      try {
        const existingDonor = await prisma.donor.findUnique({
          where: { id: donorId },
          select: { stripeCustomerId: true }
        });

        if (existingDonor && existingDonor.stripeCustomerId !== stripeCustomerId) {
          // Debug logging removed: attempting to update donor with Stripe customer ID
          await prisma.donor.update({
            where: { id: donorId },
            data: { stripeCustomerId: stripeCustomerId },
          });
          // Debug logging removed: donor updated with Stripe customer ID
        } else if (!existingDonor) {
          // Debug logging removed: donor not found for Stripe customer ID update
        } else {
          // Debug logging removed: donor already has Stripe customer ID
        }
      } catch (dbError) {
        console.error(`[API /donations/initiate] Error updating Donor ${donorId} with stripeCustomerId:`, dbError);
        // Non-fatal error, proceed with donation creation
      }
    }

    // Create payment intent directly on the Connect account
    // This way the customer ID reference will work correctly
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: finalAmountForStripe,
      currency: currency,
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true }, // Enable various payment methods via Payment Element
      // Remove transfer_data since we're creating directly on Connect account
      // The church will receive funds directly
      metadata: {
        dbChurchId: church.id,
        dbDonationTypeId: donationTypeId,
        dbDonorClerkId: donorClerkId || 'guest',
        transactionType: 'one-time',
      },
    };

    if (validation.data.donorEmail) {
      paymentIntentParams.receipt_email = validation.data.donorEmail;
    }
    
    // Create the payment intent on the church's Connect account
    // This ensures the customer reference works and the church receives funds directly
    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      { 
        idempotencyKey: idempotencyKey,
        stripeAccount: churchStripeAccountId // Create on Connect account
      }
    );

    let donorDisplayNameForDb: string | null = null;
    let donorEmailForDb: string | null = donorEmail || null;

    if (isAnonymous) {
      donorDisplayNameForDb = 'Anonymous Donor';
      donorEmailForDb = null;
    } else if (firstName || lastName) {
      donorDisplayNameForDb = `${firstName || ''} ${lastName || ''}`.trim();
      if (donorDisplayNameForDb === '') {
        donorDisplayNameForDb = null;
      }
    } else {
      donorDisplayNameForDb = null;
    }

    let donationTransaction;
    try {
      // Debug logging removed: creating new DonationTransaction
      donationTransaction = await prisma.donationTransaction.create({
      data: {
        churchId: church.id,
        donorId: donorId,
        donationTypeId: donationTypeId,
        donorClerkId: donorClerkId,
        donorName: donorDisplayNameForDb,
        donorEmail: donorEmailForDb,
        amount: baseAmount,
        currency: currency,
        status: 'pending',
        paymentMethodType: null,
        // isRecurring: false, // Removed, Prisma schema defaults to false
        stripePaymentIntentId: paymentIntent.id,
        stripeSubscriptionId: null,
        stripeCustomerId: stripeCustomerId,
        idempotencyKey: idempotencyKey,
        processingFeeCoveredByDonor: calculatedProcessingFeeInCents,
      },
    });
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        // Handle unique constraint violation for either stripePaymentIntentId or idempotencyKey
        const target = dbError.meta?.target as string[] || [];
        
        if (target.includes('stripePaymentIntentId')) {
          // Debug logging removed: unique constraint on stripePaymentIntentId
          const existingTx = await prisma.donationTransaction.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
          });
          if (existingTx) {
            return NextResponse.json({
              clientSecret: paymentIntent.client_secret,
              transactionId: existingTx.id,
              stripeAccount: churchStripeAccountId,
              message: 'Transaction already recorded due to concurrent request.'
            }, { status: 200 });
          }
        } else if (target.includes('idempotencyKey')) {
          // Debug logging removed: unique constraint on idempotencyKey
          const existingTx = await prisma.donationTransaction.findUnique({
            where: { idempotencyKey: idempotencyKey },
          });
          if (existingTx) {
            return NextResponse.json({
              clientSecret: paymentIntent.client_secret,
              transactionId: existingTx.id,
              stripeAccount: churchStripeAccountId,
              message: 'Transaction already recorded due to concurrent request.'
            }, { status: 200 });
          }
        }
        
        // If we couldn't find the existing transaction, throw the error
        console.error(`[API /donations/initiate] P2002 but failed to retrieve existing transaction for PI ${paymentIntent.id}.`, dbError);
        throw dbError;
      } else {
        console.error(`[API /donations/initiate] Database error during DonationTransaction creation for PI ${paymentIntent.id}:`, dbError);
        throw dbError;
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: donationTransaction.id,
      stripeAccount: churchStripeAccountId, // Pass the Connect account ID for frontend
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