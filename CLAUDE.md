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

## 🚨 PRODUCTION SAFETY: Prisma Schema Changes

**⚠️ CRITICAL: We have REAL USERS and REAL DATA in production!**

Any Prisma schema change can cause:
- Production deployment failures
- Data loss or corruption
- Service downtime
- TypeScript build errors

### 🔥 #1 RECURRING ISSUE: Schema Drift

**Problem**: Every feature branch, schema drift keeps appearing. This happens when database changes are applied WITHOUT creating proper migrations.

**The ONE Rule to Prevent Drift:**

```bash
# For ANY schema change, ONLY use this command:
npx prisma migrate dev --name descriptive_name

# ❌ NEVER use these (they cause drift):
# npx prisma db push
# npx prisma generate (by itself after schema change)
```

**Quick Fix When Drift Happens:**

```bash
# Reset development database (safe for dev, NEVER for production)
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset
```

**📖 READ FIRST:** `/docs/PREVENT_SCHEMA_DRIFT.md` - Simple guide to prevent recurring drift

### Required Reading Before ANY Schema Change

**📖 Comprehensive Guides:**
- `/docs/PREVENT_SCHEMA_DRIFT.md` - **START HERE** - Simple anti-drift workflow
- `/docs/PRISMA_SCHEMA_DRIFT_ANALYSIS.md` - Deep dive into why drift happens
- `/docs/PRISMA_PRODUCTION_WORKFLOW.md` - Full production deployment guide

### Quick Safety Rules

**❌ NEVER DO:**
1. **NEVER use `npx prisma db push`** - Causes schema drift!
2. **NEVER run `npx prisma generate` alone after schema change** - Creates drift!
3. **NEVER modify database directly via SQL** - Bypasses migrations!
4. **NEVER remove `@default()` from id fields** - Causes TypeScript errors
5. **NEVER deploy schema changes on Fridays** - Weekend incidents are bad
6. **NEVER skip migration SQL review** - Destructive changes are permanent

**✅ ALWAYS DO:**
1. **ALWAYS use `npx prisma migrate dev --name NAME`** for schema changes
2. **ALWAYS review generated SQL** before committing
3. **ALWAYS commit schema + migrations together**
4. **ALWAYS add `@default()` to new id fields**:
   ```prisma
   id String @id @default(uuid()) @db.Uuid  // For UUID
   id String @id @default(cuid())           // For CUID
   ```
5. **ALWAYS use `@updatedAt` for update timestamps**:
   ```prisma
   updatedAt DateTime @updatedAt
   ```
6. **ALWAYS use PascalCase for relation names**:
   ```prisma
   model DonationTransaction {
     Church Church @relation(...)           // ✅ PascalCase
     DonationType DonationType @relation(...)
   }
   ```
7. **ALWAYS run TypeScript build** before pushing:
   ```bash
   npx tsc --noEmit && npm run build
   ```
8. **ALWAYS use direct URL if pooler times out**:
   ```bash
   DATABASE_URL="$DIRECT_URL" npx prisma migrate dev
   ```

### The Correct Workflow (Anti-Drift)

**Step-by-step to NEVER get drift:**

1. **Edit schema**: Modify `prisma/schema.prisma`
   ```prisma
   model User {
     newField String?  // Add your change
   }
   ```

2. **Create migration**: ONE command does everything
   ```bash
   npx prisma migrate dev --name add_new_field
   # This creates migration + applies to DB + regenerates client
   ```

3. **Review SQL**: Check auto-generated migration
   ```bash
   cat prisma/migrations/TIMESTAMP_add_new_field/migration.sql
   ```

4. **Test**: Build and run locally
   ```bash
   npx tsc --noEmit
   npm run build
   npm run dev
   ```

5. **Commit**: Schema + migration together
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: Add new field"
   ```

6. **Deploy**: Push to GitHub, Vercel handles production
   ```bash
   git push
   # Vercel runs: npx prisma migrate deploy
   # Production DB updated automatically
   ```

**Why This Works:**
- Schema, migrations, and database all stay in sync
- No drift possible
- Production gets same changes as dev
- All tracked in Git

### Two-Database System

We have TWO separate databases:
- **Development** (`qdoyonfjxwqefvsfjchx.supabase.co`) - Safe to reset, modify, experiment
- **Production** (`uhoovjoeitxecfcbzndj.supabase.co`) - NEVER touch directly

**Source of Truth:** `prisma/schema.prisma` (not the database!)

### Drift Detection & Fix

**Check for drift:**
```bash
npx prisma migrate status

# ✅ Healthy: "Database schema is up to date!"
# ⚠️ Drift: "Your database schema is not in sync..."
```

**Fix drift in development:**
```bash
# Option 1: Reset (recommended)
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset

# Option 2: Create baseline migration
npx prisma migrate dev --name baseline_drift_fix --create-only
# Edit SQL to be empty, then:
npx prisma migrate resolve --applied "baseline_drift_fix"
```

### Migration Naming Conventions

- `add_table_name` - Creating new tables
- `update_table_add_field` - Adding fields
- `remove_unused_table` - Dropping tables
- `fix_constraint_issue` - Fixing problems
- Always use snake_case and be descriptive

### Pre-Deployment Checklist

Before pushing ANY Prisma schema change:
- [ ] Read `/docs/PREVENT_SCHEMA_DRIFT.md`
- [ ] Used `npx prisma migrate dev --name NAME` (not db push!)
- [ ] Migration tested in local development
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Full build succeeds (`npm run build`)
- [ ] Migration SQL reviewed for safety
- [ ] No drift: `npx prisma migrate status` shows "up to date"
- [ ] Schema + migrations committed together

## Common Gotchas

### Prisma-Specific
- **Prisma import** is from `@/lib/db`, not `@/lib/prisma`
- **Relation names** must be PascalCase (e.g., `Church`, not `church`) - causes TypeScript errors if wrong
- **ID defaults** must always have `@default(uuid())` or `@default(cuid())` - missing causes TypeScript to require manual IDs
- **TypeScript types** regenerate when running `npx prisma generate` - always regenerate after schema changes
- **Migration drift** happens when using `db push` or modifying database manually - always use migrations
- **Schema conflicts** during merges often remove `@default()` - always review Prisma schema in PR diffs
- **UUID vs Text** - PostgreSQL UUID columns don't need `::text` cast when setting defaults (use `gen_random_uuid()` not `gen_random_uuid()::text`)

### Application-Specific
- Date timezone issues: Use noon local time for date-only fields
- Email campaign status must be DRAFT or SCHEDULED to send
- Stripe webhooks require signature verification
- Twilio client must be initialized inside request handlers
- Church creation relies on Clerk organization webhooks - test with real Clerk flow
- Multi-tenant queries MUST filter by `churchId` to prevent data leakage
