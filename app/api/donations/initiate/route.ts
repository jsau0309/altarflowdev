import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { getStripeInstance } from '@/lib/stripe-server';
import { z } from 'zod'; // For input validation
import * as Sentry from '@sentry/nextjs';
import { withApiSpan, logger, capturePaymentError } from '@/lib/sentry';

// Initialize Stripe with proper error handling
const stripe = getStripeInstance();
 
// Define a schema for input validation using Zod
const initiateDonationSchema = z.object({
  idempotencyKey: z.string().min(1), // Changed from UUID to allow composite keys
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
  isInternational: z.boolean().default(false),
  donorCountry: z.string().regex(/^[A-Z]{2}$/, 'Invalid country code').optional(), // ISO country code (e.g., "MX", "SV")
  coverFees: z.boolean().optional(),
  donorId: z.string().optional(),
  donorLanguage: z.enum(['en', 'es']).default('en'), // Language from i18n
});

export async function POST(request: Request) {
  return withApiSpan('POST /api/donations/initiate', {
    'http.method': 'POST',
    'http.route': '/api/donations/initiate'
  }, async () => {
    let churchUUIDFromInput: string = '';
    let baseAmount: number = 0;
    let donorEmail: string | undefined;
    let isAnonymous: boolean = false;
    
    try {
      const body = await request.json();
      
      // Log the donation initiation attempt
      logger.info('Donation initiation requested', {
        hasIdempotencyKey: !!body.idempotencyKey,
        churchId: body.churchId,
        amount: body.baseAmount,
        currency: body.currency || 'usd'
      });
      const validation = initiateDonationSchema.safeParse(body);

      if (!validation.success) {
        logger.warn('Invalid donation initiation input', {
          issues: validation.error.issues
        });
        return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
      }

      const {
        idempotencyKey,
        churchId,
        donationTypeId,
        currency,
        firstName,
        lastName,
        phone,
        coverFees,
        donorId,
        isInternational,
        donorCountry,
        donorLanguage,
      } = validation.data;

      // Assign to outer scope variables for error handling
      churchUUIDFromInput = churchId;
      baseAmount = validation.data.baseAmount;
      donorEmail = validation.data.donorEmail;
      isAnonymous = validation.data.isAnonymous;


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
          logger.error('Error updating donor in database', {
            donorId,
            error: (dbError as Error).message
          });
          // Don't fail the donation if donor update fails
          Sentry.captureException(dbError, {
            tags: { 'error.type': 'donor_update' }
          });
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
            
            if (stripeConnectAccountForExisting?.stripeAccountId && existingTransaction.stripePaymentIntentId) {
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
      select: {
        id: true,
        clerkOrgId: true,
        onboardingCompleted: true,
        subscriptionStatus: true,
        name: true,
      }
    });

    // Debug logging removed: church lookup result

    if (!church) {
      // Debug logging removed: all church IDs in database
      logger.warn('Church not found for donation', { churchId: churchUUIDFromInput });
      return NextResponse.json({ error: 'Church not found for the provided churchId (UUID).' }, { status: 404 });
    }

    // SECURITY: Only allow donations to churches that have completed onboarding
    if (!church.onboardingCompleted) {
      logger.warn('Donation attempted to church without completed onboarding', {
        churchId: church.id,
        churchName: church.name
      });
      return NextResponse.json({
        error: 'This church is not currently accepting donations.'
      }, { status: 403 });
    }

    // SECURITY: Don't allow donations to suspended or canceled churches
    if (church.subscriptionStatus === 'suspended' || church.subscriptionStatus === 'canceled') {
      logger.warn('Donation attempted to suspended/canceled church', {
        churchId: church.id,
        subscriptionStatus: church.subscriptionStatus
      });
      return NextResponse.json({
        error: 'This church is not currently accepting donations.'
      }, { status: 403 });
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
    const PLATFORM_FEE_RATE = 0.01; // 1% platform fee

    let finalAmountForStripe = baseAmount; // baseAmount is in cents, this is the default if fees are not covered
    let calculatedProcessingFeeInCents = 0;
    let platformFeeInCents = 0;

    if (coverFees && baseAmount > 0) {
      // Correct gross-up calculation: combine both percentage fees in the divisor
      // Formula: final_amount = (base_amount + fixed_fee) / (1 - stripe_rate - platform_rate)
      // This ensures church receives exactly the base amount after ALL fees are deducted
      finalAmountForStripe = Math.ceil(
        (baseAmount + STRIPE_FIXED_FEE_CENTS) /
        (1 - STRIPE_PERCENTAGE_FEE_RATE - PLATFORM_FEE_RATE)
      );

      // Calculate the actual platform fee based on final amount charged
      platformFeeInCents = Math.ceil(finalAmountForStripe * PLATFORM_FEE_RATE);

      // Calculate the Stripe processing fee (total fee minus platform fee)
      calculatedProcessingFeeInCents = finalAmountForStripe - baseAmount - platformFeeInCents;
    } else {
      // Platform fee applies even if donor doesn't cover fees (church absorbs it)
      platformFeeInCents = Math.ceil(baseAmount * PLATFORM_FEE_RATE);
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
      // Normalize email for consistent customer lookup
      const normalizedEmail = donorEmail.toLowerCase().trim();
      
      // Add a small delay to help with race conditions in development
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Search for existing customers on the church's Connect account
      const existingCustomers = await stripe.customers.list(
        { email: normalizedEmail, limit: 1 },
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
          email: normalizedEmail,
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

        const newStripeCustomer = await stripe.customers.create(
          customerParams,
          { 
            stripeAccount: churchStripeAccountId, // Create customer on church's Connect account
            idempotencyKey: `${idempotencyKey}_customer` // Use idempotency for customer creation too!
          }
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
      application_fee_amount: platformFeeInCents, // 1% platform fee
      // Explicitly specify payment method types to exclude customer_balance (bank transfer)
      // Card payment type includes: credit cards, debit cards, Link, Apple Pay, Google Pay
      // us_bank_account: ACH Direct Debit (instant verification)
      // This removes the redundant "Transferencia bancaria" (customer_balance) option
      payment_method_types: ['card', 'us_bank_account'],
      // Remove transfer_data since we're creating directly on Connect account
      // The church will receive funds directly
      metadata: {
        dbChurchId: church.id,
        dbDonationTypeId: donationTypeId,
        transactionType: 'one-time',
        platformFeeInCents: platformFeeInCents.toString(), // For tracking
      },
    };

    // Note: We don't set receipt_email here because we send custom receipts via Resend
    // This prevents duplicate receipts (one from Stripe, one from our system)
    
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
    const donorEmailForDb: string | null = donorEmail || null;

    if (isAnonymous) {
      // Anonymous donors: store "Anonymous Donor" as name, but KEEP email for receipts
      donorDisplayNameForDb = 'Anonymous Donor';
      // donorEmailForDb keeps the email value for receipt purposes
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
        platformFeeAmount: platformFeeInCents,
        isAnonymous: isAnonymous,
        isInternational: isInternational || false,
        donorCountry: donorCountry || null,
        donorLanguage: donorLanguage || 'en',
      },
    });
    } catch (dbError: unknown) {
      const error = dbError as Error & { code?: string; meta?: { target?: string[] } };
      if (error.code === 'P2002') {
        // Handle unique constraint violation for either stripePaymentIntentId or idempotencyKey
        const target = error.meta?.target || [];
        
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
      // Include payment method types for debugging
      paymentMethodTypes: paymentIntent.payment_method_types,
      // Include the payment method configuration if available
      paymentMethodConfiguration: paymentIntent.payment_method_configuration_details,
    }, { status: 201 });

    } catch (error) {
      // Log error with Sentry
      logger.error('Failed to initiate donation', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        churchId: churchUUIDFromInput,
        amount: baseAmount
      });
      
      // Capture exception with context
      Sentry.captureException(error, {
        contexts: {
          donation: {
            churchId: churchUUIDFromInput,
            amount: baseAmount,
            donorEmail,
            isAnonymous
          }
        },
        tags: {
          'error.type': error instanceof Stripe.errors.StripeError ? 'stripe' : 'application'
        }
      });
      
      // Specific handling for payment errors
      if (error instanceof Stripe.errors.StripeError) {
        capturePaymentError(error, {
          churchId: churchUUIDFromInput,
          amount: baseAmount
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      let errorMessage = 'Failed to initiate donation.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}