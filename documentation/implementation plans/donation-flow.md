# Donation Flow Implementation Plan

This plan outlines the steps to implement the donation flow, allowing church members to make one-time and recurring donations to churches that have onboarded with Stripe Connect.

**Assumptions:**
*   Churches can already create and verify Stripe Connect accounts.
*   Basic Stripe SDK and API key setup is in place.

---

## Phase 1: Core Backend Setup - Data Models & Basic Donation Types

**Objective:** Establish the database structure for donations and create a way to represent basic donation categories.

**Step 1.1: Define `DonationType` Prisma Model**
*   **File:** `prisma/schema.prisma`
*   **Action:** Add the `DonationType` model.
    ```prisma
    model DonationType {
      id                  String    @id @default(cuid())
      churchId            String
      name                String    // e.g., "Tithe", "Offering", "Building Fund"
      description         String?
      isRecurringAllowed  Boolean   @default(true) // Can this type be a recurring donation?
      // Consider if you need a defaultAmount or suggestedAmounts
      // isActive            Boolean   @default(true) // For churches to enable/disable types later

      createdAt           DateTime  @default(now())
      updatedAt           DateTime  @updatedAt

      church              Church    @relation(fields: [churchId], references: [id], onDelete: Cascade)
      donations           DonationTransaction[] // Relation to transactions

      @@unique([churchId, name]) // Ensure unique type names per church
    }
    ```
*   **Testing:** None directly, model definition only.

**Step 1.2: Define `DonationTransaction` Prisma Model**
*   **File:** `prisma/schema.prisma`
*   **Action:** Add the `DonationTransaction` model.
    ```prisma
    model DonationTransaction {
      id                      String    @id @default(cuid())
      churchId                String
      donationTypeId          String
      donorClerkId            String?   // If donations are linked to logged-in users (Clerk ID)
      donorName               String?   // If anonymous or guest donations are allowed
      donorEmail              String?   // For receipts, if anonymous or guest
      amount                  Int       // In cents
      currency                String    // e.g., "usd"
      status                  String    // e.g., "pending", "succeeded", "failed", "requires_action"
      paymentMethodType       String?   // e.g., "card", "us_bank_account"
      isRecurring             Boolean   @default(false)
      stripePaymentIntentId   String?   @unique // For one-time payments or initial setup of subscriptions
      stripeSubscriptionId    String?   @unique // For recurring payments
      stripeCustomerId        String?   // Stripe Customer ID, useful for managing payment methods and subscriptions
      
      transactionDate         DateTime  @default(now())
      processedAt             DateTime? // When webhook confirmed success

      church                  Church    @relation(fields: [churchId], references: [id], onDelete: Cascade)
      donationType            DonationType @relation(fields: [donationTypeId], references: [id], onDelete: Restrict) // Prevent deleting type if donations exist
      // userProfile             UserProfile? @relation(fields: [donorClerkId], references: [clerkId]) // If linking to user profiles
    }
    ```
*   **Testing:** None directly, model definition only.

**Step 1.3: Run Prisma Migration**
*   **Action:** Execute `npx prisma migrate dev --name add_donation_flow_models` in the terminal.
*   **Testing:** Verify the migration file is created and the database schema is updated successfully.

**Step 1.4: Seed/Ensure Default Donation Types (MVP Simplification)**
*   **File:** New seed script (e.g., `prisma/seed.ts`) or logic within church creation/setup.
*   **Action (MVP):** For now, we'll aim to have "Tithe" and "Offering" as default types.
    *   If using a seed script: Update `package.json` and `prisma/seed.ts` to create these types for existing/new churches.
    *   Alternatively, create an internal function that can be called to ensure these types exist for a given church.
*   **Testing:** Manually check the database to confirm "Tithe" and "Offering" types are created for a test church.

**Step 1.5: Create API to List Donation Types for a Church**
*   **File:** New API route, e.g., `app/api/churches/[churchId]/donation-types/route.ts`
*   **Action:**
    *   Implement a `GET` handler.
    *   Takes `churchId` from the path.
    *   Fetches `DonationType` records from the database for that `churchId`.
    *   Returns the list of donation types.
*   **Testing:** Use a tool like Postman or curl to call the endpoint for a test church and verify it returns the expected donation types.

