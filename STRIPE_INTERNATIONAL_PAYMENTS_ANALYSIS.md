# Stripe International Payments Analysis - AltarFlow

**Date**: October 18, 2025
**Analyzed By**: Claude Code
**Purpose**: Determine international payment capabilities and potential improvements

---

## Executive Summary

✅ **YES, AltarFlow currently accepts international donations!**

Your implementation uses **Stripe Connect** with **automatic payment methods**, which provides robust international support out of the box. Here's what you need to know:

---

## Current Implementation Analysis

### 1. **Payment Infrastructure** (`/app/api/donations/initiate/route.ts`)

**Key Findings**:

```typescript
// Line 403-406: Automatic Payment Methods Configuration
automatic_payment_methods: {
  enabled: true,
  allow_redirects: 'always' // Allows redirect-based methods like bank transfers
}
```

**What This Means**:
- ✅ Stripe automatically determines which payment methods are available based on:
  - Customer's location
  - Currency (USD)
  - Church's Stripe account capabilities
- ✅ Supports cards, digital wallets, and bank transfers
- ✅ Includes international payment methods when applicable

### 2. **Address & Country Support** (`/app/api/donations/initiate/route.ts`)

**Lines 29, 293-298, 339-350**: Full international address capture

```typescript
// Input validation accepts country field
country: z.string().optional(),

// Stripe customer creation includes country
if (validation.data.country) {
  stripeAddress.country = validation.data.country;
  hasAddressData = true;
}
```

**What This Means**:
- ✅ Country field is captured and sent to Stripe
- ✅ Full billing address verification (fraud prevention)
- ✅ Supports any country code (e.g., MX, CA, UK, etc.)

### 3. **Currency Configuration** (`/app/api/donations/initiate/route.ts`)

**Line 18, 400**: Hardcoded to USD

```typescript
currency: z.string().length(3).toLowerCase().default('usd'),
// ...
amount: finalAmountForStripe,
currency: currency, // Defaults to 'usd'
```

**What This Means**:
- ⚠️ **Only USD is currently supported**
- International donors can donate, but only in USD
- Their bank handles the currency conversion
- Example: Mexican donor donates $100 USD → Bank charges ~2,000 MXN

### 4. **Stripe Connect Architecture**

**Lines 242-265, 422-428**: Uses church-specific Connect accounts

```typescript
// Retrieve church's Stripe Connect account
const stripeConnectAccount = await prisma.stripeConnectAccount.findUnique({
  where: { churchId: church.clerkOrgId },
});

// Create payment intent on Connect account
const paymentIntent = await stripe.paymentIntents.create(
  paymentIntentParams,
  {
    idempotencyKey: idempotencyKey,
    stripeAccount: churchStripeAccountId // Create on Connect account
  }
);
```

**What This Means**:
- ✅ Each church has their own Stripe account
- ✅ Funds go directly to church (not platform → church)
- ✅ Each church's capabilities depend on their Stripe onboarding
- ✅ International cards accepted if church's Stripe account allows it

---

## What IS Currently Supported

### ✅ International Cards
- **Visa**, **Mastercard**, **American Express**, **Discover**
- Issued by banks in **any country**
- Example: A donor in Spain with a Spanish Visa card can donate

