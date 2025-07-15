# Custom Donation Receipt Implementation Plan

## 1. Objective
To implement a custom email receipt system for donations, triggered by successful Stripe payments. These receipts will be compliant with 501(c)(3) requirements, pulling necessary information from the database and Stripe, and sent via Resend.

## 2. Prerequisites
*   **Stripe Account:** Configured for processing payments, with Stripe Connect set up for churches.
*   **Resend Account:** Active account with a verified domain (e.g., altarflow.com) for sending emails.
*   **Prisma Schema:**
    *   `Church` model with `id` (UUID), `clerkOrgId`, `name`, `address`, `phone`, `email`, and optionally `logoUrl`.
    *   `StripeConnectAccount` model with `stripeAccountId` (the `acct_...` ID) linked to `Church.clerkOrgId`.
    *   `DonationTransaction` model with `churchId` (linking to `Church.id`), `donationTypeId`, `donorId` (optional), `donorEmail`, `donorName`, `amount`, `stripePaymentIntentId`.
    *   `DonationType` model with `name` (campaign/fund name).
    *   `Donor` model with `firstName`, `lastName`, `email`, `addressLine1`, `city`, `state`, `postalCode`, `country`.
*   **Development Environment:** Node.js, npm/yarn, Next.js project setup.

## 3. Core Components
1.  **Stripe Webhook Endpoint:** An API route in Next.js to receive and process events from Stripe.
2.  **Data Retrieval Logic:** Code to fetch all necessary information for the receipt from Prisma DB and Stripe API.
3.  **Email Service Integration:** Using the Resend SDK to send emails.
4.  **Email Template:** An HTML (recommended) or plain text template for the receipt.

## 4. Detailed Implementation Steps

### Step 4.1: Environment Setup
1.  **Install Dependencies:**
    ```bash
    npm install stripe resend
    # or
    yarn add stripe resend
    ```
2.  **Environment Variables:** Add the following to your `.env` (or `.env.local`):
    ```env
    # Stripe
    STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY # Use your actual secret key
    STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SIGNING_SECRET # From Stripe dashboard when creating webhook

    # Resend
    RESEND_API_KEY=re_YOUR_RESEND_API_KEY
    YOUR_VERIFIED_RESEND_DOMAIN=yourdomain.com # e.g., altarflow.com

    # Application
    NEXT_PUBLIC_APP_URL=http://localhost:3000 # Or your production URL
    DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
    DIRECT_URL="postgresql://user:password@host:port/database?schema=public"
    ```

### Step 4.2: Stripe Webhook Endpoint
Create `app/api/webhooks/stripe/route.ts`:

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma'; // Adjust path to your prisma client

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10', // Use the latest API version
  typescript: true,
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