---

## Phase 2: Backend - One-Time Donation Logic

**Objective:** Enable the backend to process a single, non-recurring donation.

**Step 2.1: Create API Endpoint for Initiating Donations**
*   **File:** New API route, e.g., `app/api/donations/initiate/route.ts`
*   **Action:** Implement a `POST` handler.
    *   **Request Body:** `churchId`, `donationTypeId`, `amount` (in cents), `currency` ("usd"), `isRecurring: false`, `paymentMethodId` (optional, if client sends it directly), `donorName` (optional), `donorEmail` (optional).
    *   **Initial Logic:**
        1.  Validate inputs.
        2.  Retrieve the `churchStripeAccountId` from the `StripeConnectAccount` table using `churchId`.
        3.  Create a Stripe Customer (or retrieve if `donorEmail` or `donorClerkId` exists and you want to link them). Store `stripeCustomerId` if created.
        4.  Create a Stripe `PaymentIntent`.
            *   `amount`, `currency`
            *   `customer: stripeCustomerId`
            *   `payment_method_types: ['card']` (or other types you want to support)
            *   `transfer_data: { destination: churchStripeAccountId }` (This is for Destination Charges. Adjust if using a different Connect charge type).
            *   `metadata: { churchId, donationTypeId, transactionType: 'one-time' }`
        5.  Create a `DonationTransaction` record in your database with `status: 'pending'`, `isRecurring: false`, and the `stripePaymentIntentId`.
        6.  Return `client_secret` of the PaymentIntent and the `id` of your `DonationTransaction`.
*   **Testing:**
    *   Call the endpoint with valid data. Verify a PaymentIntent is created in Stripe (visible in logs/dashboard) and a `DonationTransaction` record is created in your DB.
    *   Test with invalid inputs (missing fields, invalid churchId) to ensure proper error handling.

**Step 2.2: Enhance Webhook Handler for One-Time Payment Success/Failure**
*   **File:** `app/api/webhooks/stripe/route.ts`
*   **Action:** Add cases for:
    *   `payment_intent.succeeded`:
        1.  Retrieve the `DonationTransaction` using `event.data.object.id` (the PaymentIntent ID).
        2.  Update its `status` to "succeeded", `paymentMethodType` (from `event.data.object.payment_method_details.type`), and `processedAt`.
        3.  (Future) Trigger email receipt if not handled by Stripe directly.
    *   `payment_intent.payment_failed`:
        1.  Retrieve the `DonationTransaction`.
        2.  Update its `status` to "failed".
        3.  Log the failure reason.
*   **Testing:**
    *   Use Stripe CLI: `stripe trigger payment_intent.succeeded --override payment_intent:id=<test_pi_id>`
    *   Use Stripe CLI: `stripe trigger payment_intent.payment_failed --override payment_intent:id=<test_pi_id>`
    *   Verify the `DonationTransaction` status is updated correctly in the database.

---

## Phase 3: Frontend - One-Time Donation Form

**Objective:** Allow users to make a one-time donation through the UI.

**Step 3.1: Design and Build Basic Donation Form UI**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx` (or similar, depending on your routing for specific churches)
*   **Action:**
    *   Fetch church details (including `churchId` for API calls) based on `churchSlug`.
    *   Fetch donation types for the church using the API from Step 1.5.
    *   Create a form with:
        *   Dropdown/Radio buttons to select `DonationType`.
        *   Input field for `amount`.
        *   (For MVP) Fields for `donorName` and `donorEmail` if allowing guest donations.
        *   Placeholder for Stripe Elements.
*   **Testing:** Manually view the page and ensure basic layout and data fetching (donation types) work.

**Step 3.2: Integrate Stripe Elements for Payment Method Collection**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx` and potentially a new client component for the Stripe form.
*   **Action:**
    *   Use `@stripe/react-stripe-js` and `@stripe/stripe-js`.
    *   Wrap your form or relevant part with `<Elements stripe={stripePromise}>`.
    *   Add Stripe's `PaymentElement` or individual elements like `CardElement`.
*   **Testing:** Verify Stripe Elements render correctly on the form.

