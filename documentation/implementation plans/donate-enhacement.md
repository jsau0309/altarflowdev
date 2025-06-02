# Implementation Plan: Enhanced Donation Page with Stripe Payment Element

**Objective:** Integrate Stripe's Payment Element to support additional payment methods including Bank Accounts (ACH), Apple Pay, and Google Pay, providing a more versatile and user-friendly donation experience.

## Phase 1: Stripe Account Configuration & Backend Setup

### Step 1.1: Enable Payment Methods in Stripe Dashboard
*   **Action:** Log in to your Stripe Dashboard.
*   Navigate to **Settings > Payment methods**.
*   Ensure the following payment methods are **turned on**:
    *   Cards (already active)
    *   US bank accounts (ACH direct debit)
    *   Apple Pay
    *   Google Pay
*   **Apple Pay Specific:**
    *   Under Apple Pay settings, add and verify all domains where Apple Pay will be used (e.g., `yourdomain.com`, `www.yourdomain.com`). This usually involves uploading a verification file to your web server.
*   **Purpose:** To make these payment options available for your Stripe account.
*   **Stripe Docs:** [Manage payment methods](https://dashboard.stripe.com/settings/payment_methods)

### Step 1.2: Update Backend API for PaymentIntent Creation
*   **File:** `app/api/donations/initiate/route.ts`
*   **Action:** Modify the `stripe.paymentIntents.create` call.
    *   Replace the explicit `payment_method_types` array (if present) with `automatic_payment_methods: { enabled: true }`. This allows Stripe to dynamically display the most relevant payment methods to the user based on their device, location, and other factors.
*   **Code Snippet (Illustrative):**
    ```typescript
    // Inside app/api/donations/initiate/route.ts
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: 'on_session', // Or 'off_session'
      automatic_payment_methods: { enabled: true }, // Key change
      metadata: {
        churchId: church.id,
        donationTypeId: donationTypeId,
        donorId: newOrUpdatedDonor.id,
        isAnonymous: isAnonymous,
        // Add any other relevant metadata
      },
    });
    ```
*   **Purpose:** To instruct Stripe to prepare for multiple payment methods managed by the Payment Element.

## Phase 2: Frontend Integration with Stripe Payment Element

### Step 2.1: Update Stripe Elements Provider and Component Structure
*   **File:** `components/donation/donation-form.tsx` (or the specific component handling the payment step).
*   **Action:**
    *   Ensure `@stripe/react-stripe-js` and `@stripe/stripe-js` are up-to-date.
    *   The `Elements` provider wrapping your payment form will remain, but the elements it contains will change.
*   **Key Imports:**
    ```tsx
    import {
      PaymentElement,
      LinkAuthenticationElement, // Optional, but recommended for Link users
      useStripe,
      useElements
    } from '@stripe/react-stripe-js';
    import { loadStripe } from '@stripe/stripe-js';
    ```

### Step 2.2: Replace CardElement with PaymentElement
*   **File:** `components/donation/donation-form.tsx` (Payment step).
*   **Action:**
    *   Remove the existing `<CardElement />`.
    *   Add the `<PaymentElement />`.
    *   Optionally, keep or add `<LinkAuthenticationElement />` above the `PaymentElement` for a streamlined Link experience.
*   **Code Snippet (Illustrative JSX):**
    ```tsx
    // Inside your form component's return statement
    const [email, setEmail] = useState(''); // If using LinkAuthenticationElement

    // ...
    <form onSubmit={handlePaymentSubmit}>
      {/* Optional: For Stripe Link */}
      <LinkAuthenticationElement
        id="link-authentication-element"
        onChange={(event) => {
          // @ts-ignore // Stripe's event type might need specific handling
          if (event.value && event.value.email) {
            // @ts-ignore
            setEmail(event.value.email);
          }
        }}
      />

      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      {/* Consider layout options: "tabs", "accordion", or default */}

      <button disabled={isLoading || !stripe || !elements} type="submit">
        {isLoading ? "Processing..." : `Donate ${formatCurrency(formData.amount)}`}
      </button>
      {paymentError && <div className="text-red-500 mt-2">{paymentError}</div>}
    </form>
    ```

### Step 2.3: Update Payment Submission Logic
*   **File:** `components/donation/donation-form.tsx` (Payment step).
*   **Action:** Modify the form submission handler (`handlePaymentSubmit`).
    *   Use `stripe.confirmPayment()` instead of `stripe.confirmCardPayment()` or similar.
    *   Provide a `return_url` where Stripe will redirect the user after they complete the payment authentication (e.g., for 3D Secure, bank redirects for ACH).
*   **Code Snippet (Illustrative Handler):**
    ```typescript
    const handlePaymentSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      setIsLoading(true);
      setPaymentError(null);

      if (!stripe || !elements) {
        setPaymentError("Stripe.js has not loaded yet.");
        setIsLoading(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Make sure to change this to your payment completion page
          return_url: `${window.location.origin}/donation-confirmation?churchSlug=${churchSlug}&amount=${formData.amount}`,
          // receipt_email: donorEmail, // Optional: if you have the donor's email and want Stripe to send a receipt
        },
        // redirect: 'if_required' // Uncomment if you want to handle redirect manually or show messages on the same page for non-redirect flows.
                                  // For ACH and some other methods, redirect is often necessary.
      });

      // This point will only be reached if redirect: 'if_required' is used
      // and the payment method doesn't require a redirect, or if an error occurs.
      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setPaymentError(error.message || "An unexpected error occurred.");
        } else {
          setPaymentError("An unexpected error occurred. Please try again.");
        }
        setIsLoading(false);
      } else if (paymentIntent) {
        // Handle successful payment (if not relying on redirect and webhook)
        // e.g., navigate to a success page or display a success message.
        // Note: For ACH, status might be 'processing'.
        console.log("PaymentIntent status:", paymentIntent.status);
        // Typically, you'll rely on the return_url and webhooks for final confirmation.
        setIsLoading(false);
      }
    };
    ```

### Step 2.4: Create a Donation Confirmation/Return Page
*   **Action:** Create a new page (e.g., `/donation-confirmation`) that Stripe redirects to via the `return_url`.
*   **Purpose:**
    *   This page should retrieve the `payment_intent_client_secret` and `payment_intent` ID from the URL query parameters.
    *   It can then use `stripe.retrievePaymentIntent(clientSecret)` to get the latest status of the PaymentIntent.
    *   Display appropriate messages to the user (e.g., "Thank you for your donation!", "Your donation is processing.", "Payment failed.").
*   **Note:** For ACH payments, the status will likely be `processing` initially. You'll rely on webhooks to confirm success or failure later.

## Phase 3: Webhook Handling & Testing

### Step 3.1: Enhance Stripe Webhook Handler
*   **File:** `app/api/webhooks/stripe/route.ts`
*   **Action:** Ensure your webhook handler can process the following events:
    *   `payment_intent.succeeded`: For confirming successful payments (especially important for delayed notification methods like ACH).
    *   `payment_intent.payment_failed`: For handling failed payments.
    *   `payment_intent.processing`: For payment methods that enter a processing state (like ACH).
*   **Logic:** Upon receiving these events, update your database (e.g., `DonationTransaction` status) and trigger any necessary notifications.

### Step 3.2: Local Webhook Testing
*   **Action:** Use the Stripe CLI to forward webhook events to your local development server:
    ```bash
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
    ```
*   **Purpose:** To test the entire payment lifecycle, including asynchronous updates via webhooks, especially for ACH.

### Step 3.3: End-to-End Testing Scenarios
*   **Action:** Manually test the donation flow with various payment methods.
*   **Key Scenarios:**
    1.  **Card Payment:** Successful, 3D Secure (if applicable), failed.
    2.  **Link Payment:** Successful.
    3.  **Apple Pay:** Successful (requires Safari on a compatible Apple device).
    4.  **Google Pay:** Successful (requires Chrome on a compatible device with Google Pay setup).
    5.  **ACH Direct Debit (US Bank Account):**
        *   Successful payment (will go into `processing` then `succeeded` after a delay).
        *   Failed payment (e.g., insufficient funds, after a delay).
        *   Bank account verification flow if Stripe requires it (Payment Element handles UI for this).
*   **Check:**
    *   UI behavior on the frontend (error messages, loading states, redirects).
    *   Data in your Stripe Dashboard (payments, customers).
    *   Data in your application's database (donation records).
    *   Webhook events being received and processed correctly.

## Phase 4: UI/UX Refinements

### Step 4.1: Loading and Error States
*   **Action:** Ensure clear loading indicators are shown during payment processing.
*   Display user-friendly error messages from Stripe or custom messages for different failure scenarios.

### Step 4.2: Payment Element Styling
*   **Action:** The Payment Element can be customized using the Stripe Appearance API if needed, but default styling is often sufficient.
*   **Stripe Docs:** [Appearance API](https://stripe.com/docs/elements/appearance-api)

### Step 4.3: Responsive Design
*   **Action:** Test the payment form across different screen sizes to ensure it's responsive and usable.

## Phase 5: Deployment and Post-Launch Monitoring

### Step 5.1: Pre-Deployment Checklist
*   Ensure all Stripe API keys (publishable and secret) are correctly configured for the production environment.
*   Verify webhook endpoint in Stripe Dashboard is set to the production URL.
*   Confirm Apple Pay domain verification is complete for the production domain.

### Step 5.2: Deploy Changes
*   Deploy backend and frontend updates to your production environment.

### Step 5.3: Monitor
*   Monitor Stripe Dashboard for payment activities and any errors.
*   Check application logs for any issues.

This plan provides a comprehensive guide to implementing the enhanced payment options. Remember to consult the official Stripe documentation frequently, as features and best practices can evolve.