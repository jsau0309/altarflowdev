# Stripe Connect Integration - Implementation Plan 1.1

This plan outlines the steps to enhance our Stripe Connect integration, focusing on accurate account verification status and seamless Express Dashboard integration, while adhering to Stripe's best practices.

## Phase 1: Backend - Robust Webhook Handling & Enhanced Data Model

### Step 1: Create a Secure Webhook Endpoint
*   **Action:** Create a new API route: `/app/api/webhooks/stripe/route.ts`.
*   **Purpose:** To receive and process `account.updated` events from Stripe.
*   **Key Tasks:**
    *   Implement **Stripe signature verification** using `stripe.webhooks.constructEvent`. This is critical for security.
    *   Log incoming events for debugging.
*   **Stripe Docs:** [Webhook Signatures](https://docs.stripe.com/webhooks/signatures)

### Step 2: Enhance Prisma Schema for [StripeConnectAccount](cci:2://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:31:0-41:2)
*   **Action:** Modify your `prisma/schema.prisma` file.
*   **Purpose:** To store more detailed verification status and requirements from Stripe.
*   **New Fields for [StripeConnectAccount](cci:2://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:31:0-41:2) model:**
    *   `verificationStatus`: `String` (e.g., "unverified", "pending", "verified", "restricted", "action_required")
    *   `requirementsCurrentlyDue`: `String[]` (to store `account.requirements.currently_due`)
    *   `requirementsEventuallyDue`: `String[]` (to store `account.requirements.eventually_due`)
    *   `requirementsDisabledReason`: `String?` (to store `account.requirements.disabled_reason`)
    *   `tosAcceptanceDate`: `DateTime?` (to store `account.tos_acceptance.date` if applicable)
*   **Action:** Run `npx prisma migrate dev --name enhance_stripe_account_verification` to apply schema changes.

### Step 3: Implement Webhook Processing Logic
*   **Action:** In `/app/api/webhooks/stripe/route.ts`.
*   **Purpose:** To update your database based on `account.updated` events.
*   **Key Tasks:**
    *   Extract the `Stripe.Account` object from the verified event.
    *   Identify the `churchId` (retrieve based on `stripeAccountId` or from metadata).
    *   Determine the new `verificationStatus` based on `account.charges_enabled`, `account.payouts_enabled`, `account.details_submitted`, and `account.requirements`.
        *   If `charges_enabled` & `payouts_enabled` are true: `verified`.
        *   If `details_submitted` is true but not fully enabled: `pending`.
        *   If `requirements.disabled_reason` is set: `restricted` or `action_required`.
        *   Otherwise: `unverified`.
    *   Update the [StripeConnectAccount](cci:2://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:31:0-41:2) record in your database with the new status and all relevant fields from the Stripe Account object.
    *   Implement **idempotency for webhook handling**: Ensure the same event ID is not processed redundantly.
*   **Stripe Docs:** [Handling `account.updated`](https://docs.stripe.com/connect/account-updates), [Required Verification Information](https://docs.stripe.com/connect/required-verification-information)

## Phase 2: Backend - API Endpoint Enhancements

### Step 4: Enhance `getAccount` API Action
*   **Action:** Modify the [POST](cci:1://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:162:0-265:1) handler in [/app/api/stripe/route.ts](cci:7://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:0:0-0:0) for the `getAccount` action.
*   **Purpose:** To provide the frontend with the complete, up-to-date account status, including all new fields.
*   **Key Tasks:**
    *   Ensure this endpoint retrieves and returns all new fields from [StripeConnectAccount](cci:2://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:31:0-41:2).

### Step 5: Create `createLoginLink` API Action
*   **Action:** Add a new case to the [POST](cci:1://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:162:0-265:1) handler in [/app/api/stripe/route.ts](cci:7://file:///Users/samuelalonso/altarflowdev/app/api/stripe/route.ts:0:0-0:0) for an action like `createLoginLink`.
*   **Purpose:** To securely generate a one-time link to the Stripe Express Dashboard.
*   **Key Tasks:**
    *   Input: `churchId`.
    *   Retrieve the `stripeAccountId` for the given `churchId`.
    *   Call `stripe.accounts.createLoginLink(stripeAccountId)`.
    *   Return the `url` from the response.
*   **Stripe Docs:** [Express Dashboard Integration](https://docs.stripe.com/connect/integrate-express-dashboard#redirect)

## Phase 3: Frontend - `StripeConnectButton` Logic Overhaul

### Step 6: Update `StripeConnectButton` State and Data Fetching
*   **Action:** In [/Users/samuelalonso/altarflowdev/components/stripe-connect-button.tsx](cci:7://file:///Users/samuelalonso/altarflowdev/components/stripe-connect-button.tsx:0:0-0:0).
*   **Purpose:** To consume and react to the enhanced account information.
*   **Key Tasks:**
    *   Modify the component's state to store new fields: `verificationStatus`, `requirementsCurrentlyDue`, etc.
    *   Update `useEffect` hooks and the polling mechanism (`checkAccountStatus`) to fetch enhanced account data.

### Step 7: Refine `effectiveStatus` and Button Display Logic
*   **Action:** In `StripeConnectButton`.
*   **Purpose:** To accurately determine the button's text, icon, and action based on detailed account status.
*   **Key Logic Updates:**
    *   **If `verificationStatus` is "verified"**:
        *   Button Text: "View Express Dashboard".
        *   Action: Call your `createLoginLink` API and open the returned URL.
    *   **If `verificationStatus` is "pending"**:
        *   Button Text: "Verification in Progress".
        *   Action: Display an informative message.
    *   **If `verificationStatus` is "action_required" or "restricted"**:
        *   Button Text: "Action Required" or "Update Information".
        *   Action: Inform the user; consider if a link to Stripe is needed.
    *   **If `verificationStatus` is "unverified" or no account**:
        *   Button Text: "Connect with Stripe".
        *   Action: Initiate the account creation/onboarding link process.
    *   Use `isLoading` state during API calls.

### Step 8: Adjust Polling Logic
*   **Action:** In `StripeConnectButton`.
*   **Purpose:** To make polling more efficient and context-aware.
*   **Key Tasks:**
    *   Only poll if `verificationStatus` is "pending".
    *   Polling calls your `getAccount` API.
    *   Stop polling once status is "verified" or "restricted".

## Phase 4: Testing and Refinement

### Step 9: Local Webhook Testing
*   **Action:** Use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
*   **Purpose:** To test the webhook processing flow locally.
*   **Stripe Docs:** [Test Webhooks Locally](https://docs.stripe.com/webhooks/test)

### Step 10: End-to-End Testing Scenarios
*   **Action:** Manually test the entire user journey.
*   **Key Scenarios:**
    1.  New church connects, completes onboarding -> Status "pending" -> "verified".
    2.  Account requires more information -> `requirementsCurrentlyDue` populated, UI reflects.
    3.  Account becomes restricted -> UI reflects.
    4.  Verified account clicks "View Express Dashboard" -> Redirects correctly.
*   **Purpose:** Ensure all states and transitions work as expected.

### Step 11: Review and Iterate
*   **Action:** Review console logs, Stripe Dashboard logs, and user experience.
*   **Purpose:** Identify and fix bugs, improve UX, and ensure all Stripe best practices are met.