# 🚀 Altarflow Deployment Checklist

This document outlines all requirements, credentials, and configurations needed for production deployment.

**Last Security Audit**: 2025-08-08
**Production Readiness**: 85% (After critical fixes)

## 📋 Table of Contents
- [Environment Variables](#environment-variables)
- [Third-Party Services](#third-party-services)
- [Database Setup](#database-setup)
- [Domain & Hosting](#domain--hosting)
- [Security Considerations](#security-considerations)
- [Pre-Launch Checklist](#pre-launch-checklist)
- [Critical Security Fixes Applied](#critical-security-fixes-applied)

---

## 🔐 Environment Variables

### Core Application
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com  # CRITICAL: Set to your actual domain for QR codes and public URLs

# Database (Supabase)
# IMPORTANT: Use connection pooling URL with proper pool settings
# For Supabase Pro: Use pooler endpoint (port 6543) with PgBouncer
DATABASE_URL=postgresql://[user]:[password]@[host].pooler.supabase.com:6543/[database]?pgbouncer=true&connection_limit=30&pool_timeout=30
DIRECT_URL=postgresql://[user]:[password]@[host].supabase.com:5432/[database]

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# IMPORTANT: Update these URLs to your production domain
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/welcome

# For development with ngrok:
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://testaltarflow.ngrok.app/signin
# NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://testaltarflow.ngrok.app/signup
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=https://testaltarflow.ngrok.app/dashboard
# NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=https://testaltarflow.ngrok.app/onboarding/step-1
```

### Payment Processing (Stripe)
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Stripe Webhooks (CRITICAL: Use production endpoint secrets)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard > Webhooks

# Stripe Payment Links (for SaaS Subscriptions)
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/xxxxx  # $99/month plan
NEXT_PUBLIC_STRIPE_ANNUAL_LINK=https://buy.stripe.com/xxxxx   # $830/year plan (30% discount)
```

### Email Service (Resend)
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL='Altarflow <no-reply@your-domain.com>'
YOUR_VERIFIED_RESEND_DOMAIN=your-domain.com
RESEND_WEBHOOK_SECRET=whsec_xxxxx  # Get from Resend Dashboard > Webhooks
```

### AI Features (OpenAI)
```env
OPENAI_API_KEY=sk-xxxxx
```

### SMS Services (Twilio)
```env
# Twilio Configuration (for SMS verification)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxx
```

### External Services
```env
# Mindee API (Receipt Scanning)
MINDEE_API_KEY=xxxxx

# Anthropic Claude (Optional - for email preview text generation)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Topol Email Editor
NEXT_PUBLIC_TOPOL_API_KEY=xxxxx

# Sentry (Error Tracking) - Optional but recommended
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Cron Job Authentication (Optional but recommended)
CRON_SECRET=xxxxx  # Random string for authenticating cron job requests
```

---

## 🛠️ Third-Party Services

### 1. **Supabase (Database)**
- [ ] Production database instance created (Pro plan recommended)
- [ ] Connection pooling enabled via PgBouncer (port 6543)
- [ ] DATABASE_URL configured with proper connection pool settings:
  - [ ] Using pooler endpoint: `aws-0-[region].pooler.supabase.com:6543`
  - [ ] Connection limit set: `connection_limit=30` (adjust based on plan)
  - [ ] Pool timeout configured: `pool_timeout=30`
  - [ ] PgBouncer enabled: `pgbouncer=true`
- [ ] Backup schedule configured
- [ ] Row Level Security (RLS) policies verified
- [ ] Database indexes optimized
- [ ] Connection pool monitoring enabled in Supabase dashboard

### 2. **Clerk (Authentication)**
- [ ] Production instance created
- [ ] Multi-tenant architecture configured (Organizations enabled)
- [ ] OAuth providers configured (Google, Apple, etc.)
- [ ] Redirect URLs configured:
  - [ ] Sign-in redirect: `/dashboard`
  - [ ] Sign-up redirect: `/onboarding/step-1`
  - [ ] Or use environment variables (recommended)
- [ ] Webhook endpoint added: `https://your-domain.com/api/clerk-webhook`
- [ ] Webhook events selected:
  - [ ] `organization.created`
  - [ ] `organization.updated` 
  - [ ] `organization.deleted`
  - [ ] `user.created`
  - [ ] `user.updated`
  - [ ] `organizationMembership.created`
  - [ ] `organizationMembership.deleted`
- [ ] Custom domain configured (optional)
- [ ] Email templates customized
- [ ] Organization features enabled in dashboard
- [ ] Session token configuration:
  - [ ] Enable "Use short-lived session tokens" for better security
  - [ ] Set appropriate session lifetime (recommended: 1-7 days)

### 3. **Stripe (Payments)**

#### Platform Billing (SaaS Subscriptions)
- [ ] Payment Links created:
  - [ ] Monthly plan: $99/month
  - [ ] Annual plan: $830/year (30% discount)
  - [ ] Redirect URL set to: `https://your-domain.com/payment-success`
  - [ ] Collect customer details enabled
  - [ ] **IMPORTANT**: Remove any metadata fields (use client_reference_id only)
  - [ ] Test both payment links with `?client_reference_id=test_org_id`
- [ ] Customer Portal configured:
  - [ ] Portal URL set to: `https://your-domain.com/settings?tab=account`
  - [ ] Subscription management enabled
  - [ ] Invoice history enabled
  - [ ] Payment method updates allowed
  - [ ] Plan switching enabled (between monthly/annual)
  - [ ] Cancellation reason collection enabled
  - [ ] Proration behavior set to "Always invoice immediately"

#### Church Payment Processing (Stripe Connect)
- [ ] Production account activated
- [ ] Connect account settings configured:
  - [ ] OAuth settings configured for Connect
  - [ ] Platform branding customized
  - [ ] Onboarding settings reviewed
- [ ] Webhook endpoints added:
  - [ ] `https://your-domain.com/api/webhooks/stripe` (Main webhook)
  - [ ] Selected events: 
    - [ ] `checkout.session.completed` (for subscriptions)
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `account.updated` (for Connect accounts)
    - [ ] `payment_intent.succeeded` (for donations)
    - [ ] `payment_intent.failed`
  - [ ] Webhook secrets copied to environment variables
  - [ ] Webhook signature verification tested
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
- [ ] Email unsubscribe functionality:
  - [ ] Unsubscribe page accessible without authentication
  - [ ] Unique tokens generated for each member
  - [ ] Test unsubscribe/resubscribe flow
- [ ] Webhook configuration:
  - [ ] Webhook endpoint added: `https://your-domain.com/api/webhooks/resend`
  - [ ] Webhook events selected:
    - [ ] `email.sent` - Updates recipient status to SENT
    - [ ] `email.delivered` - Updates recipient status to DELIVERED
    - [ ] `email.bounced` - Handles bounce tracking and auto-unsubscribe
    - [ ] `email.complained` - Auto-unsubscribes spam complainers
    - [ ] `email.opened` (optional) - For open tracking
    - [ ] `email.clicked` (optional) - For click tracking
  - [ ] Webhook signing secret copied to `RESEND_WEBHOOK_SECRET` env var
  - [ ] Test webhook delivery in Resend dashboard
  - [ ] Verify EmailRecipient status updates are working

### 5. **OpenAI (AI Features)**
- [ ] API key with sufficient credits
- [ ] Usage limits configured
- [ ] Rate limiting implemented

### 6. **Mindee (Receipt OCR)**
- [ ] API key obtained
- [ ] Usage limits understood

### 7. **Twilio (SMS Verification)**
- [ ] Account created and verified
- [ ] Phone number purchased
- [ ] Verify service created
- [ ] Test SMS delivery
- [ ] International SMS enabled (if needed)

### 8. **Topol.io (Email Editor)**
- [ ] API key obtained
- [ ] Production key configured in environment
- [ ] Test email design and preview functionality
- [ ] Verify template saving works correctly

---

## 🗄️ Database Setup

### Database Connection Pool Configuration

#### Supabase Plan Limits & Recommendations:
- **Free Plan**: 60 connections total, 10 direct connections
  - Recommended: `connection_limit=10`
- **Pro Plan**: 200 connections total, 50 direct connections  
  - Recommended: `connection_limit=30` (leaves room for migrations, admin access)
- **Team Plan**: 500 connections total
  - Recommended: `connection_limit=50`
- **Enterprise**: Custom limits
  - Consult with Supabase support

#### Scaling Capacity (Supabase Pro):
With proper configuration, your app can handle:
- **Concurrent Users**: 1,000-5,000 active users
- **Requests/Second**: 200-500 API requests
- **Daily Active Churches**: 500-1,000 churches
- **Total Members**: 50,000-100,000 members across all churches
- **Email Campaigns**: 100+ concurrent campaigns

#### Performance Optimization:
```bash
# Update your DATABASE_URL before deployment:
# Development (current):
DATABASE_URL="...?connection_limit=10&pool_timeout=30"

# Production (Supabase Pro):
DATABASE_URL="...?connection_limit=30&pool_timeout=30&statement_cache_size=200"

# High-traffic production:
DATABASE_URL="...?connection_limit=50&pool_timeout=30&statement_cache_size=500"
```

### Migration Steps
```bash
# 1. Set production DATABASE_URL with connection pool settings
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=30"

# 2. Run migrations (use DIRECT_URL for migrations)
export DIRECT_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
npx prisma migrate deploy

# 3. Verify schema
npx prisma db pull --print

# 4. Test connection pool
node -e "console.log('Testing connection pool...'); require('@prisma/client').PrismaClient().$connect().then(() => console.log('✅ Connected!'))"
```

### Required Tables & Indexes (Already in Schema)
- Church table with subscription fields
- StripeConnectAccount for church payment processing
- DonationTransaction with comprehensive tracking
- Member management with SMS consent
- Flow system for custom forms
- Indexes optimized for:
  - Church lookup by slug and clerkOrgId
  - Donation queries by date, status, and church
  - Member queries by church and status
  - Flow lookups by slug
  - Transaction lookups by payment intent ID

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
- [ ] **Email Unsubscribe Links**: Will use the format: `https://your-domain.com/unsubscribe?token=xxxxx`
- [ ] **Development vs Production**: 
  - Development: Can use ngrok URLs temporarily (e.g., `https://testaltarflow.ngrok.app`)
  - Production: MUST use your actual domain for QR codes and unsubscribe links to work permanently
- [ ] **Important**: Once QR codes are printed or emails are sent, the domain cannot change without breaking links

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

### Subscription & Billing Testing
- [ ] Church subscription flow:
  - [ ] New organization starts with 'free' status
  - [ ] Free users see upgrade prompts and locked features
  - [ ] Payment links work correctly with client_reference_id
  - [ ] Webhook processes subscription creation
  - [ ] Subscription status updates to 'active'
  - [ ] Customer portal access works for active/canceled users
  - [ ] Plan switching tested (monthly ↔ annual)
  - [ ] Subscription cancellation flow:
    - [ ] Cancel via customer portal
    - [ ] Status updates to 'canceled' with end date
    - [ ] "Reactivate" button appears
    - [ ] Can reactivate before period ends
    - [ ] Transitions to 'free' after period ends
  - [ ] Grace period (2 days) activates after expiration
- [ ] Billing page shows correct status and messaging
- [ ] Feature gating based on subscription status:
  - [ ] Free/Grace Period: Cannot access Donations, Expenses, Reports, Banking
  - [ ] Active/Canceled: Full access until period ends
- [ ] Payment routing logic:
  - [ ] Free users → Payment link
  - [ ] All others → Customer portal

### Church Payment Processing Testing  
- [ ] Donation flow tested end-to-end:
  - [ ] Public donation form works
  - [ ] Stripe Connect onboarding completes
  - [ ] Donation with real card (small amount)
  - [ ] Webhook processing verified
  - [ ] Receipt email delivery confirmed
  - [ ] Transaction appears in dashboard
- [ ] Landing pages:
  - [ ] NFC landing page loads correctly
  - [ ] QR codes scan properly
  - [ ] Donate/Connect buttons work
- [ ] Test/Demo setup:
  - [ ] Demo church account created
  - [ ] Demo Connect account for presentations

### Content & Legal
- [ ] Terms of Service page created
- [ ] Privacy Policy page created
- [ ] Cookie policy implemented
- [ ] GDPR compliance (if applicable)

### Performance
- [ ] Image optimization enabled
- [ ] Database queries optimized
- [ ] Connection pool properly configured:
  - [ ] Monitor connection usage in Supabase dashboard
  - [ ] Set up alerts for > 80% connection usage
  - [ ] Review slow query logs weekly
- [ ] Caching strategy implemented
- [ ] CDN configured for assets
- [ ] Database performance monitoring:
  - [ ] Enable pg_stat_statements in Supabase
  - [ ] Monitor query performance
  - [ ] Set up slow query alerts (> 1 second)

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

### Feature Testing
- [ ] Church registration & onboarding
- [ ] Member management:
  - [ ] Add/edit members
  - [ ] Import from CSV
  - [ ] SMS consent tracking
  - [ ] Email subscription preferences
- [ ] Donation processing:
  - [ ] Manual entry
  - [ ] Public form submission
  - [ ] Recurring donations
- [ ] Financial features:
  - [ ] Expense tracking
  - [ ] Receipt scanning (OCR)
  - [ ] Reports generation
  - [ ] AI report summaries
- [ ] Communication:
  - [ ] Email notifications
  - [ ] SMS verification
  - [ ] Multi-language support (English/Spanish)
  - [ ] Email campaigns:
    - [ ] Campaign creation with Topol editor
    - [ ] Recipient selection and filtering
    - [ ] Email sending with quota tracking
    - [ ] Unsubscribe link in all emails
    - [ ] Campaign metrics tracking
- [ ] Settings:
  - [ ] General settings
  - [ ] Landing page manager
  - [ ] Account/billing management
- [ ] Mobile responsiveness
- [ ] Flow builder for custom forms

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

### Production Notes

#### Stripe Configuration
- **Webhook Secrets**: Production webhook secrets are different from CLI/test secrets
- **Demo Accounts**: Use test routing number 110000000 and account 000000000000 for demos
- **Test Cards**: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)
- **Connect Testing**: Test SSN 000-00-0000, Test EIN 00-0000000
- **Monitoring**: Check Stripe Dashboard > Developers > Webhooks for delivery status
- **Payment Links**: Must include `?client_reference_id={organizationId}` for proper tracking

#### Critical Configuration
- **NEXT_PUBLIC_APP_URL**: MUST be set to production domain before printing QR codes
- **Subscription Model**: One subscription per church organization
- **Free-by-Default**: New churches start on free plan with limited features
- **Customer Portal**: Manages all subscription changes for existing customers
- **Webhook Processing**: Handles subscription lifecycle (active → canceled → free)
- **Grace Period**: 2 days after subscription expires before limiting features
- **Payment Routing**:
  - Free status → Stripe Payment Links (new subscriptions)
  - All other statuses → Stripe Customer Portal (modifications)

#### Feature Flags & Limits
- **SMS Verification**: Optional, controlled by phone number presence
- **File Uploads**: Limited to 10MB for receipts
- **AI Summaries**: Rate limited to prevent abuse
- **Public Forms**: Protected by honeypot spam prevention
- **Email Campaigns**: 
  - Free churches: 4 campaigns per month
  - Paid churches: Unlimited campaigns
  - Automatic unsubscribe handling
  - Email preference tracking per member

#### Subscription States & Access Control
- **Free**: New churches, no access to premium features
- **Active**: Full access to all features
- **Canceled**: Full access until subscription period ends
- **Grace Period**: 2 days after expiration, limited access with urgent renewal prompts
- **Past Due**: Payment failed but retry pending, full access maintained

#### Important Webhook Configuration
- The webhook MUST handle `customer.subscription.updated` events
- Stripe keeps subscriptions as 'active' when canceled but sets `cancel_at_period_end = true`
- Our webhook interprets this as 'canceled' status in the database
- Ensure webhook endpoint has proper error handling and logging

#### Authentication & Data Isolation
- **Multi-tenant Architecture**: Each church is an "Organization" in Clerk
- **Data Isolation**: All queries filter by `orgId` from Clerk session
- **User Access**: Users can belong to multiple organizations (churches)
- **Session Management**: 
  - Clerk provides `userId` and `orgId` in every authenticated request
  - API routes use `const { userId, orgId } = await auth()` to get context
  - Database queries filter by `clerkOrgId` to ensure data isolation
- **Organization Switching**: Users can switch between churches they belong to
- **Redirect URLs**: 
  - Development: Use full ngrok URLs in environment variables
  - Production: Use relative paths or full production URLs

#### Email Communication System
- **Email Editor**: Topol.io integration for drag-and-drop email design
- **Campaign Management**: 
  - Multi-step campaign creation flow
  - Draft auto-saving
  - Recipient filtering by membership status
  - Automatic exclusion of unsubscribed members
- **Quota System**:
  - Campaign-based (not recipient-based) counting
  - Monthly reset on the 1st
  - Free tier: 4 campaigns/month
  - Paid tier: Unlimited campaigns
- **Unsubscribe System**:
  - Unique token per member (stored in EmailPreference table)
  - Public unsubscribe page (no auth required)
  - One-click unsubscribe with resubscribe option
  - Automatic filtering in future campaigns
- **Email Footer**: 
  - Church name and address
  - Unsubscribe link with member token
  - CAN-SPAM compliant
- **Email Delivery Tracking (Resend Webhooks)**:
  - Development: Use ngrok URL (e.g., `https://testaltarflow.ngrok.app/api/webhooks/resend`)
  - Production: Use actual domain (e.g., `https://altarflow.com/api/webhooks/resend`)
  - Tracks delivery status: PENDING → SENT → DELIVERED
  - Handles bounces with automatic email validation
  - Auto-unsubscribes on spam complaints
  - Updates EmailRecipient and EmailPreference tables
  - Webhook signature verification for security
- **Scheduled Campaign Sending**:
  - Cron job endpoint: `/api/cron/send-scheduled-campaigns`
  - Recommended frequency: Every 5 minutes
  - Processes all campaigns where scheduledFor <= now
  - **Option 1: Supabase Cron (Recommended)**:
    - Run migration: `20250730000001_add_scheduled_campaign_cron.sql`
    - Set database session settings in Supabase Dashboard:
      ```
      app.settings.app_url = 'https://your-domain.com'
      app.settings.cron_secret = 'your-cron-secret'
      ```
    - View jobs: `SELECT * FROM cron.job;`
    - Disable if needed: `SELECT cron.unschedule('send-scheduled-campaigns');`
  - **Option 2: Supabase Edge Functions**:
    - Deploy function: `supabase functions deploy send-scheduled-campaigns`
    - Set secrets:
      ```bash
      supabase secrets set APP_URL=https://your-domain.com
      supabase secrets set CRON_SECRET=your-cron-secret
      ```
    - Schedule with Supabase Dashboard or external service
  - **Option 3: Vercel Cron (Recommended for Vercel deployments)**:
    - Create `vercel.json` in project root:
      ```json
      {
        "crons": [{
          "path": "/api/cron/send-scheduled-campaigns",
          "schedule": "*/5 * * * *"
        }]
      }
      ```
    - **Before deployment**:
      - [ ] Ensure `vercel.json` is in your repository
      - [ ] Set `CRON_SECRET` env var in Vercel dashboard
    - **After deployment**:
      - [ ] Verify in Vercel Dashboard > Functions > Cron Jobs
      - [ ] Check execution logs in Functions tab
      - [ ] No additional configuration needed - Vercel automatically sets up the cron
    - **Important**: Vercel automatically adds authentication header to cron requests
  - **Option 4: External cron service** with Bearer token auth
  - Always set CRON_SECRET env var for authentication

---

## 🔒 Critical Security Fixes Applied

### Database Connection Management (2025-08-08)
**Status**: ✅ FIXED

#### Issue Found & Fixed:
- **Problem**: Multiple files creating new PrismaClient instances causing connection pool exhaustion
- **Solution**: All 28 files now use singleton pattern from `@/lib/db`
- **Impact**: Prevents "Too many connections" errors in production

#### Verification:
```bash
# Check for any remaining bad imports (should return 0)
grep -r "new PrismaClient()" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l

# Verify singleton usage (should show all files using @/lib/db)
grep -r "from '@/lib/db'" --include="*.ts" --include="*.tsx" . | wc -l
```

### Database Connection Pool Settings
**Your Current Configuration** (Good for development/small production):
```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=30"
```

**Recommended for Production** (Supabase Pro):
```env
# For 100-500 concurrent users
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=30&pool_timeout=30"

# For 500-1000 concurrent users (with monitoring)
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=50&pool_timeout=30"
```

**Critical Notes**:
- NEVER use port 5432 for DATABASE_URL (direct connection)
- ALWAYS use port 6543 (pooler endpoint) for application
- ONLY use DIRECT_URL (port 5432) for migrations

### Webhook Security Enhancements (2025-08-08)
**Status**: ✅ FIXED

#### Improvements:
1. **Database Transactions**: All webhook operations wrapped in atomic transactions
2. **Null Safety**: Added comprehensive null checks for Stripe objects
3. **Email Handling**: Fixed async/await to ensure proper error handling
4. **Memory Management**: Rate limiter has size limits to prevent memory leaks

### Row Level Security (RLS) Policies (2025-08-08)
**Status**: ✅ DEPLOYED

#### Implementation:
- Comprehensive RLS policies deployed to Supabase
- Multi-tenant data isolation at database level
- Churches can only access their own data
- Additional security layer beyond API validation

### Memory Leak Prevention (2025-08-08)
**Status**: ✅ FIXED

#### Rate Limiting Configuration:
```typescript
// Configured limits in /lib/rate-limit.ts
MAX_RATE_LIMIT_ENTRIES = 10,000  // Prevents unbounded growth
MAX_WEBHOOK_ENTRIES = 50,000     // Deduplication cache limit
CLEANUP_INTERVAL = 60,000        // Cleanup every minute
```

### API Security Hardening (2025-08-08)
**Status**: ✅ FIXED

#### Improvements:
1. **Foreign Key Validation**: All API routes validate that related records belong to the same church
2. **Authorization Checks**: Removed dangerous global operations
3. **Input Validation**: Comprehensive Zod schemas on all endpoints
4. **Error Sanitization**: No sensitive data exposed in error messages

---

## ⚠️ Pre-Production Requirements

### Database Monitoring Setup
- [ ] Monitor connection pool usage in Supabase dashboard
- [ ] Set alert for > 80% connection usage
- [ ] Review slow query logs weekly
- [ ] Enable pg_stat_statements for query analysis

### Production Environment Variables
```env
# CRITICAL: Update connection limit for production
DATABASE_URL="...?connection_limit=30&pool_timeout=30"  # Update from 10 to 30

# Ensure webhook secrets are production values
STRIPE_WEBHOOK_SECRET="whsec_..."  # Production webhook secret
RESEND_WEBHOOK_SECRET="whsec_..."  # Production webhook secret
```

### Security Verification Checklist
- [ ] Run `grep -r "new PrismaClient()" . | grep -v node_modules` (should return empty)
- [ ] Verify all Prisma imports use `@/lib/db`
- [ ] Test webhook signature verification
- [ ] Verify RLS policies with different church accounts
- [ ] Load test with expected concurrent users
- [ ] Monitor memory usage under load

---

Last Updated: 2025-08-08 (Security Audit Completed)