**Step 3.3: Implement Form Submission Logic (One-Time)**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx` (or the Stripe form component).
*   **Action:**
    *   On form submit:
        1.  Prevent default form submission.
        2.  Call your backend API (`/api/donations/initiate/route.ts` from Step 2.1) with form data (amount, donationTypeId, churchId, donor info, `isRecurring: false`).
        3.  Get the `client_secret` and `transactionId` from the API response.
        4.  Use `stripe.confirmPayment()` (if using PaymentElement) or `stripe.confirmCardPayment()` (if using CardElement) with the `client_secret` and payment element details.
            *   `elements` from `useElements()`
            *   `confirmParams: { return_url: 'current_page_url_for_confirmation_status' }` (or handle result directly without redirect)
        5.  Handle the result:
            *   Success: Show a success message.
            *   Failure/Requires Action: Show an appropriate error message.
*   **Testing:**
    *   Attempt a full one-time donation using test card numbers provided by Stripe.
    *   Verify the payment succeeds in Stripe and the webhook updates the transaction.
    *   Test with failing card numbers to see error handling.

**Step 3.4: Display Payment Status/Receipt (Basic)**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx`
*   **Action:**
    *   After `stripe.confirmPayment()` resolves, display a clear success message to the user, including amount and donation type.
    *   If there's an error, display it clearly.
*   **Testing:** Observe UI feedback after successful and failed donation attempts.

---

## Phase 4: Backend - Recurring Donation Logic (Subscriptions)

**Objective:** Enable the backend to process recurring donations.

**Step 4.1: Enhance API Endpoint for Initiating Donations (Recurring)**
*   **File:** `app/api/donations/initiate/route.ts`
*   **Action:** Modify the `POST` handler from Step 2.1.
    *   Add logic to handle `isRecurring: true`.
    *   **Request Body (additional for recurring):** `recurringInterval` (e.g., "month", "year" - for MVP, "month" is fine).
    *   **Logic for Recurring:**
        1.  Inputs: `churchId`, `donationTypeId`, `amount`, `currency`, `isRecurring: true`, `recurringInterval`, `paymentMethodId` (from client), `donorName`, `donorEmail`.
        2.  Retrieve `churchStripeAccountId`.
        3.  Retrieve/Create Stripe `Customer` (as in Step 2.1). **Crucial for subscriptions.**
        4.  Attach the `paymentMethodId` to the `Customer` and set it as `invoice_settings.default_payment_method`.
        5.  Find/Create a Stripe `Product` representing the donation (e.g., "Monthly Tithe for [Church Name]").
        6.  Find/Create a Stripe `Price` for that Product with the specified `amount` and `recurringInterval`.
        7.  Create a Stripe `Subscription`:
            *   `customer: stripeCustomerId`
            *   `items: [{ price: priceId }]`
            *   `expand: ['latest_invoice.payment_intent']` (to get client_secret for initial setup if needed)
            *   `transfer_data: { destination: churchStripeAccountId }`
            *   `metadata: { churchId, donationTypeId, transactionType: 'recurring' }`
        8.  Create a `DonationTransaction` record:
            *   `status: 'pending'` (or 'active' if subscription creation implies first payment attempt)
            *   `isRecurring: true`
            *   `stripeSubscriptionId: subscription.id`
            *   `stripePaymentIntentId: subscription.latest_invoice.payment_intent.id` (if expanded and available)
        9.  Return `subscriptionId`, `client_secret` (from `latest_invoice.payment_intent.client_secret` if initial payment needs confirmation), and your `transactionId`.
*   **Testing:**
    *   Call API with `isRecurring: true`. Verify Stripe Customer, Product, Price, and Subscription are created.
    *   Verify a `DonationTransaction` record is created with recurring details.

**Step 4.2: Enhance Webhook Handler for Subscription Events**
*   **File:** `app/api/webhooks/stripe/route.ts`
*   **Action:** Add cases for:
    *   `invoice.paid`:
        1.  Check if it's for a subscription (`event.data.object.subscription` will be present).
        2.  Retrieve the original `DonationTransaction` using the `subscription_id` (or create a new one for this installment if your model is per-installment).
        3.  Update/Create transaction: `status: 'succeeded'`, `amount` (from invoice), `processedAt`.
    *   `invoice.payment_failed`:
        1.  Similar to `invoice.paid`, but update status to "failed".
    *   `customer.subscription.updated`, `customer.subscription.deleted`:
        1.  Update the status of the corresponding `DonationTransaction` (e.g., mark as "cancelled" or update recurring details).
