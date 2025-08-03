# AltarFlow - Church Management Platform
  
  <p>
    A sophisticated, bilingual church management platform tailored for Hispanic churches in the United States. It modernizes traditional church administration by integrating digital tools with conventional methods, enabling efficient donation tracking, expense management, and member relationship nurturing—ideal for users with varied technological proficiency.
  </p>


## 🚀 Features

- **Member Management**: Complete member database with profile management
- **Donation Tracking**: Stripe-powered donation processing with fund allocation
- **Email Campaigns**: Visual email editor with campaign management and analytics
- **Expense Management**: Receipt scanning and expense categorization
- **Reporting & Analytics**: AI-powered insights with interactive charts
- **Multi-tenant Architecture**: Secure data isolation for multiple churches
- **Bilingual Support**: Full English/Spanish internationalization
- **Mobile Responsive**: Works seamlessly on all devices

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
# Use connection pooling for app
DATABASE_URL="postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=10"

# Direct connection for migrations
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

### 4. Database Setup

Apply database migrations:
```bash
# Apply Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

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
│   ├── api/               # API routes
│   └── fonts/             # Custom fonts
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── modals/            # Modal components
│   └── layout/            # Layout components
├── lib/                   # Utilities & config
│   ├── email/             # Email services
│   ├── stripe/            # Payment logic
│   └── db.ts              # Database client
├── prisma/                # Database schema
│   ├── schema.prisma      # Prisma schema
│   └── migrations/        # Migration files
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── scale/             # Scaling guides
│   ├── test-results/      # Test documentation
│   └── todo/              # Future improvements
└── locales/               # i18n translations
```

## 🔧 Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run ESLint

# Database
npx prisma migrate dev         # Create migration (dev)
npx prisma migrate deploy      # Apply migrations (prod)
npx prisma studio              # Open database GUI
npx prisma db seed             # Seed test data

# Testing & Debugging
npm run debug:subscription     # Debug subscription status
```

## 🚀 Production Deployment

### Database Connection Limits

For production with Supabase Pro:
```env
DATABASE_URL="...?connection_limit=30&pool_timeout=30"
```

### Required Environment Variables

Ensure all critical environment variables are set:
- `DATABASE_URL` - PostgreSQL connection
- `CLERK_SECRET_KEY` - Authentication
- `RESEND_API_KEY` - Email sending
- `OPENAI_API_KEY` - AI features
- `STRIPE_SECRET_KEY` - Payments

### Performance Optimization

1. **Enable database indexes** when you reach scale (see `/docs/todo/DATABASE_INDEXING_PLAN.md`)
2. **Configure Redis** for production rate limiting
3. **Set up CDN** for static assets
4. **Monitor connection pool** usage

## 📊 Scaling Capabilities

With proper configuration, AltarFlow can support:
- 500+ churches
- 50,000+ members
- 1,000+ concurrent users
- 100+ simultaneous email campaigns

See `/docs/scale/SUPABASE_PRO_SCALING_GUIDE.md` for detailed scaling information.

## 🔒 Security Features

- Multi-tenant data isolation
- XSS protection with DOMPurify
- Webhook signature verification
- Environment variable validation
- Rate limiting on sensitive endpoints
- Secure email unsubscribe tokens

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

## 📄 License

[License information to be added]

## 🆘 Support

For support, please:
1. Check the `/docs` folder for guides
2. Review common issues in GitHub Issues
3. Contact support at support@altarflow.com

---

Built with ❤️ for churches worldwide