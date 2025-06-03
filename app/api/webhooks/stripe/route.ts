import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Resend client (ensure RESEND_API_KEY is in .env)
const resend = new Resend(process.env.RESEND_API_KEY!);

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

            const charge = typeof paymentIntentSucceeded.latest_charge === 'string' 
                ? await stripe.charges.retrieve(paymentIntentSucceeded.latest_charge) // Retrieve if it's an ID
                : typeof paymentIntentSucceeded.latest_charge === 'object' 
                ? paymentIntentSucceeded.latest_charge as Stripe.Charge 
                : null;
            if (charge) console.log(`[Stripe Webhook] Extracted charge object from PI.`);

            const paymentMethod = typeof paymentIntentSucceeded.payment_method === 'string'
                ? await stripe.paymentMethods.retrieve(paymentIntentSucceeded.payment_method) // Retrieve if it's an ID
                : typeof paymentIntentSucceeded.payment_method === 'object' 
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

        try {
          console.log(`[Stripe Webhook] Attempting to send receipt for PI: ${paymentIntentSucceeded.id}`);
          await handleSuccessfulPaymentIntent(paymentIntentSucceeded);
        } catch (receiptError: any) {
          console.error(`[Stripe Webhook] Error in receipt handling logic for PI: ${paymentIntentSucceeded.id}:`, receiptError);
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

async function handleSuccessfulPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const donationTransaction = await prisma.donationTransaction.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: {
      donationType: true,
      donor: true,
    },
  });

  if (!donationTransaction) {
    console.error(`[Receipt] DonationTransaction not found for PaymentIntent ${paymentIntent.id}`);
    return;
  }

  // Ensure the transaction status is 'succeeded' before sending a receipt.
  if (donationTransaction.status !== 'succeeded') {
    console.warn(`[Receipt] DonationTransaction ${donationTransaction.id} status is '${donationTransaction.status}', not 'succeeded'. Receipt not sent.`);
    return;
  }

  const church = await prisma.church.findUnique({
    where: { id: donationTransaction.churchId },
  });

  if (!church || !church.clerkOrgId) {
    console.error(`[Receipt] Church or ClerkOrgId not found for Church ID ${donationTransaction.churchId}`);
    return;
  }

  const stripeConnectAccountDb = await prisma.stripeConnectAccount.findUnique({
    where: { churchId: church.clerkOrgId },
  });

  if (!stripeConnectAccountDb || !stripeConnectAccountDb.stripeAccountId) {
    console.error(`[Receipt] StripeConnectAccount (DB) not found for ClerkOrgId ${church.clerkOrgId}`);
    return;
  }
  const connectedStripeAccountId = stripeConnectAccountDb.stripeAccountId;

  let ein = 'N/A'; // Default EIN
  let churchRegisteredName = church.name;
  let churchRegisteredAddressObj: Stripe.Address = { // Initialize with DB values or defaults
    line1: church.address || '',
    city: '', 
    state: '',
    postal_code: '',
    country: '', 
    line2: null
  };
  let churchRegisteredEmail = church.email || 'N/A';
  let churchRegisteredPhone = church.phone || 'N/A';
  let churchLogoUrl: string | undefined = church.logoUrl || undefined;

  let stripeAccount: Stripe.Account | null = null;
  try {
    // First attempt: retrieve with expansion
    console.log(`[Receipt] Attempting to retrieve Stripe Account ${connectedStripeAccountId} with expansion: company.tax_ids, settings.tax_ids`);
    stripeAccount = await stripe.accounts.retrieve(
      connectedStripeAccountId,
      {
        expand: ['company.tax_ids', 'settings.tax_ids'],
      }
    );
    console.log(`[Receipt] Successfully retrieved Stripe Account ${connectedStripeAccountId} with expansion.`);
  } catch (error: any) {
    console.warn(`[Receipt] Error retrieving Stripe Account ${connectedStripeAccountId} with expansion: ${error.message}`);
    if (error.type === 'StripeInvalidRequestError' && error.message && error.message.includes('cannot be expanded')) {
      console.log(`[Receipt] Attempting to retrieve Stripe Account ${connectedStripeAccountId} without expansion due to 'cannot be expanded' error.`);
      try {
        // Second attempt: retrieve without expansion
        stripeAccount = await stripe.accounts.retrieve(connectedStripeAccountId);
        console.log(`[Receipt] Successfully retrieved Stripe Account ${connectedStripeAccountId} without expansion.`);
      } catch (fallbackError: any) {
        console.error(`[Receipt] Error retrieving Stripe Account ${connectedStripeAccountId} even without expansion: ${fallbackError.message}`);
      }
    } else {
      console.error(`[Receipt] Non-expansion related error retrieving Stripe Account ${connectedStripeAccountId} during initial attempt: ${error.message}`);
    }
  }

  if (stripeAccount) {
    console.log(`[Receipt] Stripe Account ${connectedStripeAccountId} retrieved. Processing for EIN and details.`);
    churchRegisteredName = stripeAccount.company?.name || stripeAccount.settings?.dashboard?.display_name || church.name;
    if (stripeAccount.company?.address) {
      churchRegisteredAddressObj = {
        line1: stripeAccount.company.address.line1 || '',
        line2: stripeAccount.company.address.line2 || null,
        city: stripeAccount.company.address.city || '',
        state: stripeAccount.company.address.state || '',
        postal_code: stripeAccount.company.address.postal_code || '',
        country: stripeAccount.company.address.country || '',
      };
    }
    churchRegisteredEmail = stripeAccount.email || churchRegisteredEmail;
    churchRegisteredPhone = stripeAccount.company?.phone || stripeAccount.business_profile?.support_phone || churchRegisteredPhone;
    console.log(`[Receipt] Updated church details from Stripe Account: Name='${churchRegisteredName}', Email='${churchRegisteredEmail}', Phone='${churchRegisteredPhone}'`);

    let foundEin: string | undefined = undefined;

    const companyTaxIds = (stripeAccount.company as any)?.tax_ids;
    if (companyTaxIds && companyTaxIds.data && Array.isArray(companyTaxIds.data)) {
      console.log(`[Receipt] Checking company.tax_ids (expanded). Found ${companyTaxIds.data.length} IDs.`);
      for (const taxId of companyTaxIds.data) {
        if (taxId.type === 'us_ein' && taxId.value) {
          foundEin = taxId.value;
          console.log(`[Receipt] EIN found in company.tax_ids: ${foundEin}`);
          break;
        }
      }
    } else {
      console.log(`[Receipt] company.tax_ids (expanded) not available, not in expected format, or expansion failed.`);
    }

    const settingsTaxIds = (stripeAccount.settings as any)?.tax_ids;
    if (!foundEin && settingsTaxIds && settingsTaxIds.data && Array.isArray(settingsTaxIds.data)) {
      console.log(`[Receipt] Checking settings.tax_ids (expanded). Found ${settingsTaxIds.data.length} IDs.`);
      for (const taxId of settingsTaxIds.data) {
        if (taxId.type === 'us_ein' && taxId.value) {
          foundEin = taxId.value;
          console.log(`[Receipt] EIN found in settings.tax_ids: ${foundEin}`);
          break;
        }
      }
    } else if (!foundEin) {
      console.log(`[Receipt] settings.tax_ids (expanded) not available, not in expected format, or expansion failed.`);
    }

    if (!foundEin && stripeAccount.settings?.invoices?.default_account_tax_ids && Array.isArray(stripeAccount.settings.invoices.default_account_tax_ids)) {
      const defaultTaxIds = stripeAccount.settings.invoices.default_account_tax_ids;
      console.log(`[Receipt] Checking default_account_tax_ids. Found ${defaultTaxIds.length} ID(s) to retrieve.`);
      for (const taxIdString of defaultTaxIds) {
        if (typeof taxIdString === 'string') {
          console.log(`[Receipt] Attempting to retrieve Tax ID object for ID: ${taxIdString}`);
          try {
            const taxIdObj = await stripe.taxIds.retrieve(taxIdString);
            console.log(`[Receipt] Retrieved Tax ID object: type=${taxIdObj.type}, value=${taxIdObj.value}`);
            if (taxIdObj.type === 'us_ein' && taxIdObj.value) {
              foundEin = taxIdObj.value;
              console.log(`[Receipt] EIN found via default_account_tax_ids: ${foundEin}`);
              break;
            }
          } catch (taxIdError: any) {
            console.warn(`[Receipt] Error fetching Tax ID ${taxIdString}: ${taxIdError.message}`);
          }
        }
      }
    } else if (!foundEin) {
      console.log(`[Receipt] default_account_tax_ids not available, not an array, or no IDs to process.`);
    }

    if (foundEin) {
      ein = foundEin;
      console.log(`[Receipt] Final EIN for receipt: ${ein} for Stripe Account ${connectedStripeAccountId}`);
    } else {
      console.warn(`[Receipt] EIN not found for Stripe Account ${connectedStripeAccountId} after all checks. Defaulting to 'N/A'.`);
      const companyInfoForLog = stripeAccount.company ? { name: stripeAccount.company.name, tax_ids_exist: !!(stripeAccount.company as any)?.tax_ids } : 'No company info';
      const settingsInfoForLog = stripeAccount.settings ? { dashboard_display_name: stripeAccount.settings.dashboard?.display_name, tax_ids_exist: !!(stripeAccount.settings as any)?.tax_ids, default_tax_ids_exist: !!stripeAccount.settings.invoices?.default_account_tax_ids } : 'No settings info';
      console.log(`[Receipt] Stripe Account for EIN review (summary): company: ${JSON.stringify(companyInfoForLog)}, settings: ${JSON.stringify(settingsInfoForLog)}`);
    }
  } else {
    console.warn(`[Receipt] Stripe Account object for ${connectedStripeAccountId} is null (likely due to retrieval failure). EIN retrieval and account detail update skipped. Using defaults/DB values for receipt.`);
  }

  const donorEmail = donationTransaction.donorEmail || donationTransaction.donor?.email;
  if (!donorEmail) {
    console.error(`[Receipt] No donor email found for transaction ${donationTransaction.id}. Cannot send receipt.`);
    return;
  }

  const donorName = donationTransaction.donorName || `${donationTransaction.donor?.firstName || ''} ${donationTransaction.donor?.lastName || ''}`.trim() || 'Valued Donor';

  let donorAddressParts = [];
  if (donationTransaction.donor?.addressLine1) donorAddressParts.push(donationTransaction.donor.addressLine1);
  let cityStateZipParts = [];
  if (donationTransaction.donor?.city) cityStateZipParts.push(donationTransaction.donor.city);
  if (donationTransaction.donor?.state) cityStateZipParts.push(donationTransaction.donor.state);
  if (donationTransaction.donor?.postalCode) cityStateZipParts.push(donationTransaction.donor.postalCode);
  if (cityStateZipParts.length > 0) donorAddressParts.push(cityStateZipParts.join(' '));
  if (donationTransaction.donor?.country) donorAddressParts.push(donationTransaction.donor.country);
  const donorAddress = donorAddressParts.length > 0 ? donorAddressParts.join('\n') : 'N/A';

  const churchAddressString = [
    churchRegisteredAddressObj.line1,
    churchRegisteredAddressObj.line2,
    `${churchRegisteredAddressObj.city || ''}${churchRegisteredAddressObj.city && (churchRegisteredAddressObj.state || churchRegisteredAddressObj.postal_code) ? ', ' : ''}${churchRegisteredAddressObj.state || ''} ${churchRegisteredAddressObj.postal_code || ''}`.trim(),
    churchRegisteredAddressObj.country
  ].filter(Boolean).join('\n');

  const receiptData = {
    transactionId: donationTransaction.id,
    datePaid: new Date(paymentIntent.created * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    amountPaid: (paymentIntent.amount_received / 100).toFixed(2),
    currency: paymentIntent.currency.toUpperCase(),
    paymentMethod: paymentIntent.payment_method_types[0] ? paymentIntent.payment_method_types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
    churchName: churchRegisteredName,
    churchEin: ein,
    churchAddress: churchAddressString,
    churchEmail: churchRegisteredEmail,
    churchPhone: churchRegisteredPhone,
    churchLogoUrl: churchLogoUrl,
    donorName: donorName,
    donorEmail: donorEmail,
    donorAddress: donorAddress,
    donationCampaign: donationTransaction.donationType?.name || 'General Donation',
    disclaimer: "No goods or services were provided in exchange for this contribution. This receipt confirms your donation to a 501(c)(3) non-profit organization."
  };

  const emailHtml = generateReceiptHtml(receiptData);

  try {
    await resend.emails.send({
      from: `Altarflow <receipts@${process.env.YOUR_VERIFIED_RESEND_DOMAIN}>`,
      to: [donorEmail],
      subject: `Your Donation Receipt from ${receiptData.churchName}`,
      html: emailHtml,
    });
    console.log(`[Receipt] Receipt email sent to ${donorEmail} for transaction ${donationTransaction.id}`);

    await prisma.donationTransaction.update({
      where: { id: donationTransaction.id },
      data: { processedAt: new Date() },
    });
    console.log(`[Receipt] Marked DonationTransaction ${donationTransaction.id} as processed for receipt.`);
  } catch (emailError) {
    console.error(`[Receipt] Error sending receipt email for transaction ${donationTransaction.id}:`, emailError);
  }
}

