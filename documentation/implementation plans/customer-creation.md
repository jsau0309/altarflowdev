# Implementation Plan: Enhanced Customer Creation & Prisma Donor Update

**Version:** 1.0
**Date:** 2025-05-28

## 1. Goal

To ensure donor information is accurately captured and stored:
1.  In the internal Prisma `Donor` model, including verified phone numbers and other provided details.
2.  As a Stripe `Customer` object on the respective **church's Stripe Connected Account**.
This will facilitate correct email receipting (branded from the church or as per their settings) and allow churches to view/manage their donors within their own Stripe dashboard.

## 2. Background & Context

Currently, Stripe Customers might be created on the main platform account, leading to platform-branded receipts. Additionally, there have been instances where donor details provided during donation were not fully saved to the internal Prisma `Donor` model (Ref: MEMORY[b192c498-5253-4b5f-bcf8-a838fbd85bca]). This plan addresses both issues.

## 3. Key Files & Systems Involved

*   **Frontend:**
    *   `components/donation/donation-payment.tsx` (or the primary component handling donation form data and submission)
*   **Backend API Routes:**
    *   [app/api/donations/initiate/route.ts](cci:7://file:///Users/samuelalonso/altarflowdev/app/api/donations/initiate/route.ts:0:0-0:0) (main logic for donation initiation, customer creation, PaymentIntent)
    *   `app/api/donors/otp/check/route.ts` (for phone verification context)
*   **Database:**
    *   Prisma Schema (`prisma/schema.prisma` - `Donor` model)
*   **External Services:**
    *   Stripe API (Customers, PaymentIntents, Connected Accounts)
    *   Twilio API (for phone verification - contextually important)

## 4. Pre-requisites

*   Ensure the `Church` model in Prisma has a reliable way to link to its `StripeConnectAccount` record (e.g., a relation that allows fetching the `stripeAccountId` like `acct_...`).
*   The [.env](cci:7://file:///Users/samuelalonso/altarflowdev/.env:0:0-0:0) file should have `STRIPE_SECRET_KEY` correctly configured.

## 5. Implementation Steps

### Step 5.1: Review and Enhance Prisma `Donor` Model

*   **Action:** Open `prisma/schema.prisma`.
*   **Verify/Ensure:** The `Donor` model includes the following fields (add if missing, then generate and apply a migration):
    *   `id String @id @default(cuid())`
    *   `firstName String?`
    *   `lastName String?`
    *   `email String? @unique` (Consider if email should be unique, or if phone is the primary unique identifier for logged-in/verified donors)
    *   `phone String? @unique` (This should store the E.164 formatted verified phone number)
    *   `isPhoneVerified Boolean @default(false)`
    *   `addressLine1 String?`
    *   `addressLine2 String?`
    *   `city String?`
    *   `state String?` // Or region/province
    *   `postalCode String?`
    *   `country String?` // e.g., ISO 2-letter country code
    *   `stripeCustomerId String?` // To store Stripe Customer ID *on the platform account* if ever needed.
    *   `createdAt DateTime @default(now())`
    *   `updatedAt DateTime @updatedAt`
    *   `transactions DonationTransaction[]`
*   **Note:** For Stripe Customer IDs on *connected accounts*, it might be better to not store them directly on the `Donor` model if a donor can donate to multiple churches. The association is primarily within Stripe. However, if a donor is "scoped" to one church primarily, you could add `stripeConnectedCustomerId` and `associatedChurchId`. For now, we'll focus on creating them on the fly.

### Step 5.2: Frontend - Data Collection & Submission

*   **File:** `components/donation/donation-payment.tsx` (or equivalent)
*   **Action:**
    1.  Ensure the donation form correctly collects:
        *   First Name, Last Name, Email.
        *   Phone number (which then goes through OTP verification).
        *   Address fields (Street, City, State, Zip, Country).
    2.  After successful phone OTP verification (e.g., via `/api/donors/otp/check`):
        *   The frontend should have access to the verified phone number.
        *   The state managing form data should include all these fields.
    3.  When submitting to `/api/donations/initiate`:
        *   Pass *all* collected donor details (firstName, lastName, email, verifiedPhone, address fields) in the POST request body.

### Step 5.3: Backend - [/api/donations/initiate/route.ts](cci:7://file:///Users/samuelalonso/altarflowdev/app/api/donations/initiate/route.ts:0:0-0:0) - Core Logic Update

This is the most critical part. Modify the [POST](cci:1://file:///Users/samuelalonso/altarflowdev/app/api/donations/initiate/route.ts:48:0-368:1) handler:

**5.3.1. Retrieve Church and Stripe Connected Account ID:**

*   Get `churchId` (UUID) from the request body.
*   Fetch the `Church` record from Prisma.
*   Crucially, fetch the associated `StripeConnectAccount` record to get its `stripeAccountId` (e.g., `acct_XXXX`). This ID is essential for making API calls on behalf of the connected account.
    ```typescript
    // Example:
    const church = await prisma.church.findUnique({
      where: { id: validation.data.churchId },
      include: { stripeConnectAccount: true }, // Assuming this relation exists
    });

    if (!church || !church.stripeConnectAccount?.stripeAccountId) {
      return NextResponse.json({ error: 'Church or its Stripe connection not found.' }, { status: 404 });
    }
    const connectedStripeAccountId = church.stripeConnectAccount.stripeAccountId;
    ```

**5.3.2. Prisma `Donor` Record Management (Upsert Logic):**

*   Extract donor details from `validation.data`: `firstName`, `lastName`, `email`, `phone` (verified), `street`, `city`, `state`, `postalCode`, `country`.
*   Let `donorUpdateData` be the object for Prisma.
    ```typescript
    const {
      donorFirstName, donorLastName, donorEmail, donorPhone,
      street, city, region, postalCode, country // Assuming these are validated names
    } = validation.data;

    let internalDonorRecord;

    if (donorPhone) { // Prioritize phone if available and verified
      internalDonorRecord = await prisma.donor.upsert({
        where: { phone: donorPhone },
        update: {
          firstName: donorFirstName || undefined,
          lastName: donorLastName || undefined,
          email: donorEmail || undefined,
          isPhoneVerified: true,
          addressLine1: street || undefined,
          // ... other address fields
          country: country || undefined,
        },
        create: {
          phone: donorPhone,
          firstName: donorFirstName || undefined,
          lastName: donorLastName || undefined,
          email: donorEmail || undefined,
          isPhoneVerified: true,
          addressLine1: street || undefined,
          // ... other address fields
          country: country || undefined,
        },
      });
    } else if (donorEmail) { // Fallback to email if phone not provided
      internalDonorRecord = await prisma.donor.upsert({
        where: { email: donorEmail }, // Ensure email has a @unique constraint if using this as where
        update: { /* similar to above, but don't set phone or isPhoneVerified unless available */ },
        create: { /* similar to above */ },
      });
    }
    // internalDonorRecord now holds the created/updated donor from your DB
    ```

**5.3.3. Stripe Customer Management (on Church's Connected Account):**

*   Initialize `paymentIntentParams.customer = undefined;`
*   If `donorEmail` is present:
    ```typescript
    let stripeCustomer;
    const customerSearchParams = { email: donorEmail, limit: 1 };
    const customerListOptions = { stripeAccount: connectedStripeAccountId }; // API call on behalf of connected account

    const existingCustomers = await stripe.customers.list(customerSearchParams, customerListOptions);

    const customerPayload = {
      email: donorEmail,
      name: donorFirstName && donorLastName ? `${donorFirstName} ${donorLastName}` : (donorFirstName || donorLastName || undefined),
      phone: donorPhone || undefined, // Verified phone
      address: street ? {
        line1: street,
        city: city || undefined,
        state: region || undefined,
        postal_code: postalCode || undefined,
        country: country || undefined, // Expects 2-letter ISO country code
      } : undefined,
      metadata: {
        internalDonorId: internalDonorRecord?.id || 'unknown', // Link to your DB record
        // any other relevant metadata
      },
    };

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
      // Update existing customer on connected account
      stripeCustomer = await stripe.customers.update(
        stripeCustomer.id,
        customerPayload, // Send only fields that might change or are new
        { stripeAccount: connectedStripeAccountId }
      );
    } else {
      // Create new Stripe Customer on connected account
      stripeCustomer = await stripe.customers.create(
        customerPayload,
        { stripeAccount: connectedStripeAccountId }
      );
    }
    paymentIntentParams.customer = stripeCustomer.id; // Associate PI with this customer
    ```

**5.3.4. Prepare and Create Stripe PaymentIntent:**

*   The `paymentIntentParams` should already include `amount`, `currency`, `metadata`.
*   Add `paymentIntentParams.customer = stripeCustomer.id;` (from step 5.3.3).
*   **Crucially, ensure `receipt_email` is still set:**
    `if (donorEmail) paymentIntentParams.receipt_email = donorEmail;`
    This acts as a direct instruction for *this specific PaymentIntent's receipt*.
*   The `transfer_data` should point to the `connectedStripeAccountId`:
    `paymentIntentParams.transfer_data = { destination: connectedStripeAccountId };`
*   Create the PaymentIntent using the idempotency key.
    ```typescript
    // const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, { idempotencyKey });
    // This call is typically made by the platform, so no `stripeAccount` header here.
    // The customer and transfer_data direct it correctly.
    ```

**5.3.5. Create/Update `DonationTransaction` in Prisma:**

*   When creating the `DonationTransaction` record:
    *   Link it to `donorId: internalDonorRecord?.id` (if `internalDonorRecord` was created/found).
    *   Store `stripePaymentIntentId`, `status: 'pending'`, amounts, fees, etc.

### Step 5.4: Testing Strategy

Thoroughly test the following scenarios:

1.  **New Donor - Anonymous Donation (Email Only):**
    *   Input: Email, Amount. "Anonymous" checked.
    *   Expected:
        *   Prisma `Donor` created/updated with email.
        *   Stripe Customer created on **church's connected account** with email.
        *   Receipt sent to donor's email (check branding).
        *   Church can see this customer in their Stripe Dashboard.

2.  **New Donor - Full Details with Phone Verification:**
    *   Input: All fields (Name, Email, Phone, Address), Amount. Phone verified.
    *   Expected:
        *   Prisma `Donor` created with all details, `isPhoneVerified: true`.
        *   Stripe Customer created on **church's connected account** with all details.
        *   Receipt sent. Church sees customer.

3.  **Existing Prisma Donor (by verified phone) - New Donation, potentially different email:**
    *   Input: Same phone, different email/name, Amount. Phone verified.
    *   Expected:
        *   Prisma `Donor` (found by phone) is updated with new email/name.
        *   Stripe Customer on connected account:
            *   If found by old email, it's updated.
            *   If not found by new email, a new one is created (or logic to reconcile by phone if Stripe allows/you implement). This part can be tricky if emails change often. Stripe's primary customer lookup is often email.
        *   Receipt sent to the *new* email provided for the transaction.

4.  **Existing Stripe Customer on Connected Account (by email) - New Donation:**
    *   Input: Same email, Amount.
    *   Expected:
        *   Existing Stripe Customer on connected account is used and potentially updated.
        *   Receipt sent.

5.  **Error Cases:**
    *   Invalid `churchId`.
    *   Stripe API errors during customer or PaymentIntent creation.

### Step 5.5: Review Stripe Connect Settings & Receipt Customization

*   Advise churches (or check for them) on how to customize their receipt appearance and email settings within their Stripe Express/Standard dashboard if they desire.
*   Ensure your platform's Stripe Connect settings (e.g., for email branding for connected accounts) are configured as intended.

## 6. Rollback Plan (if needed)

*   Revert changes in [app/api/donations/initiate/route.ts](cci:7://file:///Users/samuelalonso/altarflowdev/app/api/donations/initiate/route.ts:0:0-0:0) to the previous version.
*   If Prisma schema changed, roll back the migration (if feasible and no critical data loss).
*   Code changes are generally reversible via version control.

## 7. Future Considerations

*   More sophisticated duplicate donor detection in Prisma (e.g., fuzzy matching names if phone/email aren't exact).
*   Allowing donors to manage their saved information.
*   Syncing updates from Stripe Customer (e.g., if a church updates a customer's email in their Stripe dashboard) back to your Prisma `Donor` model (would require webhooks for `customer.updated` events on connected accounts).