// Stripe Webhook Signing Secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable Next.js body parsing for this route, Stripe needs the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to buffer the request
async function buffer(readable: NodeJS.ReadableStream) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const buf = await buffer(req.body!);
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error verifying webhook signature: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`✅ PaymentIntent ${paymentIntent.id} succeeded.`);
      try {
        await handleSuccessfulPaymentIntent(paymentIntent);
      } catch (error: any) {
        console.error(`Error handling payment_intent.succeeded for ${paymentIntent.id}:`, error);
        // Optionally, you could return a 500 here if you want Stripe to retry
        // For now, log and acknowledge to prevent retries for this specific error type
      }
      break;
    // ... handle other event types if needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

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
    console.error(`DonationTransaction not found for PaymentIntent ${paymentIntent.id}`);
    return;
  }

  const church = await prisma.church.findUnique({
    where: { id: donationTransaction.churchId },
  });

  if (!church || !church.clerkOrgId) {
    console.error(`Church or ClerkOrgId not found for Church ID ${donationTransaction.churchId}`);
    return;
  }

  const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
    where: { churchId: church.clerkOrgId },
  });

  if (!stripeConnectAccount || !stripeConnectAccount.stripeAccountId) {
    console.error(`StripeConnectAccount not found for ClerkOrgId ${church.clerkOrgId}`);
    return;
  }

  let ein = 'N/A';
  let churchRegisteredName = church.name;
  let churchRegisteredAddressObj: Stripe.Address = {
    line1: church.address || '', city: '', state: '', postal_code: '', country: '', line2: null
  };
  let churchRegisteredEmail = church.email || 'N/A';
  let churchRegisteredPhone = church.phone || 'N/A';
  // let churchLogoUrl = church.logoUrl || undefined; // Assuming logoUrl is a field on your Church model

  try {
    const stripeAccount = await stripe.accounts.retrieve(stripeConnectAccount.stripeAccountId);
    ein = stripeAccount.company?.tax_id || 'N/A';
    churchRegisteredName = stripeAccount.business_profile?.name || stripeAccount.settings?.dashboard?.display_name || church.name;
    if (stripeAccount.company?.address) {
        churchRegisteredAddressObj = stripeAccount.company.address;
    }
    churchRegisteredEmail = stripeAccount.email || church.email || 'N/A';
    churchRegisteredPhone = stripeAccount.business_profile?.support_phone || church.phone || 'N/A';
    // churchLogoUrl = stripeAccount.business_profile?.logo || church.logoUrl || undefined; // Check if Stripe provides logo
  } catch (stripeError) {
    console.error(`Error fetching Stripe Account ${stripeConnectAccount.stripeAccountId}:`, stripeError);
  }

  const donorEmail = donationTransaction.donorEmail || donationTransaction.donor?.email;
  if (!donorEmail) {
    console.error(`No donor email found for transaction ${donationTransaction.id}`);
    return;
  }

  const donorName = donationTransaction.donorName || `${donationTransaction.donor?.firstName || ''} ${donationTransaction.donor?.lastName || ''}`.trim() || 'Valued Donor';
  
  let donorAddressParts = [];
  if (donationTransaction.donor?.addressLine1) donorAddressParts.push(donationTransaction.donor.addressLine1);
  let cityStateZip = [];
  if (donationTransaction.donor?.city) cityStateZip.push(donationTransaction.donor.city);
  if (donationTransaction.donor?.state) cityStateZip.push(donationTransaction.donor.state);
  if (donationTransaction.donor?.postalCode) cityStateZip.push(donationTransaction.donor.postalCode);
  if (cityStateZip.length > 0) donorAddressParts.push(cityStateZip.join(', '));
  if (donationTransaction.donor?.country) donorAddressParts.push(donationTransaction.donor.country);
  const donorAddress = donorAddressParts.length > 0 ? donorAddressParts.join('\n') : 'N/A';

  const churchAddressString = [
    churchRegisteredAddressObj.line1,
    churchRegisteredAddressObj.line2,
    `${churchRegisteredAddressObj.city || ''} ${churchRegisteredAddressObj.state || ''} ${churchRegisteredAddressObj.postal_code || ''}`.trim(),
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
    // churchLogoUrl: churchLogoUrl, // Pass logo URL if you have it
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
    console.log(`Receipt sent to ${donorEmail} for transaction ${donationTransaction.id}`);

    await prisma.donationTransaction.update({
      where: { id: donationTransaction.id },
      data: { processedAt: new Date() },
    });

  } catch (emailError) {
    console.error(`Error sending receipt email for transaction ${donationTransaction.id}:`, emailError);
  }
}

