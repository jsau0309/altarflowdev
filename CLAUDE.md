# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AltarFlow is a bilingual church management platform for Hispanic churches in the United States. It modernizes church administration through donation tracking, expense management, member relationships, and email communication.

## Key Technologies
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL via Prisma ORM, hosted on Supabase
- **Authentication**: Clerk (multi-tenant with organizations)
- **Email**: Resend API with Topol.io editor, campaign management
- **Payments**: Stripe Connect for donations
- **AI**: OpenAI API for report summaries and email suggestions
- **Internationalization**: i18next for English/Spanish support
- **SMS**: Twilio for OTP verification

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Database commands
npx prisma migrate dev    # Apply migrations in development
npx prisma migrate deploy  # Apply migrations in production
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes (development only)
npx prisma db seed         # Seed database with test data

# Debugging
npm run debug:subscription # Debug subscription status
```

## High-Level Architecture

### Multi-Tenant Architecture
- Each church is an organization in Clerk (`clerkOrgId`)
- All queries filter by `churchId` for data isolation
- Members belong to churches, not individual user accounts
- Role-based access: ADMIN (church owner), STAFF, MEMBER

### Database Connection Strategy
- Uses Prisma with PgBouncer for connection pooling
- Development: `connection_limit=10`
- Production: `connection_limit=30` (Supabase Pro)
- Singleton pattern in `/lib/db.ts` prevents connection leaks

### Email Campaign System
- Campaigns created with Topol.io visual editor
- Batch sending via Resend API (100 emails/second limit)
- Unsubscribe management with tokens
- Monthly quota system (resets via cron job)
- Email validation and bounce handling

### API Route Patterns
- All routes use Next.js 15 Promise-based params
- Authentication via Clerk middleware
- Rate limiting on sensitive endpoints
- Consistent error handling with try-catch
- Response format: `{ success, data/error }`

### Critical Environment Variables
```bash
# Required for production
DATABASE_URL           # PostgreSQL connection string
DIRECT_URL             # Direct connection for migrations
CLERK_SECRET_KEY       # Clerk authentication
RESEND_API_KEY         # Email sending
OPENAI_API_KEY         # AI features
STRIPE_SECRET_KEY      # Payment processing
TWILIO_*               # SMS verification
```

## Performance Considerations
- Database indexes needed at scale (see `/docs/todo/DATABASE_INDEXING_PLAN.md`)
- In-memory rate limiting (Redis recommended for production)
- Timezone handling: Store UTC, display local
- Connection pool monitoring for P2024 errors

## Security Measures
- XSS protection via DOMPurify for user content
- Webhook signature verification (Stripe, Resend)
- Environment variable validation on startup
- No bypass flags in production
- Email content escaping

## Common Gotchas
- Prisma import is from `@/lib/db`, not `@/lib/prisma`
- Date timezone issues: Use noon local time for date-only fields
- Email campaign status must be DRAFT or SCHEDULED to send
- Stripe webhooks require signature verification
- Twilio client must be initialized inside request handlers