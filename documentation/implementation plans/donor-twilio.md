# Implementation Plan: Twilio OTP Donor Identification & Data Storage

This plan outlines the steps to implement a donor identification system using Twilio OTP for phone verification, allowing for data pre-fill for returning donors and collection for new donors, separate from the Clerk authentication used for church administrators.

## Phase 0: Prerequisites & Setup

1.  **Twilio Account:**
    *   Ensure you have a Twilio account.
    *   Create a Twilio Verify Service: Note the **Service SID**.
    *   Obtain your Twilio **Account SID** and **Auth Token**.
2.  **Environment Variables:**
    *   Add the following to your `.env.local` (and corresponding production environment variables):
        ```
        TWILIO_ACCOUNT_SID=your_account_sid
        TWILIO_AUTH_TOKEN=your_auth_token
        TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
        ```
3.  **Install Twilio SDK:**
    *   `npm install twilio` or `yarn add twilio`

## Phase 1: Backend Development (Supabase & API Endpoints)

1.  **Database Schema (Supabase/PostgreSQL with Prisma):**
    *   Define a new `Donor` model in your `prisma/schema.prisma` file:
        ```prisma
        model Donor {
          id        String   @id @default(cuid())
          phoneNumber String   @unique // Store in E.164 format
          firstName String?
          lastName  String?
          email     String?  // Consider if this should also be unique or if one phone can have multiple email history
          addressLine1 String?
          addressCity  String?
          addressState String?
          addressPostalCode String?
          addressCountry String?

          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt

          // Optional: Link to DonationTransactions if needed later
          // donationTransactions DonationTransaction[]
        }
        ```
    *   Run `npx prisma migrate dev --name add_donor_table` to apply the migration.
    *   Run `npx prisma generate` to update your Prisma Client.

2.  **API Endpoint: Send OTP (`POST /api/donors/otp/send`)**
    *   **Purpose:** Takes a phone number, sends an OTP using Twilio Verify.
    *   **Request Body:** `{ "phoneNumber": "E.164_formatted_number" }`
    *   **Logic:**
        *   Initialize Twilio client.
        *   Call Twilio Verify API to send OTP to the provided phone number via the Verify Service SID.
        *   Handle success and errors from Twilio.
    *   **Response:**
        *   Success: `{ "success": true, "message": "OTP sent successfully." }` (HTTP 200)
        *   Error: `{ "success": false, "error": "Error message" }` (HTTP 400/500)

3.  **API Endpoint: Check OTP & Fetch/Identify Donor (`POST /api/donors/otp/check`)**
    *   **Purpose:** Verifies OTP; if valid, checks if donor exists and returns their data.
    *   **Request Body:** `{ "phoneNumber": "E.164_formatted_number", "otpCode": "user_entered_otp" }`
    *   **Logic:**
        *   Initialize Twilio client.
        *   Call Twilio Verify API to check the OTP.
        *   If OTP is valid (`status === 'approved'`):
            *   Query `Donor` table in Supabase (via Prisma) using `phoneNumber`.
            *   If donor found: Return donor details.
            *   If donor not found: Indicate new donor.
        *   If OTP is invalid: Return error.
    *   **Response:**
        *   Success (Existing Donor): `{ "success": true, "isExistingDonor": true, "donorDetails": { ...donor_data } }`
        *   Success (New Donor): `{ "success": true, "isExistingDonor": false }`
        *   Error (OTP Invalid/Twilio Error): `{ "success": false, "error": "Invalid OTP or verification failed." }`

4.  **API Endpoint: Create New Donor (`POST /api/donors`)**
    *   **Purpose:** Saves details of a new donor after successful phone verification and form completion.
    *   **Request Body:** `{ "phoneNumber": "...", "firstName": "...", "lastName": "...", "email": "...", "address": { ... } }`
    *   **Logic:**
        *   Validate input.
        *   Create a new record in the `Donor` table using Prisma.
    *   **Response:**
        *   Success: `{ "success": true, "donor": { ...created_donor_data } }` (HTTP 201)
        *   Error: `{ "success": false, "error": "Failed to create donor." }`

5.  **(Optional) API Endpoint: Update Donor (`PUT /api/donors/:phoneNumber`)**
    *   **Purpose:** Allows an existing donor to update their pre-filled information.
    *   **Logic:** Similar to create, but updates an existing record.

## Phase 2: Frontend Development (`DonationForm.tsx` & `DonationInfo.tsx`)

