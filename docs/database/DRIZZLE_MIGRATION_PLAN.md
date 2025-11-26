# AltarFlow: Drizzle Migration & Tech Debt Cleanup Plan

**Branch:** `feat/migrate-to-drizzle`
**Timeline:** 1-2 weeks
**Goal:** Migrate from Prisma to Drizzle ORM + Clean up tech debt + Prepare for monorepo

---

## 🎯 Why Drizzle?

### Problems with Prisma (Current State)
- ❌ Recurring schema drift issues (documented in CLAUDE.md)
- ❌ Complex code generation workflow
- ❌ Monorepo compatibility issues (proven today)
- ❌ Build-time generation required
- ❌ Separate `.prisma` language to maintain

### Benefits of Drizzle
- ✅ TypeScript-first (schema IS code)
- ✅ No code generation step
- ✅ No schema drift possible
- ✅ Monorepo-native
- ✅ Faster builds, smaller bundle
- ✅ **Proven at scale:** Midday.ai uses it (12.9k stars)

---

## 📋 Phase 1: Tech Debt Cleanup (Week 1, Days 1-2)

**Goal:** Clean codebase before migration

### 1.1 ESLint Errors
```bash
# Run and fix all ESLint errors
npm run lint

# Common fixes needed:
# - Unused imports
# - Unused variables
# - Console.log statements
# - Type assertions
```

**Files to focus on:**
- `lib/` - Core utilities
- `components/` - UI components
- `app/api/` - API routes

### 1.2 Remove Unused Features

**Features to remove/disable:**
- [ ] Old banking reconciliation (if deprecated)
- [ ] Unused API endpoints
- [ ] Deprecated components
- [ ] Old migration scripts in `scripts/`

**Files to check:**
```
app/api/admin/*  - Admin endpoints (which are still needed?)
scripts/*        - Old migration scripts
components/      - Deprecated components
```

### 1.3 Code Organization
- [ ] Move utility functions to proper locations
- [ ] Consolidate duplicate code
- [ ] Remove commented-out code
- [ ] Update outdated comments

### 1.4 Dependencies Cleanup
```bash
# Check for unused dependencies
npx depcheck

# Remove unused packages
npm uninstall <package>
```

---

## 📋 Phase 2: Drizzle Setup (Week 1, Days 3-4)

### 2.1 Install Drizzle

```bash
# Install Drizzle ORM + Kit
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# Remove Prisma (later, after migration complete)
# npm uninstall prisma @prisma/client
```

### 2.2 Create Drizzle Configuration

**Create `drizzle.config.ts`:**
```typescript
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  schema: './db/schema/*',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 2.3 Create Database Directory Structure

```
db/
├── schema/
│   ├── churches.ts       # Church model
│   ├── members.ts        # Member model
│   ├── donations.ts      # Donation models
│   ├── expenses.ts       # Expense models
│   ├── campaigns.ts      # Campaign models
│   └── index.ts          # Export all schemas
├── migrations/           # SQL migrations (auto-generated)
├── client.ts             # Database client singleton
└── index.ts              # Main export
```

---

## 📋 Phase 3: Schema Conversion (Week 1, Days 4-5)

### 3.1 Core Models (Priority 1)

Convert these first as they're most critical:

**1. Church**
```typescript
// db/schema/churches.ts
import { pgTable, uuid, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const churches = pgTable('Church', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: varchar('clerkOrgId', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  stripeConnectAccountId: varchar('stripeConnectAccountId', { length: 255 }).unique(),
  onboardingComplete: boolean('onboardingComplete').default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});
```

**2. Member**
**3. DonationTransaction**
**4. Donor**
**5. DonationType**

### 3.2 Supporting Models (Priority 2)

- EmailCampaign
- EmailRecipient
- EmailSettings
- Expense
- ExpenseCategory
- Event
- CustomCategory

### 3.3 Configuration Models (Priority 3)

- LandingPageConfig
- Button
- StripeConnectAccount
- Flow
- SubscriptionPlan

### 3.4 Relations Setup

```typescript
// db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { churches, members, donations } from './index';

export const churchesRelations = relations(churches, ({ many }) => ({
  members: many(members),
  donations: many(donations),
}));

export const membersRelations = relations(members, ({ one }) => ({
  church: one(churches, {
    fields: [members.churchId],
    references: [churches.id],
  }),
}));
```

---

## 📋 Phase 4: Database Client Setup (Week 2, Day 1)

### 4.1 Create Database Client

```typescript
// db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10, // Connection pool size
});

export const db = drizzle(pool, { schema });
```

### 4.2 Create Migration Baseline

```bash
# Generate initial migration from existing database
npx drizzle-kit introspect:pg

# This creates a migration reflecting current schema
# Review the generated SQL
cat db/migrations/0000_baseline.sql
```

---

## 📋 Phase 5: Query Migration (Week 2, Days 2-4)

### 5.1 Update Server Actions

**Before (Prisma):**
```typescript
// lib/actions/donations.actions.ts
import { prisma } from '@/lib/db';

