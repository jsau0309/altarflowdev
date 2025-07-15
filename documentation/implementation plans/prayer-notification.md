# Implementation Plan: Prayer Request Email Notifications

## 1. Feature Overview

- **Goal:** Notify a designated church email address when a new prayer request is submitted through a Connect Form.
- **Scope:**
    - Allow church admins to configure a recipient email address per Connect Flow.
    - Automatically send an email containing the prayer request and submitter's details to this configured address.

## 2. Data Model Changes

- **Target Model:** `Flow` (specifically its `configJson` field)
- **New Field:**
    - `prayerRequestNotificationEmail` (string, optional): To be stored within `configJson.settings`.
    - Example `configJson.settings` structure:
      ```json
      {
        "enablePrayerRequests": true,
        "prayerRequestNotificationEmail": "pastor@example.com",
        "enableReferralTracking": false,
        // ... other settings
      }
      ```

## 3. UI Changes (Admin Dashboard - Flow Configuration)

- **Target Page/Component:** Flow settings page (likely within `app/(dashboard)/flows/[flowId]/...`) - *To be identified precisely.*
- **Modifications:**
    - Add a new input field:
        - **Label:** "Prayer Request Notification Email" (or similar, needs i18n).
        - **Type:** Email.
        - **Placeholder:** e.g., "prayerteam@church.com".
    - **Conditional Logic:** This input field should ideally only be visible/editable if "Enable Prayer Requests" is toggled ON for the flow.
    - **Validation:** Basic email format validation on the client-side.
    - **Saving:** The value will be saved into the `flow.configJson.settings.prayerRequestNotificationEmail` field.
    - **Translation Keys:** Add new keys for the label and any help text.

## 4. Backend Changes (`lib/actions/flows.actions.ts`)

- **`submitFlow` Function:**
    - After successfully saving the member and submission data:
    - Check if `formData.prayerRequested` is `true` and `formData.prayerRequest` has content.
    - If yes, retrieve the `flow.configJson.settings.prayerRequestNotificationEmail`.
    - If a valid email address is configured:
        - Call a new helper function (e.g., `sendPrayerRequestEmail`) with the necessary details.
- **New Helper Function: `sendPrayerRequestEmail`**
    - **Parameters:**
        - `recipientEmail: string` (the configured notification email)
        - `churchName: string`
        - `submitterFirstName: string`
        - `submitterLastName: string`
        - `submitterEmail: string`
        - `submitterPhone?: string`
        - `prayerRequestText: string`
    - **Logic:**
        - Construct email subject and body.
        - Use Resend API to send the email.
        - Implement error handling and logging for email sending.
    - **Email Content:**
        - **Subject:** "New Prayer Request from {{submitterFirstName}} {{submitterLastName}} for {{churchName}}" (or similar)
        - **Body:**
            - From: {{submitterFirstName}} {{submitterLastName}}
            - Email: {{submitterEmail}}
            - Phone: {{submitterPhone}} (display if provided)
            - Prayer Request:
              {{prayerRequestText}}
    - **Localization:** The notification email itself will likely be in a fixed language (e.g., English or the church's primary language) as it's for internal church staff, not the end-user.

## 5. Error Handling

- **Email Sending:**
    - Log errors if `sendPrayerRequestEmail` fails.
    - The failure to send a prayer request notification should NOT block or fail the main `submitFlow` process for the user. It's an auxiliary notification.

## 6. Testing Considerations

- Test with "Enable Prayer Requests" ON and a valid notification email configured.
- Test with "Enable Prayer Requests" ON but no notification email configured (no email should be sent).
- Test with "Enable Prayer Requests" OFF (no prayer request field on form, no email sent).
- Verify email content and recipient.
- Test with prayer request text being empty (even if checkbox is checked, though form validation should prevent this).

## 7. Future Enhancements (Optional)

- Allow multiple recipient emails.
- In-app notification center for prayer requests.
- Option for submitter to request anonymity (would require significant changes).

---

Next Steps in Planning:
1. Identify the exact file path for the Flow settings UI component.
2. Detail the Prisma schema modification (if any, beyond just using the JSON field).
3. Draft the `sendPrayerRequestEmail` function signature and core logic.