1.  **State Management (in `DonationForm.tsx` or a dedicated context/store):**
    *   `formData`: Object to hold all donor PII (firstName, lastName, email, phone, address components, isAnonymous).
    *   `phoneVerificationStage`: String enum (`'initial'`, `'otp_sent'`, `'verifying_otp'`, `'verified_existing_donor'`, `'verified_new_donor'`, `'anonymous_selected'`, `'otp_failed'`, `'verification_error'`).
    *   `enteredOtp`: String for the OTP input.
    *   `isLoadingOtpAction`: Boolean for loading indicators.
    *   `apiErrorMessage`: String to display API errors.

2.  **Refactor `DonationInfo.tsx` UI:**
    *   **Initial View (`phoneVerificationStage === 'initial'`):**
        *   Phone number input (consider `react-phone-number-input` for E.164 formatting).
        *   "Verify Phone" button.
        *   "Donate anonymously" checkbox.
        *   Other PII fields are hidden.
    *   **Anonymous Flow (`phoneVerificationStage === 'anonymous_selected'`):**
        *   Show First Name, Last Name, Email (for receipt). Other fields hidden.
    *   **OTP Entry View (`phoneVerificationStage === 'otp_sent'` or `'otp_failed'`):**
        *   Display phone number (disabled).
        *   OTP input field.
        *   "Submit OTP" button.
        *   "Resend OTP" / "Change Phone Number" options.
    *   **Data Entry/Review Views (`verified_existing_donor` or `verified_new_donor`):**
        *   Show all PII fields (First Name, Last Name, Email, Phone (disabled), Address).
        *   Pre-fill for existing donors.
        *   Required validation for new donors.

3.  **Implement Frontend Logic:**
    *   **`handleSendOtp()`:**
        *   Client-side phone validation.
        *   Call `POST /api/donors/otp/send`.
        *   Update `phoneVerificationStage` and `isLoadingOtpAction`.
    *   **`handleCheckOtp()`:**
        *   Call `POST /api/donors/otp/check`.
        *   Update `phoneVerificationStage`, `formData` (if existing donor), and `isLoadingOtpAction`.
    *   **`handleNextFromInfoStep()` (when user clicks "Next" after filling details as a new donor):**
        *   Call `POST /api/donors` to save the new donor's information.
        *   On success, proceed to the payment step.
    *   **Anonymous Flow Logic:**
        *   Toggle `formData.isAnonymous`.
        *   Update `phoneVerificationStage`.
        *   Ensure only necessary fields are shown/required.
    *   **Error Handling:** Display `apiErrorMessage` appropriately.

## Phase 3: Integration & Updates

1.  **Update `DonationPayment.tsx` & `/api/donations/initiate/route.ts`:**
    *   Ensure that the `formData` (now potentially pre-filled or newly entered via the OTP flow) is correctly passed from `DonationForm.tsx` to `DonationPayment.tsx`.
    *   The `/api/donations/initiate` endpoint will receive this `formData`. Its logic for creating/retrieving a Stripe Customer based on `formData.email` (if not anonymous) remains largely the same.
    *   The `DonationTransaction` record should store the PII as collected.

2.  **Stripe Link (Optional but Recommended):**
    *   Consider adding the `<LinkAuthenticationElement />` in `CheckoutForm.tsx` (inside `DonationPayment.tsx`) before the `<PaymentElement />`.
    *   Prefill its email field using `formData.email`. This allows users to leverage Stripe Link for faster payment entry, complementing your Twilio OTP for PII pre-fill.

## Phase 4: Testing

1.  **Backend API Tests:**
    *   Use tools like Postman or write integration tests for each API endpoint.
    *   Test valid OTP, invalid OTP, existing donor, new donor scenarios.
2.  **Frontend Flow Tests:**
    *   Manually test the entire donation flow:
        *   New donor: Phone verification -> OTP -> Fill details -> Payment.
        *   Returning donor: Phone verification -> OTP -> Pre-filled details -> Payment.
        *   Anonymous donor: Checkbox -> Fill minimal details -> Payment.
        *   OTP resend, change phone number.
        *   Error conditions (invalid phone, Twilio errors, etc.).
3.  **Data Verification:**
    *   Check Supabase `Donor` table for correct data creation/updates.
    *   Check Stripe dashboard for Customer creation with correct details (if not anonymous).
    *   Check `DonationTransaction` table for correct PII storage.