export async function getDonations(churchId: string) {
  const donations = await prisma.donationTransaction.findMany({
    where: { churchId },
    include: { donor: true, donationType: true },
    orderBy: { createdAt: 'desc' },
  });
  return donations;
}
```

**After (Drizzle):**
```typescript
// lib/actions/donations.actions.ts
import { db } from '@/db';
import { donationTransactions, donors, donationTypes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function getDonations(churchId: string) {
  const donations = await db
    .select()
    .from(donationTransactions)
    .leftJoin(donors, eq(donationTransactions.donorId, donors.id))
    .leftJoin(donationTypes, eq(donationTransactions.donationTypeId, donationTypes.id))
    .where(eq(donationTransactions.churchId, churchId))
    .orderBy(desc(donationTransactions.createdAt));

  return donations;
}
```

### 5.2 Update API Routes

Convert all API routes in `app/api/`:
- `app/api/donations/` - Donation endpoints
- `app/api/members/` - Member endpoints
- `app/api/expenses/` - Expense endpoints
- `app/api/communication/` - Campaign endpoints
- `app/api/settings/` - Settings endpoints

### 5.3 Update Components

Convert server components that query database:
- Dashboard charts
- Reports components
- Member directory
- Donation lists

### 5.4 Common Query Patterns

**Find Many with Filter:**
```typescript
// Prisma
await prisma.member.findMany({
  where: { churchId, status: 'ACTIVE' },
  orderBy: { lastName: 'asc' },
});

// Drizzle
await db
  .select()
  .from(members)
  .where(and(
    eq(members.churchId, churchId),
    eq(members.status, 'ACTIVE')
  ))
  .orderBy(asc(members.lastName));
```

**Find Unique:**
```typescript
// Prisma
await prisma.church.findUnique({ where: { id } });

// Drizzle
await db
  .select()
  .from(churches)
  .where(eq(churches.id, id))
  .limit(1)
  .then(rows => rows[0]);
```

**Create:**
```typescript
// Prisma
await prisma.donation.create({
  data: { amount, churchId, donorId },
});

// Drizzle
await db.insert(donations).values({
  amount,
  churchId,
  donorId,
});
```

**Update:**
```typescript
// Prisma
await prisma.member.update({
  where: { id },
  data: { email: newEmail },
});

// Drizzle
await db
  .update(members)
  .set({ email: newEmail })
  .where(eq(members.id, id));
```

**Delete:**
```typescript
// Prisma
await prisma.expense.delete({ where: { id } });

// Drizzle
await db
  .delete(expenses)
  .where(eq(expenses.id, id));
```

---

## 📋 Phase 6: Testing (Week 2, Day 5)

### 6.1 Unit Testing

Test each converted function:
- [ ] Church actions
- [ ] Member actions
- [ ] Donation actions
- [ ] Campaign actions
- [ ] Report generation

### 6.2 Integration Testing

Test complete workflows:
- [ ] Member registration flow
- [ ] Donation processing
- [ ] Email campaign creation
- [ ] Report generation
- [ ] Settings updates

### 6.3 Database Testing

```bash
# Test migrations work
npx drizzle-kit push:pg  # Push schema changes

# Test in dev database
DATABASE_URL=$DEV_DB_URL npm run dev

# Verify data integrity
# - Run queries, compare results with Prisma
# - Check relationships load correctly
# - Verify all features work
```

---

## 📋 Phase 7: Deployment (Week 3)

### 7.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Build succeeds locally
- [ ] Migrations reviewed
- [ ] Database backups taken

### 7.2 Deployment Steps

```bash
# 1. Run final migration
npx drizzle-kit push:pg

# 2. Deploy to Vercel
git push origin feat/migrate-to-drizzle

# 3. Test on preview deployment
# Visit preview URL, test all features

# 4. Merge to main
git checkout main
git merge feat/migrate-to-drizzle
git push origin main

# 5. Monitor production
# Watch logs, test features
```

### 7.3 Rollback Plan

If issues occur:
```bash
# Revert deploy
git revert HEAD
git push origin main

# Or restore from backup
# Use LATEST.sql.gz from S3 backups
```

---

## 📋 Phase 8: Cleanup (After Successful Deploy)

### 8.1 Remove Prisma

```bash
# Remove Prisma dependencies
npm uninstall prisma @prisma/client

# Delete Prisma files
rm -rf prisma/
rm -f lib/db.ts
rm -f lib/prisma.ts

# Commit cleanup
git add .
git commit -m "chore: Remove Prisma after Drizzle migration"
```

### 8.2 Update Documentation

- [ ] Update CLAUDE.md (remove Prisma references)
- [ ] Update README.md (Drizzle commands)
- [ ] Remove Prisma workflow docs
- [ ] Add Drizzle best practices

---

## 🎯 Success Criteria

Migration is complete when:
- ✅ All features work in production
- ✅ No Prisma dependencies remain
- ✅ All queries use Drizzle
- ✅ Migrations run successfully
- ✅ No performance regressions
- ✅ Team trained on Drizzle

---

## 🚀 Next Steps: Monorepo Migration

**After Drizzle migration succeeds:**

1. Create `feat/monorepo-with-drizzle` branch
2. Follow Midday structure
3. Extract `@altarflow/database` package (will be trivial now!)
4. Move app to `apps/web/`
5. Add landing page to `apps/landing/`
6. Success! 🎉

---

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Midday GitHub](https://github.com/midday-ai/midday)
- [Migration Guide](https://orm.drizzle.team/docs/migrations)

---

**Created:** November 18, 2025
**Last Updated:** November 18, 2025
**Status:** 🟡 In Progress