function generateReceiptHtml(data: {
  transactionId: string;
  datePaid: string;
  amountPaid: string;
  currency: string;
  paymentMethod: string;
  churchName: string;
  churchEin: string;
  churchAddress: string;
  churchEmail: string;
  churchPhone: string;
  donorName: string;
  donorEmail: string;
  donorAddress: string;
  donationCampaign: string;
  disclaimer: string;
  churchLogoUrl?: string; 
}): string {
  const formatAddress = (address: string) => address.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt - ${data.churchName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
    .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
    .header img { max-width: 150px; margin-bottom: 10px; }
    .header h1 { color: #333333; margin: 0; font-size: 24px; }
    .content { padding: 20px 0; }
    .content p { color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0; }
    .content strong { color: #333333; }
    .details-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
    .details-table th, .details-table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; }
    .details-table th { color: #333333; background-color: #f9f9f9; width: 40%; }
    .details-table td { color: #555555; }
    .section-title { color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;}
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777; }
    .disclaimer { font-size: 14px; color: #555555; font-style: italic; margin-top: 25px; padding-top:15px; border-top: 1px solid #eeeeee;}
  </style>
</head>
<body>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" border="0" cellpadding="20" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td class="header" style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
              ${data.churchLogoUrl ? `<img src="${data.churchLogoUrl}" alt="${data.churchName} Logo" style="max-width: 150px; margin-bottom: 10px;"><br>` : ''}
              <h1 style="color: #333333; margin: 0; font-size: 24px;">Donation Receipt</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 20px 0;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">Dear ${data.donorName},</p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">Thank you for your generous donation to <strong style="color: #333333;">${data.churchName}</strong>. We are grateful for your support.</p>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Receipt Details</h2>
              <table role="presentation" class="details-table" width="100%" style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Transaction ID:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">${data.transactionId}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Date Paid:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">${data.datePaid}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Amount Donated:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">${data.amountPaid} ${data.currency}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Payment Method:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Donated To:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">${data.donationCampaign}</td>
                </tr>
              </table>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Donor Information</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">
                <strong style="color: #333333;">Name:</strong> ${data.donorName}<br>
                <strong style="color: #333333;">Email:</strong> ${data.donorEmail}<br>
                ${data.donorAddress && data.donorAddress !== 'N/A' ? `<strong style="color: #333333;">Address:</strong><br>${formatAddress(data.donorAddress)}` : ''}
              </p>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Organization Information</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">
                <strong style="color: #333333;">${data.churchName}</strong><br>
                <strong style="color: #333333;">EIN:</strong> ${data.churchEin}<br>
                ${data.churchAddress && data.churchAddress.trim() !== 'N/A' && data.churchAddress.trim() !== '' ? `<strong style="color: #333333;">Address:</strong><br>${formatAddress(data.churchAddress)}<br>` : ''}
                <strong style="color: #333333;">Contact:</strong> Email: ${data.churchEmail} | Phone: ${data.churchPhone}
              </p>
              
              <p class="disclaimer" style="font-size: 14px; color: #555555; font-style: italic; margin-top: 25px; padding-top:15px; border-top: 1px solid #eeeeee;">
                <em>${data.disclaimer}</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777;">
              <p>If you have any questions, please contact ${data.churchName}.</p>
              <p>Powered by Altarflow &copy; ${new Date().getFullYear()} Altarflow. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}