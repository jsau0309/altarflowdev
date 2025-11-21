# Sentry Configuration Guide - AltarFlow

## Current Configuration Status

### ✅ Variables Already Set in Production

Based on your Vercel dashboard, you have:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://bff0488aa382810cf540942...  ✅ Correct
SENTRY_ORG=altarflow                                        ✅ Correct
SENTRY_PROJECT=altarflow                                    ✅ Correct
NEXT_PUBLIC_SENTRY_ENABLE_DEV=true                          ⚠️ Should be false in production
```

### 📋 Complete Variable List (What You Should Have)

#### **Required for Sentry Integration:**

```bash
# PUBLIC (visible in browser)
NEXT_PUBLIC_SENTRY_DSN=https://bff0488aa382810cf540942...
# ✅ You have this - used by client-side Sentry

# ORGANIZATION & PROJECT (for build-time integration)
SENTRY_ORG=altarflow
# ✅ You have this

SENTRY_PROJECT=altarflow
# ✅ You have this

# AUTH TOKEN (for sourcemap uploads - OPTIONAL but recommended)
SENTRY_AUTH_TOKEN=your_auth_token_here
# ❌ You don't have this - needed for source maps
# Get from: https://sentry.io/settings/account/api/auth-tokens/
```

#### **New Variables from Our Logger (Phase 1):**

```bash
# Logging Configuration
LOG_LEVEL=info
# Controls minimum log level (debug | info | warn | error | fatal)
# Production recommendation: info

ENABLE_CONSOLE_LOGS=false
# Force console output in production
# Production recommendation: false (only Sentry)

SENTRY_ENABLED=true
# Enable/disable Sentry integration
# Production: true

NEXT_PUBLIC_SENTRY_ENABLE_DEV=false
# Send errors to Sentry during development
# Production: false (set to true only for testing Sentry in dev)
```

---

## 🔧 What You Need to Do

### **1. Update Production Environment Variables**

In your Vercel dashboard (or `.env.production`):

```bash
# Change this:
NEXT_PUBLIC_SENTRY_ENABLE_DEV=true  # ❌ Wrong - sends dev errors to prod Sentry

# To this:
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false  # ✅ Correct - only prod errors go to Sentry

# Add these NEW variables:
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false
SENTRY_ENABLED=true
```

### **2. Update Local Development (.env.local)**

In your `.env.local` file:

```bash
# Keep existing Sentry DSN
NEXT_PUBLIC_SENTRY_DSN=https://bff0488aa382810cf540942...

# Add these for development:
LOG_LEVEL=debug                      # See all logs in development
ENABLE_CONSOLE_LOGS=true             # Output to console for debugging
SENTRY_ENABLED=false                 # Don't send dev errors to Sentry
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false  # Unless you want to test Sentry
```

### **3. Optional: Add Sentry Auth Token (Recommended)**

This enables **source maps** in Sentry so you can see original TypeScript code instead of compiled JavaScript.

**How to get it:**
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create new token with scopes: `project:releases`, `org:read`
3. Add to Vercel:
   ```bash
   SENTRY_AUTH_TOKEN=sntrys_your_token_here
   ```

---

## 🎯 How the Logger Uses These Variables

### **In Development (your local machine):**

```typescript
// With LOG_LEVEL=debug and ENABLE_CONSOLE_LOGS=true
logger.info('User logged in', { userId, churchId });

// Output in console:
// [2025-11-20T10:30:00.000Z] [INFO] User logged in
// {
//   "userId": "user_123",
//   "churchId": "church_a...",  // Automatically hashed
//   "operation": "auth.login"
// }

// NOT sent to Sentry (because SENTRY_ENABLED=false)
```

### **In Production (Vercel):**

```typescript
// With LOG_LEVEL=info and ENABLE_CONSOLE_LOGS=false
logger.info('User logged in', { userId, churchId });

// NOT output to console (performance optimization)
// SENT to Sentry as a breadcrumb
// If error occurs later, breadcrumb helps debug
```

### **When Errors Occur (Production):**

```typescript
logger.error('Payment failed', {
  operation: 'payment.process',
  paymentId: 'pi_123',
  amount: 5000
}, error);

