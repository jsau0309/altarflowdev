import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  console.log('[Stripe Webhook] Received request.');

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`[Stripe Webhook] Event constructed: ${event.type}, ID: ${event.id}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Stripe Webhook] Signature verification failed: ${errorMessage}`, { body, signature });
    return NextResponse.json({ error: `Webhook Error: Signature verification failed` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.succeeded for PI: ${paymentIntentSucceeded.id}`);

        let transaction;
        try {
          transaction = await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentSucceeded.id },
            data: {
              status: 'succeeded',
              paymentMethodType: paymentIntentSucceeded.payment_method_types[0] || null,
            },
          });
          console.log(`[Stripe Webhook] Successfully updated DonationTransaction ${transaction.id} status to succeeded for PI: ${paymentIntentSucceeded.id}`);
        } catch (error) {
          console.error(`[Stripe Webhook] Error updating DonationTransaction for PI: ${paymentIntentSucceeded.id}`, error);
          // If we can't update the transaction, we should probably stop and not try to update the donor.
          // Return a 500 to Stripe so it might retry.
          return NextResponse.json({ error: 'Failed to update transaction record.' }, { status: 500 });
        }

        if (transaction && transaction.donorId) {
          console.log(`[Stripe Webhook] Attempting to update Donor ${transaction.donorId} for PI: ${paymentIntentSucceeded.id}`);
          const donor = await prisma.donor.findUnique({
            where: { id: transaction.donorId },
          });

          if (donor) {
            console.log(`[Stripe Webhook] Found Donor ${donor.id}. Preparing update data.`);
            const donorUpdateData: Prisma.DonorUpdateInput = {};
            
            let stripeName: string | null = null;
            let stripeEmail: string | null = null;
            let stripeAddress: Stripe.Address | null = null;

            const charge = typeof paymentIntentSucceeded.latest_charge === 'object' 
                ? paymentIntentSucceeded.latest_charge as Stripe.Charge 
                : null;
            if (charge) console.log(`[Stripe Webhook] Extracted charge object from PI.`);

            const paymentMethod = typeof paymentIntentSucceeded.payment_method === 'object' 
                ? paymentIntentSucceeded.payment_method as Stripe.PaymentMethod 
                : null;
            if (paymentMethod) console.log(`[Stripe Webhook] Extracted payment_method object from PI.`);


            if (paymentIntentSucceeded.shipping) {
              stripeName = paymentIntentSucceeded.shipping.name ?? null;
              stripeAddress = paymentIntentSucceeded.shipping.address ?? null;
              console.log(`[Stripe Webhook] From shipping: name='${stripeName}', address='${JSON.stringify(stripeAddress)}'`);
            }

            if (charge?.billing_details) {
              if (!stripeName) stripeName = charge.billing_details.name ?? null;
              if (!stripeAddress) stripeAddress = charge.billing_details.address ?? null;
              if (!stripeEmail) stripeEmail = charge.billing_details.email ?? null;
              console.log(`[Stripe Webhook] From charge.billing_details: name='${stripeName}', email='${stripeEmail}', address='${JSON.stringify(stripeAddress)}'`);
            }

            if (paymentMethod?.billing_details) {
              if (!stripeName) stripeName = paymentMethod.billing_details.name ?? null;
              if (!stripeAddress) stripeAddress = paymentMethod.billing_details.address ?? null;
              if (!stripeEmail) stripeEmail = paymentMethod.billing_details.email ?? null;
              console.log(`[Stripe Webhook] From paymentMethod.billing_details: name='${stripeName}', email='${stripeEmail}', address='${JSON.stringify(stripeAddress)}'`);
            }
            
            if (!stripeEmail && paymentIntentSucceeded.receipt_email) {
              stripeEmail = paymentIntentSucceeded.receipt_email;
              console.log(`[Stripe Webhook] From PI.receipt_email: email='${stripeEmail}'`);
            }
            
            if ((!donor.firstName || !donor.lastName) && stripeName) {
              const nameParts = stripeName.split(' ');
              if (!donor.firstName && nameParts.length > 0) donorUpdateData.firstName = nameParts.shift() || stripeName; 
              if (!donor.lastName && nameParts.length > 0) donorUpdateData.lastName = nameParts.join(' ');
              else if (!donor.lastName && donor.firstName && stripeName === donor.firstName && nameParts.length === 0) {} 
              else if (!donor.lastName && donor.firstName && stripeName !== donor.firstName) {
                const potentialLastName = stripeName.replace(donor.firstName, '').trim();
                if (potentialLastName) donorUpdateData.lastName = potentialLastName;
              }
            }

            if (!donor.email && stripeEmail) donorUpdateData.email = stripeEmail;

            if (stripeAddress) {
              if (!donor.addressLine1 && stripeAddress.line1) donorUpdateData.addressLine1 = stripeAddress.line1;
              // Corrected field names to match Prisma schema for Donor model
              if (!donor.city && stripeAddress.city) donorUpdateData.city = stripeAddress.city;
              if (!donor.state && stripeAddress.state) donorUpdateData.state = stripeAddress.state;
              if (!donor.postalCode && stripeAddress.postal_code) donorUpdateData.postalCode = stripeAddress.postal_code;
              if (!donor.country && stripeAddress.country) donorUpdateData.country = stripeAddress.country;
            }

            if (Object.keys(donorUpdateData).length > 0) {
              console.log(`[Stripe Webhook] Donor update data prepared:`, donorUpdateData);
              try {
                await prisma.donor.update({
                  where: { id: donor.id },
                  data: donorUpdateData,
                });
                console.log(`[Stripe Webhook] Successfully updated Donor record ${donor.id}.`);
              } catch (donorUpdateError) {
                console.error(`[Stripe Webhook] Error updating Donor record ${donor.id}:`, donorUpdateError);
                // Log error but don't necessarily fail the whole webhook for this, transaction is already updated.
              }
            } else {
              console.log(`[Stripe Webhook] No new information from Stripe to update Donor ${donor.id}.`);
            }
          } else {
            console.log(`[Stripe Webhook] Donor record not found for donorId ${transaction.donorId}. Cannot update donor.`);
          }
        } else {
            console.log(`[Stripe Webhook] No donorId found on transaction ${transaction?.id}, or transaction object is null. Skipping donor update.`);
        }
        break;

      case 'payment_intent.processing':
        const paymentIntentProcessing = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.processing for PI: ${paymentIntentProcessing.id}`);
        try {
          await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentProcessing.id },
            data: { status: 'processing' },
          });
          console.log(`[Stripe Webhook] Updated transaction status to processing for PI: ${paymentIntentProcessing.id}`);
        } catch (error) {
          console.error(`[Stripe Webhook] Error updating DonationTransaction to processing for PI: ${paymentIntentProcessing.id}`, error);
          return NextResponse.json({ error: 'Failed to update transaction to processing status.' }, { status: 500 });
        }
        break;

      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Processing payment_intent.payment_failed for PI: ${paymentIntentFailed.id}`);
        try {
            await prisma.donationTransaction.update({
            where: { stripePaymentIntentId: paymentIntentFailed.id },
            data: { status: 'failed' },
            });
            console.log(`[Stripe Webhook] Updated transaction status to failed for PI: ${paymentIntentFailed.id}`);
        } catch (error) {
            console.error(`[Stripe Webhook] Error updating DonationTransaction to failed for PI: ${paymentIntentFailed.id}`, error);
            return NextResponse.json({ error: 'Failed to update transaction to failed status.' }, { status: 500 });
        }
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('[Stripe Webhook] General error processing webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed. View logs.' }, { status: 500 });
  }

  console.log('[Stripe Webhook] Successfully processed event. Responding to Stripe.');
  return NextResponse.json({ received: true });
}