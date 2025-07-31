# Email Subdomain Setup Guide

This guide walks through setting up a subdomain for email sending to improve deliverability.

## Why Use a Subdomain?

Using a subdomain for transactional emails (like `mail.altarflow.com`) helps:
- Separate transactional email reputation from marketing emails
- Improve deliverability by avoiding spam filters
- Better organize email analytics and tracking
- Protect your main domain's reputation

## Setup Steps

### 1. Choose Your Subdomain
Recommended options:
- `mail.altarflow.com`
- `send.altarflow.com`
- `notifications.altarflow.com`

### 2. Configure DNS Records in Resend

1. Go to your Resend dashboard
2. Navigate to "Domains" section
3. Click "Add Domain"
4. Enter your subdomain (e.g., `mail.altarflow.com`)
5. Resend will provide you with DNS records to add

### 3. Add DNS Records to Your Domain Provider

Add the following records to your DNS provider (exact values will be provided by Resend):

#### SPF Record
- Type: TXT
- Name: `mail` (or your chosen subdomain)
- Value: `v=spf1 include:amazonses.com ~all`

#### DKIM Records
Resend will provide 3 CNAME records for DKIM authentication:
- `resend._domainkey.mail`
- `resend2._domainkey.mail`
- `resend3._domainkey.mail`

#### DMARC Record (Optional but Recommended)
- Type: TXT
- Name: `_dmarc.mail`
- Value: `v=DMARC1; p=none; rua=mailto:dmarc@altarflow.com`

### 4. Verify Domain in Resend

1. After adding DNS records, click "Verify Domain" in Resend
2. Wait for DNS propagation (usually 5-30 minutes)
3. Once verified, you'll see a green checkmark

### 5. Update Environment Variables

Update your `.env` file:

```env
# Old configuration
RESEND_FROM_EMAIL=hello@altarflow.com

# New configuration with subdomain
RESEND_FROM_EMAIL=AltarFlow <hello@mail.altarflow.com>
```

### 6. Update Email Service Configuration

The email service is already configured to use the `RESEND_FROM_EMAIL` environment variable, so no code changes are needed.

## Best Practices

1. **Warm Up Your Domain**: Start by sending a small volume of emails and gradually increase
2. **Monitor Bounce Rates**: Keep bounce rates below 5%
3. **Handle Unsubscribes**: Always include unsubscribe links (already implemented)
4. **Use Consistent FROM Names**: Keep your sender name consistent (e.g., "AltarFlow")
5. **Avoid Spam Triggers**: Don't use excessive capitalization or spam-like content

## Testing

After setup:
1. Send a test email from the Communication feature
2. Check email headers to verify it's coming from your subdomain
3. Use mail-tester.com to check your email score
4. Monitor delivery rates in Resend dashboard

## Troubleshooting

### DNS Not Verifying
- Wait up to 48 hours for DNS propagation
- Double-check record values match exactly
- Ensure no extra spaces in DNS values

### Emails Going to Spam
- Verify all DNS records are correct
- Check email content for spam triggers
- Ensure you're not on any blacklists
- Consider implementing DMARC policy

### Low Open Rates
- Verify SPF and DKIM are passing
- Use engaging subject lines
- Send at optimal times for your audience
- Clean your email list regularly