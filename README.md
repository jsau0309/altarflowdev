# Altarflow - Bilingual Church Management Platform

A sophisticated, bilingual church management platform tailored for Hispanic churches in the United States. It modernizes traditional church administration by integrating digital tools with conventional methods, enabling efficient donation tracking, expense management, and member relationship nurturing—ideal for users with varied technological proficiency.

Built upon the CodeGuide Starter Pro template.

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Database:** [Supabase](https://supabase.com/) (Postgres)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Payments:** [Stripe Connect](https://stripe.com/connect) (To be integrated)
- **SMS:** [Twilio](https://www.twilio.com/) (To be integrated)
- **Internationalization:** [react-i18next](https://react.i18next.com/) (To be integrated)

## Project Status

- **Initial Setup:** Complete (Next.js 14, TypeScript, Tailwind, shadcn/ui).
- **Database Setup:** Prisma schema defined, connected to Supabase database.
- **Migrations:** Initial Prisma migration applied. Supabase migrations applied for RLS and Storage policies.
- **Core Features:**
    - Member management UI (List, Details Drawer, Edit Form) is functional.
    - Basic multi-tenancy via RLS is implemented.
- **Code Migration:** UI components and structure from the Vizero project integrated.
- **Layout:** Main dashboard layout implemented (`app/(dashboard)/layout.tsx`).
- **Current Phase:** Backend integration for other features (Donations, Expenses, etc.) and frontend refinement.

## Prerequisites

Before you begin, ensure you have the following:
- Node.js 20+ installed
- A package manager (npm, yarn, or pnpm)
- A [Supabase](https://supabase.com/) account for the database
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in (`supabase login`)
- A [Clerk](https://clerk.com/) account (for future authentication integration)
- A [Stripe](https://stripe.com/) account (for future payments integration)
- A [Twilio](https://www.twilio.com/) account (for future SMS integration)

## Getting Started

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd altarflowdev
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

3.  **Link Supabase Project** (if not already linked)
    ```bash
    supabase link --project-ref <your-project-ref>
    ```
    *Replace `<your-project-ref>` with your actual Supabase project reference ID.* 

4.  **Environment Variables Setup**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Create `prisma/.env` if it doesn't exist.
    *   Fill in the necessary variables in both `.env` (for frontend Supabase keys, Clerk, etc.) and `prisma/.env` (for `DATABASE_URL`, `DIRECT_URL`) based on the Configuration section.

5.  **Database Setup**
    *   Ensure your Supabase database connection strings are correct in `prisma/.env`.
    *   Apply Prisma migrations (creates table structure):
        ```bash
        npx prisma migrate dev
        ```
        *(Note: If running for the first time after cloning a project with existing migrations, `migrate dev` will apply them. Use `prisma migrate reset` in development *only* if you need to wipe and recreate the DB, **this causes data loss**.)*
    *   Apply Supabase migrations (applies RLS, functions, storage policies, etc.):
        ```bash
        supabase db push
        ```

6.  **Start the development server**
    ```bash
    npm run dev
    # or yarn dev / pnpm dev
    ```

7.  **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Configuration

### Supabase Setup
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project (if you haven't).
3. Go to Project Settings > API.
4. Obtain `Project URL` and `anon` public key for `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
5. Go to Project Settings > Database > Connection string.
6. Copy the **URI** (using the Transaction pooler) and add it to `prisma/.env` as `DATABASE_URL`.
7. Copy the **Direct connection** string and add it to `prisma/.env` as `DIRECT_URL` (used by Prisma Migrate).

### Clerk Setup (Future)
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application.
3. Go to API Keys.
4. Obtain `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for `.env`.

### Stripe Connect Setup (Future)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Configure Stripe Connect settings.
3. Get your API keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) for `.env`.

### Twilio Setup (Future)
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Obtain Account SID, Auth Token, and a Twilio phone number for `.env`.

## Environment Variables

### `.env` (Root Directory)
```env
# Clerk Authentication (Required Later)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase Frontend Keys
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe Connect (Required Later)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio (Required Later)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### `prisma/.env`
```env
# Supabase Database Connection Strings
# Use Pooler (Transaction Mode) for general application access
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-DB-HOST]:6543/postgres?pgbouncer=true"
# Use Direct Connection for migrations
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-DB-HOST]:5432/postgres"
```
*Replace placeholders with your actual Supabase DB credentials.* 

## Database Migration Workflow

This project uses a hybrid approach for database migrations:

1.  **Prisma (`prisma/migrations`)**: Used for managing the core **database schema** (tables, columns, relations, indexes).
    *   Define schema in `prisma/schema.prisma`.
    *   Generate migrations: `npx prisma migrate dev --name <migration_name>` (Development only)
    *   Apply migrations: `npx prisma migrate deploy` (Production)
2.  **Supabase CLI (`supabase/migrations`)**: Used for managing **RLS policies, database functions, triggers, storage policies,** and other Supabase-specific configurations not handled well by Prisma.
    *   Create new migration files: `supabase migration new <migration_name>`.
    *   Write SQL for policies, functions, etc., in the generated file.
    *   Apply migrations: `supabase db push` (Applies pending migrations to linked DB).

**Important:**
*   Avoid defining table structures in Supabase migrations if they are managed by Prisma.
*   If a Supabase migration alters table structure, run `npx prisma db pull` followed by `npx prisma generate` to update the Prisma schema.
*   **Never** run `prisma migrate reset` in production (causes data loss).
*   Always back up production before applying any migrations.

## Project Structure

```
altarflowdev/
├── app/                  # Next.js App Router (routes, layouts, pages)
│   ├── (auth)/           # Auth-related routes
│   ├── (dashboard)/      # Protected dashboard routes
│   ├── api/              # API Route Handlers
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Root page
├── components/           # Shared React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout-specific components
│   ├── modals/           # Modal dialog components
│   └── ...               # Feature-specific components
├── lib/                  # Libraries, utilities, types
├── public/               # Static assets
├── documentation/        # Project documentation
├── prisma/               # Prisma ORM configuration
│   ├── schema.prisma     # Database schema definition
│   ├── migrations/       # Prisma-managed SQL migration files
│   └── .env              # Prisma DB connection strings (gitignored)
├── supabase/             # Supabase CLI configuration
│   ├── migrations/       # Supabase CLI-managed SQL files (RLS, functions, etc.)
│   └── config.toml       # Supabase CLI config
├── .env                  # Local environment variables (gitignored)
├── .env.example          # Example environment variables
├── next.config.mjs       # Next.js configuration
├── package.json          # Project dependencies
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Contributing