// --- 4.4 Email Templating ---
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

  return \`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt - \${data.churchName}</title>
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
              \${data.churchLogoUrl ? \`<img src="\${data.churchLogoUrl}" alt="\${data.churchName} Logo" style="max-width: 150px; margin-bottom: 10px;"><br>\` : ''}
              <h1 style="color: #333333; margin: 0; font-size: 24px;">Donation Receipt</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 20px 0;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">Dear \${data.donorName},</p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">Thank you for your generous donation to <strong style="color: #333333;">\${data.churchName}</strong>. We are grateful for your support.</p>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Receipt Details</h2>
              <table role="presentation" class="details-table" width="100%" style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Transaction ID:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">\${data.transactionId}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Date Paid:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">\${data.datePaid}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Amount Paid:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">\${data.amountPaid} \${data.currency}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Payment Method:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">\${data.paymentMethod}</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #333333; background-color: #f9f9f9; width: 40%;">Donated To:</th>
                  <td style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #eeeeee; font-size: 15px; color: #555555;">\${data.donationCampaign}</td>
                </tr>
              </table>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Donor Information</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">
                <strong style="color: #333333;">Name:</strong> \${data.donorName}<br>
                <strong style="color: #333333;">Email:</strong> \${data.donorEmail}<br>
                \${data.donorAddress && data.donorAddress !== 'N/A' ? \`<strong style="color: #333333;">Address:</strong><br>\${formatAddress(data.donorAddress)}\` : ''}
              </p>

              <h2 class="section-title" style="color: #333333; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Organization Information</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 10px 0;">
                <strong style="color: #333333;">\${data.churchName}</strong><br>
                <strong style="color: #333333;">EIN:</strong> \${data.churchEin}<br>
                \${data.churchAddress && data.churchAddress.trim() !== 'N/A' && data.churchAddress.trim() !== '' ? \`<strong style="color: #333333;">Address:</strong><br>\${formatAddress(data.churchAddress)}<br>\` : ''}
                <strong style="color: #333333;">Contact:</strong> Email: \${data.churchEmail} | Phone: \${data.churchPhone}
              </p>
              
              <p class="disclaimer" style="font-size: 14px; color: #555555; font-style: italic; margin-top: 25px; padding-top:15px; border-top: 1px solid #eeeeee;">
                <em>\${data.disclaimer}</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777;">
              <p>If you have any questions, please contact \${data.churchName}.</p>
              <p>&copy; \${new Date().getFullYear()} \${data.churchName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  \`;
}


### Step 4.7: Testing
1.  **Stripe CLI:**
    *   Install Stripe CLI: `https://stripe.com/docs/stripe-cli`
    *   Login: `stripe login`
    *   Forward webhooks to your local dev server:
        ```bash
        stripe listen --forward-to localhost:3000/api/webhooks/stripe
        ```
        (Replace `localhost:3000` if your dev server runs on a different port)
    *   The CLI will give you a webhook signing secret (`whsec_...`). Use this for `STRIPE_WEBHOOK_SECRET` in your local `.env.local`.
2.  **Trigger Test Payments:**
    *   Use Stripe's test card numbers to make donations through your application in test mode.
    *   Observe the Stripe CLI for `payment_intent.succeeded` events.
    *   Check your local server logs for messages from the webhook handler.
    *   Verify emails are received in the donor's inbox and that the content is correct.
    *   Check Resend dashboard for email sending status.

### Step 4.8: Deployment
1.  **Webhook Endpoint in Stripe Dashboard:**
    *   Go to your Stripe Dashboard -> Developers -> Webhooks.
    *   Add an endpoint:
        *   **Endpoint URL:** `https://YOUR_APP_DOMAIN/api/webhooks/stripe`
        *   **Events to send:** Select `payment_intent.succeeded`.
    *   Stripe will provide a new signing secret for this live endpoint. Update `STRIPE_WEBHOOK_SECRET` in your production environment variables.
2.  **Environment Variables:** Ensure all necessary environment variables (Stripe keys, Resend key, webhook secret, database URL, `YOUR_VERIFIED_RESEND_DOMAIN`) are correctly set in your production deployment environment (e.g., Vercel, Netlify).

## 5. Security Considerations
*   **Webhook Signature Verification:** Crucial to ensure requests are genuinely from Stripe. Already included in the code.
*   **API Keys & Secrets:** Store securely as environment variables. Do not commit them to your repository.
*   **Idempotency:** While Stripe handles idempotency for webhook delivery, ensure your `handleSuccessfulPaymentIntent` logic is idempotent if there's any chance of it being called multiple times for the same event (e.g., if you don't acknowledge receipt quickly enough and Stripe retries). The current structure (finding transaction by `paymentIntent.id` and potentially updating it) is generally safe.

## 6. Future Enhancements (Optional)
*   **PDF Receipts:** Generate and attach PDF versions of the receipt.
*   **User Preferences:** Allow users to opt-out of email receipts (though legally required for non-profits).
*   **Admin Interface:** Allow church admins to view sent receipts or resend them.
*   **Localization:** If supporting multiple languages, localize receipt content.
*   **Advanced Email Templates:** For even more complex designs or dynamic content, consider React Email (from Resend) or MJML.

This plan provides a comprehensive guide. Remember to replace placeholder values (like API keys, domains) with your actual configuration.