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

### Required Reading Before ANY Schema Change
**📖 MUST READ:** `/docs/PRISMA_PRODUCTION_WORKFLOW.md`

This comprehensive guide covers:
- Safe development workflow
- Migration review checklist
- Production deployment procedures
- Emergency rollback procedures
- Team coordination guidelines

### Quick Safety Rules (Production Environment)

**❌ NEVER DO:**
1. **NEVER use `npx prisma db push`** - Only for local prototyping!
2. **NEVER remove `@default()` from id fields** - Causes TypeScript errors
3. **NEVER modify schema without creating migration** - Causes drift
4. **NEVER deploy schema changes on Fridays** - Weekend incidents are bad
5. **NEVER skip migration SQL review** - Destructive changes are permanent
6. **NEVER deploy without team notification** - Coordinate changes
7. **NEVER skip production backup** - Last safety net

**✅ ALWAYS DO:**
1. **ALWAYS backup production** before schema changes (Supabase dashboard)
2. **ALWAYS use `npx prisma migrate dev`** to create tracked migrations
3. **ALWAYS review generated SQL** before committing
4. **ALWAYS add `@default()` to new id fields**:
   ```prisma
   id String @id @default(uuid()) @db.Uuid  // For UUID
   id String @id @default(cuid())           // For CUID
   ```
5. **ALWAYS use `@updatedAt` for update timestamps**:
   ```prisma
   updatedAt DateTime @updatedAt
   ```
6. **ALWAYS use PascalCase for relation names** (matches model names):
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
8. **ALWAYS commit both schema AND migration files** together
9. **ALWAYS test migrations locally first**
10. **ALWAYS have a rollback plan** documented in PR

### Pre-Deployment Checklist (Required)

Before pushing ANY Prisma schema change to production:
- [ ] Read `/docs/PRISMA_PRODUCTION_WORKFLOW.md`
- [ ] Created production backup (Supabase → Database → Backups)
- [ ] Migration tested in local development
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Full build succeeds (`npm run build`)
- [ ] Migration SQL reviewed for safety
- [ ] Team notified about pending deployment
- [ ] Rollback procedure documented in PR
- [ ] Deployment scheduled during low-traffic period

### Database Migration Best Practices

**🗄️ CRITICAL: Two-Database System**

We have TWO separate databases:
- **Development DB** (`uhoovjoeitxecfcbzndj.supabase.co`) - Work here, safe to modify
- **Production DB** (`qdoyonfjxwqefvsfjchx.supabase.co`) - NEVER touch directly, only through deployment

**Source of Truth:** Prisma schema file (`prisma/schema.prisma`)

**Correct Workflow for Schema Changes:**

1. **Modify `prisma/schema.prisma`** - Add your field/model
   ```prisma
   model LandingPageConfig {
     ogBackgroundColor String? @default("#3B82F6")  // New field
   }
   ```

2. **Create migration folder manually**
   ```bash
   TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
   mkdir -p "prisma/migrations/${TIMESTAMP}_add_field_name"
   ```

3. **Write migration SQL manually**
   Create `prisma/migrations/[TIMESTAMP]_name/migration.sql`:
   ```sql
   ALTER TABLE "TableName" ADD COLUMN "fieldName" TEXT DEFAULT 'value';
   ```

4. **Sync development database**
   ```bash
   npx prisma migrate dev    # Applies migration to dev DB
   # OR
   npx prisma generate       # Just regenerate client
   ```

5. **Test locally**
   ```bash
   npx tsc --noEmit
   npm run build
   ```

6. **Commit schema + migration together**
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: Add field to table"
   ```

7. **Deploy** - Vercel runs `npx prisma migrate deploy` on production DB automatically

**❌ NEVER:**
- Run `npx prisma migrate dev` BEFORE creating migration folder (causes shadow DB issues)
- Modify production database directly
- Use `npx prisma db push` (doesn't create migration files)
- Mark migrations as applied without running the SQL

**If you encounter drift errors:**
1. Check status: `npx prisma migrate status`
2. If changes were made without migrations, create a baseline migration
3. Mark it as applied: `npx prisma migrate resolve --applied "migration_name"`
4. Document why drift occurred to prevent future issues

**Migration naming conventions:**
- `add_table_name` - Creating new tables
- `update_table_add_field` - Adding fields
- `remove_unused_table` - Dropping tables
- `fix_constraint_issue` - Fixing problems
- Always use descriptive names that explain the change

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
