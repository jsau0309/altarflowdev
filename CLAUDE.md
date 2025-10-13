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
- **AI**: OpenAI API for report summaries and email suggestions; Google Gemini Flash for receipt OCR
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

# Database commands - IMPORTANT: Always use migrations!
npx prisma migrate dev --name descriptive_name  # Create & apply migration
npx prisma migrate deploy                       # Apply migrations in production
npx prisma generate                             # Generate Prisma client
npx prisma migrate status                       # Check migration status
npx prisma migrate resolve --applied NAME       # Mark migration as applied
# WARNING: Avoid using these unless absolutely necessary:
# npx prisma db push - Only for prototyping, doesn't create migration files!

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
GEMINI_API_KEY         # Receipt OCR (Gemini Flash)
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

## Database Migration Best Practices
**ALWAYS use migrations to track schema changes:**
1. Modify the Prisma schema file (`prisma/schema.prisma`)
2. Create a migration: `npx prisma migrate dev --name descriptive_name`
3. This creates a migration file in `/prisma/migrations/` and applies it
4. Commit both the schema changes AND the migration file to git

**If you encounter drift errors:**
1. Check status: `npx prisma migrate status`
2. If changes were made without migrations, create a baseline migration
3. Mark it as applied: `npx prisma migrate resolve --applied "migration_name"`

**NEVER use `npx prisma db push` in production code** - it doesn't create migration files and loses change history!

## Common Gotchas
- Prisma import is from `@/lib/db`, not `@/lib/prisma`
- Date timezone issues: Use noon local time for date-only fields
- Email campaign status must be DRAFT or SCHEDULED to send
- Stripe webhooks require signature verification
- Twilio client must be initialized inside request handlers
- Always create Prisma migrations - never use `db push` except for quick prototypes
