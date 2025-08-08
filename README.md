# AltarFlow - Church Management Platform

<div align="center">
  <p>
    <strong>🚀 Production Ready: 85% | Security Audit: ✅ Passed</strong>
  </p>
  <p>
    A sophisticated, bilingual church management platform tailored for Hispanic churches in the United States. It modernizes traditional church administration by integrating digital tools with conventional methods, enabling efficient donation tracking, expense management, and member relationship nurturing—ideal for users with varied technological proficiency.
  </p>
</div>

## 🎯 Latest Updates (v1.0 - August 2025)

### 🆕 Financial Reconciliation System
- **Stripe Connect Payout Reconciliation** - Automatic sync and tracking of all payouts
- **Comprehensive Fee Tracking** - Stripe fees, processing fees, and platform fees
- **Financial Dashboard** - New banking section with reconciliation capabilities
- **Export Functionality** - CSV and PDF export for accounting purposes

### 🔒 Security Enhancements (All Critical Issues Resolved)
- **Database Connection Pool Optimization** - Singleton pattern across 28+ files
- **Memory Leak Prevention** - Rate limiting with automatic cleanup
- **Row Level Security (RLS)** - Database-level multi-tenant isolation
- **Atomic Transactions** - All financial operations are atomic
- **Enhanced API Security** - Foreign key validation and church isolation

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

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Authentication:** [Clerk](https://clerk.com/) (Multi-tenant)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Payments:** [Stripe Connect](https://stripe.com/connect)
- **Email:** [Resend](https://resend.com/) + [Topol.io](https://topol.io/)
- **SMS:** [Twilio](https://www.twilio.com/)
- **AI:** [OpenAI](https://openai.com/)
- **Internationalization:** [i18next](https://www.i18next.com/)

## 📋 Prerequisites

- Node.js 20+ and npm
- [Supabase](https://supabase.com/) account
- [Clerk](https://clerk.com/) account
- [Stripe](https://stripe.com/) account
- [Resend](https://resend.com/) account
- [OpenAI](https://platform.openai.com/) API key
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
- `STRIPE_SECRET_KEY` - Payments
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `RESEND_WEBHOOK_SECRET` - Email webhook verification

### Performance Optimization

1. **Database indexes enabled** - Performance indexes for Stripe operations
2. **Connection pool monitoring** - Watch for >80% usage
3. **Memory leak prevention** - Rate limiting with automatic cleanup
4. **RLS policies active** - Database-level security
5. **Atomic transactions** - All financial operations are atomic

## 📊 Scaling Capabilities

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

### Recent Security Improvements (August 2025)
- ✅ Fixed database connection pool exhaustion (28 files)
- ✅ Added memory leak prevention (10K entry limit)
- ✅ Implemented atomic transactions for webhooks
- ✅ Deployed comprehensive RLS policies
- ✅ Added null safety checks throughout
- ✅ Enhanced email template security

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

*Production Ready: 85% | Last Security Audit: August 2025*