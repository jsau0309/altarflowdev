# 🚀 Altarflow Deployment Checklist

This document outlines all requirements, credentials, and configurations needed for production deployment.

## 📋 Table of Contents
- [Environment Variables](#environment-variables)
- [Third-Party Services](#third-party-services)
- [Database Setup](#database-setup)
- [Domain & Hosting](#domain--hosting)
- [Security Considerations](#security-considerations)
- [Pre-Launch Checklist](#pre-launch-checklist)

---

## 🔐 Environment Variables

### Core Application
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com  # CRITICAL: Set to your actual domain for QR codes and public URLs

# Database (Supabase)
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
DIRECT_URL=postgresql://[user]:[password]@[host]:[port]/[database]?schema=public

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Payment Processing (Stripe)
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Stripe Webhooks (CRITICAL: Use production endpoint secrets)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard > Webhooks
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Products (for Subscriptions)
STRIPE_PRO_PRICE_ID=price_xxxxx

# Test Mode Configuration (Optional)
ENABLE_TEST_MODE=false  # Set to true only during initial testing
TEST_EMAIL_DOMAIN=@altarflow.test
```

### Email Service (Resend)
```env
RESEND_API_KEY=re_xxxxx
YOUR_VERIFIED_RESEND_DOMAIN=your-domain.com
```

### AI Features (OpenAI)
```env
OPENAI_API_KEY=sk-xxxxx
```

### External Services
```env
# Mindee API (Receipt Scanning)
MINDEE_API_KEY=xxxxx

# Sentry (Error Tracking) - Optional
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

---

## 🛠️ Third-Party Services

### 1. **Supabase (Database)**
- [ ] Production database instance created
- [ ] Connection pooling enabled
- [ ] Backup schedule configured
- [ ] Row Level Security (RLS) policies verified
- [ ] Database indexes optimized

### 2. **Clerk (Authentication)**
- [ ] Production instance created
- [ ] OAuth providers configured (Google, Apple, etc.)
- [ ] Webhook endpoint added: `https://your-domain.com/api/clerk-webhook`
- [ ] Custom domain configured (optional)
- [ ] Email templates customized

### 3. **Stripe (Payments)**
- [ ] Production account activated
- [ ] Connect account settings configured:
  - [ ] OAuth settings configured for Connect
  - [ ] Platform branding customized
  - [ ] Onboarding settings reviewed
- [ ] Webhook endpoints added:
  - [ ] `https://your-domain.com/api/webhooks/stripe` (Main webhook)
  - [ ] `https://your-domain.com/api/webhooks/stripe-connect` (Connect webhook)
  - [ ] Selected events: `payment_intent.succeeded`, `payment_intent.failed`, `payment_intent.processing`
  - [ ] Webhook secrets copied to environment variables
  - [ ] Webhook signature verification tested
- [ ] Products and pricing created for subscriptions
- [ ] Payment methods enabled (Card, ACH, etc.)
- [ ] Test mode setup:
  - [ ] Demo Connect account created for testing
  - [ ] Test bank account details documented
  - [ ] Test cards documented for demos

### 4. **Resend (Email)**
- [ ] Domain verified in Resend
- [ ] SPF, DKIM, and DMARC records configured
- [ ] Email templates tested
- [ ] From addresses configured

### 5. **OpenAI (AI Features)**
- [ ] API key with sufficient credits
- [ ] Usage limits configured
- [ ] Rate limiting implemented

### 6. **Mindee (Receipt OCR)**
- [ ] API key obtained
- [ ] Usage limits understood

---

## 🗄️ Database Setup

### Migration Steps
```bash
# 1. Set production DATABASE_URL
export DATABASE_URL="your-production-url"

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify schema
npx prisma db pull --print
```

### Required Indexes (Already in Schema)
- Church lookup by slug
- Donation queries by date and status
- Member queries by church and status
- Flow lookups by slug

---

## 🌐 Domain & Hosting

### Hosting Options
1. **Vercel (Recommended)**
   - [ ] Project imported from GitHub
   - [ ] Environment variables configured
   - [ ] Custom domain added
   - [ ] SSL certificate auto-configured

2. **Alternative: AWS/GCP/Azure**
   - [ ] Node.js 18+ environment
   - [ ] SSL certificate configured
   - [ ] CDN setup for static assets

### DNS Configuration
```
# Main Application
A     @              [Your Host IP]
CNAME www            [Your Host Domain]

# Email (Resend)
TXT   _dmarc         v=DMARC1; p=none;
TXT   @              v=spf1 include:resend.com ~all
CNAME resend._domainkey    [Resend CNAME Value]
```

### Public URLs Configuration
- [ ] **Landing Pages**: The NFC landing pages will use the format: `https://your-domain.com/[church-slug]/nfc-landing`
- [ ] **QR Codes**: Generated QR codes will automatically use the `NEXT_PUBLIC_APP_URL` environment variable
- [ ] **Development vs Production**: 
  - Development: Can use ngrok URLs temporarily (e.g., `https://testaltarflow.ngrok.app`)
  - Production: MUST use your actual domain for QR codes to work permanently
- [ ] **Important**: Once QR codes are printed, the domain cannot change without reprinting

---

## 🔒 Security Considerations

### Environment Security
- [ ] All sensitive keys in environment variables
- [ ] `.env` files never committed to git
- [ ] Production keys different from development

### Application Security
- [ ] CORS configuration for production domain
- [ ] Rate limiting on public endpoints (Note: Basic in-memory rate limiting implemented, upgrade to Redis for production)
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS protection headers configured
- [ ] Honeypot spam protection (implemented on public forms)

### API Security
- [ ] All API routes check authentication
- [ ] Webhook signatures verified
- [ ] File upload limits configured

---

## ✅ Pre-Launch Checklist

### Technical
- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] Build succeeds without errors
- [ ] All API integrations tested
- [ ] Email sending verified
- [ ] Payment flow tested end-to-end:
  - [ ] Donation flow with real card (small amount)
  - [ ] Webhook processing verified
  - [ ] Receipt email delivery confirmed
  - [ ] Transaction status updates working
  - [ ] Connect account onboarding tested
- [ ] Test/Demo setup:
  - [ ] Demo church account created
  - [ ] Test email accounts configured (@altarflow.test)
  - [ ] Demo Connect account for presentations

### Content & Legal
- [ ] Terms of Service page created
- [ ] Privacy Policy page created
- [ ] Cookie policy implemented
- [ ] GDPR compliance (if applicable)

### Performance
- [ ] Image optimization enabled
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] CDN configured for assets

### Monitoring
- [ ] Error tracking (Sentry) configured:
  - [ ] SENTRY_DSN environment variable set
  - [ ] Source maps uploaded
  - [ ] Error alerts configured
  - [ ] Webhook errors tracked
- [ ] Application monitoring setup
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Stripe-specific monitoring:
  - [ ] Webhook delivery success rate
  - [ ] Payment success rate dashboard
  - [ ] Failed payment alerts

### Testing
- [ ] Church registration flow
- [ ] Member form submission
- [ ] Donation processing
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Mobile responsiveness

---

## 📱 Post-Launch

### Immediate Tasks
- [ ] Monitor error logs
- [ ] Check email delivery rates
- [ ] Verify webhook deliveries
- [ ] Monitor database performance

### First Week
- [ ] Analyze user behavior
- [ ] Address any reported issues
- [ ] Optimize slow queries
- [ ] Review security logs

---

## 🆘 Emergency Contacts

Document key contacts for production issues:
- Database Admin: [Contact]
- DevOps Lead: [Contact]
- Payment Issues: [Stripe Support]
- Auth Issues: [Clerk Support]

---

## 📝 Notes

- Keep this document updated as requirements change
- Store actual credentials in a secure password manager
- Maintain separate staging environment for testing
- Document any custom deployment procedures

### Stripe Production Notes
- **Webhook Secrets**: Production webhook secrets are different from CLI/test secrets
- **Demo Accounts**: Use test routing number 110000000 and account 000000000000 for demos
- **Test Cards**: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)
- **Connect Testing**: Test SSN 000-00-0000, Test EIN 00-0000000
- **Monitoring**: Check Stripe Dashboard > Developers > Webhooks for delivery status

Last Updated: 2025-01-18