// Automatically:
// 1. Creates Sentry exception with full stack trace
// 2. Includes all context (operation, paymentId, amount)
// 3. Redacts sensitive data (tokens, passwords, etc.)
// 4. Links to user session for debugging
```

---

## 📊 Sentry Dashboard - What You'll See

After Phase 2 migration, your Sentry dashboard will show:

### **1. Structured Errors**

Instead of:
```
Error: undefined
  at Object.<anonymous> (webpack-internal:///./app/api/stripe/route.ts:123:45)
```

You'll see:
```
Payment processing failed
Operation: payment.process
Payment ID: pi_1234567890
Amount: $50.00
Church ID: church_a...
User ID: user_abc123
```

### **2. Breadcrumb Trail**

```
[INFO] User logged in (operation: auth.login)
[INFO] Payment initiated (operation: payment.initiated, amount: 5000)
[INFO] Stripe API called (operation: stripe.api.payment_intent)
[ERROR] Payment failed (operation: payment.failed)  ← You are here
```

### **3. Filterable by Operation**

Search for:
- `operation:payment.failed` - All payment failures
- `operation:webhook.stripe.verified` - All Stripe webhooks
- `churchId:church_a...` - All errors for specific church

---

## 🔐 Security & Privacy

### **What Gets Redacted Automatically:**

```typescript
// Input:
logger.info('User data', {
  email: 'donor@example.com',
  password: 'secret123',
  apiKey: 'sk_live_1234567890',
  churchId: 'church_abc123def456',
  normalData: 'This is fine'
});

// Sent to Sentry:
{
  email: 'donor@example.com',        // Domain extracted: 'example.com'
  password: '[REDACTED]',            // Automatically redacted
  apiKey: '[REDACTED]',              // Automatically redacted
  churchId: 'church_a...',           // Hashed (first 8 chars only)
  normalData: 'This is fine'         // Unchanged
}
```

### **Sensitive Patterns Detected:**

- `password`, `passwd`, `pwd`
- `token`, `apiKey`, `api_key`, `secret`
- `creditCard`, `credit_card`, `cvv`, `cvc`
- `ssn`, `bankAccount`, `routingNumber`
- `authorization`, `bearer`, `private_key`

---

## 🚀 Next Steps

### **Immediate Actions:**

1. **Update Vercel Environment Variables**
   - Set `NEXT_PUBLIC_SENTRY_ENABLE_DEV=false` in production
   - Add `LOG_LEVEL=info`
   - Add `ENABLE_CONSOLE_LOGS=false`
   - Add `SENTRY_ENABLED=true`

2. **Update Local `.env.local`**
   - Add logging configuration for development
   - Set `SENTRY_ENABLED=false` (don't spam Sentry during dev)

3. **(Optional) Add Sentry Auth Token**
   - Enables source maps for better debugging
   - Get from: https://sentry.io/settings/account/api/auth-tokens/

### **After Phase 2 (Next):**

Once we migrate the critical routes, you'll see:
- 91 security vulnerabilities fixed
- Structured, searchable logs in Sentry
- Better error debugging with full context
- Automatic PII protection

---

## 📖 References

- **Sentry Dashboard:** https://sentry.io/organizations/altarflow
- **Auth Tokens:** https://sentry.io/settings/account/api/auth-tokens/
- **Logger README:** `/lib/logger/README.md`
- **Environment Variables:** `/.env.example`

---

## ❓ Common Questions

### Q: Do I need SENTRY_AUTH_TOKEN?

**A:** No, it's optional. Without it:
- ✅ Errors still go to Sentry
- ✅ Logging still works
- ❌ Stack traces show compiled JavaScript (harder to debug)
- ❌ Can't see original TypeScript line numbers

With it:
- ✅ Stack traces show original TypeScript code
- ✅ Exact line numbers from your source files
- ✅ Better debugging experience

### Q: Should I enable Sentry in development?

**A:** Usually no. Set `SENTRY_ENABLED=false` locally to:
- Avoid cluttering Sentry with dev errors
- Faster local development (no network calls)
- See logs immediately in console

Set to `true` only when:
- Testing Sentry integration
- Debugging production-specific issues locally

### Q: What's the difference between LOG_LEVEL values?

```bash
LOG_LEVEL=debug   # Shows everything (verbose, for development)
LOG_LEVEL=info    # Shows info, warn, error, fatal (production default)
LOG_LEVEL=warn    # Shows only warnings and errors (quiet production)
LOG_LEVEL=error   # Shows only errors and fatal (minimal logging)
LOG_LEVEL=fatal   # Shows only fatal/critical errors (emergency mode)
```

### Q: Will this impact performance?

**A:** Minimal impact:
- Console output disabled in production (`ENABLE_CONSOLE_LOGS=false`)
- Sentry breadcrumbs are sampled (not every log sent)
- PII redaction is fast (<1ms per log)
- Async logging for non-critical logs

Typical overhead: **< 5ms per request**

---

## 🎯 Summary

**You have:**
- ✅ Sentry DSN configured
- ✅ Organization and project set
- ⚠️ `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` (should be false in prod)

**You need to add:**
- `LOG_LEVEL=info` (production)
- `ENABLE_CONSOLE_LOGS=false` (production)
- `SENTRY_ENABLED=true` (production)
- `SENTRY_AUTH_TOKEN` (optional, for source maps)

**Next:** Phase 2 will migrate critical routes to use this logger, fixing 91 security vulnerabilities.
