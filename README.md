# AltarFlow - Church Management Platform

<div align="center">
  <p>
    <strong>🚀 Production Status: Live | Churches Active: 3 | Security: ✅ Hardened</strong>
  </p>
  <p>
    A sophisticated, bilingual church management platform tailored for Hispanic churches in the United States. It modernizes traditional church administration by integrating digital tools with conventional methods, enabling efficient donation tracking, expense management, and member relationship nurturing—ideal for users with varied technological proficiency.
  </p>
</div>

## 🎯 Latest Updates (v1.1 - December 2024)

### 🔥 Critical Production Fixes (December 19, 2024)
- **Gemini OCR Upgrade** - Migrated receipt scanning from Document AI to Gemini 2.5 Flash with structured JSON output
- **Clerk Webhooks** - Resolved duplicate user creation with upsert operations
- **Resend Webhooks** - Fixed signature verification using Svix
- **PostHog Analytics** - Configured CORS for production domain

### 🆕 Financial Reconciliation System
- **Stripe Connect Payout Reconciliation** - Automatic sync and tracking of all payouts
- **Comprehensive Fee Tracking** - Stripe fees, processing fees, and platform fees
- **Financial Dashboard** - Banking section with reconciliation capabilities
- **Export Functionality** - CSV and PDF export for accounting purposes

### 🔒 Security & Stability Enhancements
- **Database Connection Pool** - Singleton pattern preventing connection leaks
- **Memory Leak Prevention** - Rate limiting with automatic cleanup
- **Row Level Security (RLS)** - Database-level multi-tenant isolation
- **Atomic Transactions** - All financial operations are atomic
- **Webhook Idempotency** - Duplicate webhook handling for all providers

## 🚀 Features

- **Member Management**: Complete member database with profile management and CSV import
- **Donation Tracking**: Stripe Connect integration with multi-fund allocation and recurring donations
- **Financial Reconciliation**: Automatic payout sync with fee tracking and net calculations
- **Email Campaigns**: Visual editor (Topol.io) with scheduling, analytics, and unsubscribe management
- **Expense Management**: Receipt scanning (OCR), categorization, and financial reporting
- **Reporting & Analytics**: AI-powered insights, financial summaries, and export capabilities
- **Multi-tenant Architecture**: Secure data isolation with RLS policies
- **Bilingual Support**: Full English/Spanish internationalization
- **Mobile Responsive**: Progressive web app that works on all devices
- **Subscription Management**: SaaS model with free tier and paid plans

## 🛠️ Tech Stack