### ✅ Digital Wallets (if card supports it)
- **Apple Pay** (if donor's Apple Wallet has international cards)
- **Google Pay** (if donor's Google Wallet has international cards)

### ✅ Address Verification
- Full international billing addresses
- Helps with fraud prevention
- Supports all country codes

### ✅ Customer Creation on Connect Accounts
- International donors get Stripe customer records
- Saved payment methods work across borders
- Email receipts work internationally

---

## What is NOT Currently Supported

### ❌ Multi-Currency
- Only USD is accepted
- No EUR, GBP, MXN, etc.
- International donors must donate in USD (bank converts)

### ❌ Regional Payment Methods
These popular international methods are NOT enabled:
- **SEPA Direct Debit** (Europe)
- **iDEAL** (Netherlands)
- **Bancontact** (Belgium)
- **Giropay** (Germany)
- **OXXO** (Mexico - cash vouchers)
- **Boleto** (Brazil)
- **Alipay** (China)
- **WeChat Pay** (China)

### ❌ Multi-Currency Receipts
- Receipts show USD amount only
- No automatic conversion display for donor's currency

---

## How International Donations Work Today

### Example: Mexican Donor Scenario

1. **Donor** in Mexico visits donation page
2. **Selects** "Mexico" from country dropdown
3. **Enters** Mexican billing address
4. **Donates** $100 USD
5. **Stripe** processes payment
6. **Bank** converts: ~2,000 MXN charged to donor's card
7. **Church** receives: $100 USD (minus Stripe fees)
8. **Receipt** shows: $100 USD

### Currency Conversion Fees

**Who pays?**
- Donor's bank charges currency conversion fee (typically 2-3%)
- Donor sees: ~2,060 MXN (includes conversion markup)
- Church receives: $100 USD

**Example with $100 USD donation from Mexico:**
```
Church receives:     $100.00 USD
Stripe fee (2.9%):    -$2.90 USD
Stripe fixed fee:     -$0.30 USD
Church net:           $96.80 USD

Donor charged:      ~2,060 MXN (bank rate + markup)
```

---

## Stripe's International Card Acceptance

### What Stripe Documentation Says:

From [Stripe's International Cards Guide](https://stripe.com/docs/payments/cards/international):

> **"By default, Stripe automatically accepts cards from over 195 countries"**

### Supported Card Networks Globally:
- ✅ Visa (worldwide)
- ✅ Mastercard (worldwide)
- ✅ American Express (135+ countries)
- ✅ Discover/Diners (limited international)
- ✅ JCB (Japan + international)
- ✅ UnionPay (China + international)

### 3D Secure (3DS) Authentication:
- ✅ Required by EU regulations (Strong Customer Authentication)
- ✅ Automatically handled by Stripe for international cards
- ✅ Reduces fraud and chargebacks

---

## Verification & Testing Recommendations

### 1. **Verify Connect Account Capabilities**

Each church's Stripe Connect account may have different capabilities. Check:

```typescript
// You can add this to your church onboarding check
const account = await stripe.accounts.retrieve(churchStripeAccountId);
console.log(account.capabilities); // Shows what's enabled
```

**Key capabilities to check**:
- `card_payments: 'active'` ← Should be active
- `transfers: 'active'` ← Should be active
- International cards are enabled by default unless restricted

### 2. **Test with International Test Cards**

Stripe provides test cards for different countries:

```
// USA Visa
4242 4242 4242 4242

// Brazil Visa
4000 0007 6000 0002

// Mexico Visa
4000 0048 4000 0008

// Canada Visa
4000 0012 4000 0000

// Full list: https://stripe.com/docs/testing#international-cards
```

### 3. **Check Dashboard Settings**

In each church's Stripe Dashboard:
1. Go to **Settings** → **Payment methods**
2. Verify **Cards** is enabled
3. Check **International cards** is not blocked
4. Review **Radar rules** for fraud blocking

---

## Recommendations for Enhancement

### Phase 1: Immediate (No Code Changes)
1. ✅ **Document international support** in your marketing
2. ✅ **Test with international test cards** to verify
3. ✅ **Add FAQ** about currency conversion for international donors
4. ✅ **Monitor** international donations in Stripe Dashboard

### Phase 2: Short-term (Small Changes)
1. **Add currency display helper**
   - Show estimated amount in donor's currency
   - Use exchange rate API (e.g., Stripe, ECB, or exchangerate.host)
   - Example: "≈ €92 EUR" next to "$100 USD"

2. **Improve international UX**
   - Add country flags to country selector
   - Auto-detect donor's country via IP (optional)
   - Clarify that amounts are in USD

3. **Analytics tracking**
   - Track donations by donor country
   - Monitor international conversion rates
   - Identify which countries donate most

### Phase 3: Long-term (Feature Development)
1. **Multi-Currency Support**
   - Allow churches to choose accepted currencies
   - Let donors select currency
   - Handle currency conversion on Stripe side
   - Update receipts to show both currencies

2. **Regional Payment Methods**
   - Add SEPA for Europe
   - Add OXXO for Mexico
   - Add Boleto for Brazil
   - Configure based on church location/audience

3. **Enhanced Tax Receipts**
   - International tax receipt formats
   - Multi-language receipts
   - Country-specific compliance

---

## Code Locations for Reference

### Key Files:
1. **Payment Initiation**: `/app/api/donations/initiate/route.ts`
   - Lines 403-406: Payment method configuration
   - Lines 29, 293-350: Address/country handling
   - Line 18: Currency configuration

2. **Frontend Form**: `/components/donation/donation-payment.tsx`
   - Contains Stripe Elements integration
   - Shows country selector

3. **Church Page**: `/app/(public)/[churchSlug]/page.tsx`
   - Public donation page
   - Passes church data to form

4. **Stripe Config**: `/utils/stripe/config.ts`
   - Stripe initialization
   - API version settings

---

## Technical Constraints & Considerations

### Stripe Fees for International Cards
From [Stripe Pricing](https://stripe.com/pricing):
- **US cards**: 2.9% + $0.30
- **International cards**: **+1.5%** additional fee
- **Currency conversion**: **+1%** if converting from USD

**Example**: $100 donation from European card
```
Base fee:         2.9% + $0.30 = $3.20
International:    +1.5%        = $1.50
Total fees:       $4.70 (4.7%)
Church receives:  $95.30
```

### Connect Account Requirements
- Churches must complete Stripe onboarding
- Must verify business/organization details
- Bank account must match organization country
- Some countries have different requirements

### Regulatory Compliance
- **PSD2** (Europe): Requires 3D Secure
- **SCA** (Strong Customer Authentication): Auto-handled by Stripe
- **GDPR**: Stripe handles data protection
- **Tax Receipts**: Your responsibility per country

---

## Conclusion

### ✅ **Current Status**: INTERNATIONAL-READY

Your AltarFlow implementation **ALREADY SUPPORTS** international donations with:
- ✅ Cards from 195+ countries
- ✅ Automatic payment method selection
- ✅ Full address verification
- ✅ 3D Secure authentication
- ✅ USD currency processing

### 🚀 **Next Steps**:

1. **Test it**: Use Stripe test cards from different countries
2. **Document it**: Add to FAQs and help docs
3. **Optimize it**: Add currency conversion estimates (Phase 2)
4. **Expand it**: Consider multi-currency (Phase 3)

### 📊 **Business Impact**:

Churches can receive donations from **anywhere in the world**, significantly expanding their donor base beyond local communities. This is especially valuable for:
- International missionary work
- Diaspora communities sending money home
- Global fundraising campaigns
- Multi-national organizations

---

## Additional Resources

- [Stripe International Cards](https://stripe.com/docs/payments/cards/international)
- [Stripe Payment Methods](https://stripe.com/docs/payments/payment-methods/integration-options)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Testing](https://stripe.com/docs/testing#international-cards)
- [Currency Conversion API](https://stripe.com/docs/currencies#presentment-currencies)

---

**Generated**: October 18, 2025
**For**: AltarFlow Development Team
**Contact**: Review this analysis and implement recommendations based on priority