*   **Testing:**
    *   Use Stripe CLI to trigger `invoice.paid`, `invoice.payment_failed` for a test subscription.
    *   Verify `DonationTransaction` records are created/updated correctly.
    *   Manually change a subscription in Stripe dashboard (e.g., cancel) and check webhook processing.

---

## Phase 5: Frontend - Recurring Donation Form & Management (Basic)

**Objective:** Allow users to sign up for recurring donations.

**Step 5.1: Update Donation Form UI for Recurring Options**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx`
*   **Action:**
    *   Add UI elements to select donation frequency (e.g., "One-Time", "Monthly").
    *   Ensure `isRecurringAllowed` from `DonationType` is respected (disable recurring option if not allowed).
*   **Testing:** Verify UI changes and that recurring options appear correctly.

**Step 5.2: Implement Form Submission Logic (Recurring)**
*   **File:** `/app/(public)/donate/[churchSlug]/page.tsx` (or the Stripe form component).
*   **Action:**
    *   Modify form submission logic:
        *   If "recurring" is selected, call your backend API (`/api/donations/initiate/route.ts`) with `isRecurring: true` and `recurringInterval`.
        *   Handle the response:
            *   If the subscription's first payment requires confirmation (i.e., a `client_secret` for `latest_invoice.payment_intent` is returned), use `stripe.confirmPayment()` as in the one-time flow.
            *   If the subscription is active immediately, just show a success message.
*   **Testing:**
    *   Attempt to sign up for a recurring donation.
    *   Verify the subscription is created in Stripe and the initial transaction is processed.
    *   Check webhook updates.

**Step 5.3: (Future/Optional MVP+) Basic Subscription Management View**
*   **Objective:** Allow logged-in users to see their active recurring donations.
*   **Action (Post-MVP):**
    *   Create a new page for user profiles/dashboard.
    *   API endpoint to list active subscriptions for a `donorClerkId`.
    *   Display active subscriptions with an option to "Manage" (which could link to Stripe's customer portal if configured, or provide a cancel option via your API).
*   **Testing:** Verify users can see their subscriptions.

---

## Phase 6: Refinements, Security, and Production Readiness

**Objective:** Polish the feature, ensure security, and prepare for deployment.

**Step 6.1: Robust Error Handling and User Feedback**
*   **Action:** Review all frontend and backend error paths. Ensure clear, user-friendly messages are shown. Log errors appropriately.
*   **Testing:** Intentionally trigger various error conditions (API errors, Stripe errors, network issues).

**Step 6.2: Security Review**
*   **Action:**
    *   Ensure all Stripe API calls are made from the backend.
    *   Validate all inputs on the backend.
    *   Protect against CSRF, XSS if applicable to your form setup.
    *   Ensure Stripe webhook secret is securely managed and verified.
    *   Review data access controls (e.g., can a user for church A trigger donations for church B?).
*   **Testing:** Perform security-focused testing.

**Step 6.3: Configure Stripe Customer Portal (Optional but Recommended for Recurring)**
*   **Action:** In your Stripe Dashboard, configure the Customer Portal to allow users to manage their own subscriptions (update payment methods, cancel).
*   **Action:** Add an API endpoint to create a Customer Portal session: `stripe.billingPortal.sessions.create()`.
*   **Action:** Link to this portal from your user dashboard (if built in Step 5.3).
*   **Testing:** Verify users can access and use the Stripe Customer Portal.

**Step 6.4: Final End-to-End Testing**
*   **Action:** Test the entire flow with various scenarios:
    *   One-time donation (guest, logged-in user).
    *   Recurring donation sign-up.
    *   Webhook processing for subsequent recurring payments.
    *   Different donation types and amounts.
*   **Testing:** Simulate a full user journey.

**Step 6.5: Environment Variables and Configuration**
*   **Action:** Ensure all necessary environment variables (Stripe keys, webhook secrets, database URL) are correctly configured for development, staging, and production.
*   **Testing:** Deploy to a staging environment and test.

---

This detailed plan should provide a good roadmap. Remember to commit frequently and test each step thoroughly.