### Core Framework
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)
- **ORM:** [Prisma 6](https://www.prisma.io/) (Latest version)

### UI & Styling
- **Component Library:** [shadcn/ui](https://ui.shadcn.com/) (50+ components)
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/)
- **Primitives:** [Radix UI](https://www.radix-ui.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

### Services & Integrations
- **Authentication:** [Clerk](https://clerk.com/) (Multi-tenant with organizations)
- **Payments:** [Stripe Connect](https://stripe.com/connect) (Platform model)
- **Email:** [Resend](https://resend.com/) + [Topol.io](https://topol.io/) (Visual editor)
- **SMS:** [Twilio](https://www.twilio.com/) (OTP verification)
- **AI:** [OpenAI GPT-4](https://openai.com/) (Report summaries)
- **OCR:** [Google Gemini Flash](https://ai.google.dev/) (Receipt scanning)
- **Analytics:** [PostHog](https://posthog.com/) + [Sentry](https://sentry.io/)

### Infrastructure
- **Hosting:** [Vercel](https://vercel.com/) (Edge functions)
- **CDN:** Vercel Edge Network
- **Monitoring:** Sentry (Error tracking)
- **Internationalization:** [i18next](https://www.i18next.com/) (EN/ES)

## 📋 Prerequisites

- Node.js 20+ and npm
- [Supabase](https://supabase.com/) account
- [Clerk](https://clerk.com/) account
- [Stripe](https://stripe.com/) account
- [Resend](https://resend.com/) account
- [OpenAI](https://platform.openai.com/) API key
- [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini OCR)
- [Twilio](https://www.twilio.com/) account (optional)

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/altarflow.git
cd altarflow
npm install
```

### 2. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Create Prisma environment file:
```bash
mkdir -p prisma && touch prisma/.env
```

### 3. Configure Environment Variables

#### `.env` (Root Directory)
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/welcome

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Service
RESEND_API_KEY=re_...

# AI Features
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=ai-...

# Payments
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMS (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### `prisma/.env`
```env
# Use connection pooling for app (Production: use connection_limit=30)
DATABASE_URL="postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=30&pool_timeout=30"

# Direct connection for migrations (DO NOT use for application)
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

### 4. Database Setup

Apply database migrations:
```bash
# Apply Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Apply RLS policies (if using Supabase)
# Run migrations in supabase/migrations/ folder

# (Optional) Seed with test data
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
altarflow/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard
│   ├── (public)/          # Public pages
│   ├── api/               # API routes
│   │   ├── webhooks/      # Stripe & Resend webhooks
│   │   ├── reconcile/     # Financial reconciliation
│   │   └── reports/       # Reporting endpoints
│   └── fonts/             # Custom fonts
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── modals/            # Modal components
│   ├── payouts/           # Reconciliation components
│   ├── reports/           # Reporting components
│   └── layout/            # Layout components
├── lib/                   # Utilities & config
│   ├── email/             # Email services
│   ├── validation/        # Input validation schemas
│   ├── actions/           # Server actions
│   ├── stripe-connect.ts # Stripe integration
│   └── db.ts              # Database singleton
├── prisma/                # Database schema
│   ├── schema.prisma      # Prisma schema (includes PayoutSummary)
│   └── migrations/        # Migration files
├── supabase/              # Supabase specific
│   └── migrations/        # RLS policies
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── versions/          # Release documentation
│   ├── future/            # Future plans
│   └── *.md               # Various guides
├── scripts/               # Utility scripts
└── locales/               # i18n translations
```

## 🔧 Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run ESLint
npx tsc --noEmit              # Type checking

# Database
npx prisma migrate dev --name <name>  # Create migration (dev)
npx prisma migrate deploy            # Apply migrations (prod)
npx prisma generate                  # Generate Prisma client
npx prisma studio                    # Open database GUI
npx prisma db seed                   # Seed test data

# Testing & Debugging
npm run debug:subscription     # Debug subscription status

# Verification Commands (Production)
grep -r "new PrismaClient()" . | grep -v node_modules | wc -l  # Should return 0
grep -r "from '@/lib/db'" . | wc -l                            # Should show 40+
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] RLS policies deployed (run Supabase migrations)
- [ ] Environment variables configured (see `.env.example`)
- [ ] Connection pool set to 30 for production
- [ ] Webhook endpoints configured in Stripe/Resend dashboards
- [ ] Build passes without errors (`npm run build`)

### Database Connection Configuration

```env
# Development (Free tier)
DATABASE_URL="...?connection_limit=10&pool_timeout=30"

# Production (Supabase Pro)
DATABASE_URL="...?connection_limit=30&pool_timeout=30"

# High-traffic production
DATABASE_URL="...?connection_limit=50&pool_timeout=30"
```

### Required Environment Variables

Ensure all critical environment variables are set:
- `DATABASE_URL` - PostgreSQL connection (use pooler endpoint)
- `DIRECT_URL` - Direct connection (migrations only)
- `CLERK_SECRET_KEY` - Authentication
- `RESEND_API_KEY` - Email sending
- `OPENAI_API_KEY` - AI features
- `GEMINI_API_KEY` - Receipt OCR (Gemini Flash)
- `STRIPE_SECRET_KEY` - Payments
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `RESEND_WEBHOOK_SECRET` - Email webhook verification

### Performance Optimization

1. **Database indexes enabled** - Performance indexes for Stripe operations
2. **Connection pool monitoring** - Watch for >80% usage
3. **Memory leak prevention** - Rate limiting with automatic cleanup
4. **RLS policies active** - Database-level security
5. **Atomic transactions** - All financial operations are atomic

## 📊 Production Metrics & Scaling

### Current Production Status
- **Active Churches:** 3 (live in production)
- **Total Members:** 150+
- **Donations Processed:** $25,000+ monthly
- **Email Campaigns:** 20+ per month
- **System Uptime:** 99.9%

### Scaling Capabilities
With proper configuration (Supabase Pro), AltarFlow can support:
- **1,000+ churches** (with RLS policies)
- **100,000+ members** across all churches
- **1,000-5,000 concurrent users** (with connection_limit=30)
- **200-500 API requests/second**
- **100+ simultaneous email campaigns**
- **Unlimited financial transactions** (with proper indexing)

See `/docs/versions/v1/DEPLOYMENT_CHECKLIST_V1.md` for detailed deployment information.

## 🔒 Security Features

### Core Security
- **Multi-tenant data isolation** - RLS policies at database level
- **XSS protection** - DOMPurify for all user content
- **Webhook signature verification** - Stripe and Resend webhooks
- **Database connection management** - Singleton pattern prevents leaks
- **Rate limiting** - Memory-safe with automatic cleanup
- **API security** - Foreign key validation on all endpoints

### Recent Security Improvements (December 2024)
- ✅ Fixed database connection pool exhaustion
- ✅ Webhook idempotency for all providers (Stripe, Clerk, Resend)
- ✅ Gemini OCR monitoring with graceful fallbacks
- ✅ Svix signature verification for webhooks
- ✅ Atomic transactions for all financial operations
- ✅ Enhanced CORS configuration for analytics

## 📈 Monitoring & Maintenance

### Key Metrics to Monitor
- Database connection pool usage (target: <80%)
- API response times (target: <200ms p95)
- Webhook delivery success rate (target: >99%)
- Memory usage (watch for leaks)
- Error rates (track with Sentry)

### Regular Maintenance
- Review slow query logs weekly
- Check for failed webhook deliveries
- Monitor email bounce rates
- Update dependencies monthly
- Review security advisories

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[License information to be added]

## 🆘 Support

For support, please:
1. Check the `/docs` folder for comprehensive guides
2. Review `/docs/versions/v1/` for release documentation
3. Check GitHub Issues for common problems
4. Contact support at support@altarflow.com

## 🙏 Acknowledgments

- Built with Next.js, Prisma, and Supabase
- UI components from shadcn/ui
- Payment processing by Stripe
- Email delivery by Resend

---

**Built with ❤️ for churches worldwide**

*Production Status: Live | Version: 1.1.0 | Last Updated: December 19, 2024*
