[![CodeGuide](/codeguide-backdrop.svg)](https://codeguide.dev)


# Altarflow - Bilingual Church Management Platform

A sophisticated, bilingual church management platform tailored for Hispanic churches in the United States. It modernizes traditional church administration by integrating digital tools with conventional methods, enabling efficient donation tracking, expense management, and member relationship nurturing—ideal for users with varied technological proficiency.

Built upon the CodeGuide Starter Pro template.

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Authentication:** [Clerk](https://clerk.com/) (To be integrated)
- **Database:** [Supabase](https://supabase.com/) (via Prisma ORM - To be integrated)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Payments:** [Stripe Connect](https://stripe.com/connect) (To be integrated)
- **SMS:** [Twilio](https://www.twilio.com/) (To be integrated)
- **Internationalization:** [react-i18next](https://react.i18next.com/) (To be integrated)
- **Mock Data:** [@faker-js/faker](https://fakerjs.dev/) (for UI development)

## Project Status

- **Initial Setup:** Complete (Next.js 14, TypeScript, Tailwind, shadcn/ui).
- **Code Migration:** UI components and structure from the Vizero project have been integrated.
- **Layout:** Main dashboard layout uses Next.js App Router file-system conventions (`app/(dashboard)/layout.tsx`).
- **Error Resolution:** Build errors from the code migration have been addressed.
- **Mock Data:** Basic mock data service implemented in `lib/mock-data.ts` for Expenses and Members.
- **Placeholders:** Report generation functions exist as placeholders in `lib/report-generators.ts`.
- **Current Phase:** Frontend UI refinement and testing (Phase 2 of Implementation Plan).

## Prerequisites

Before you begin, ensure you have the following:
- Node.js 20+ installed (as recommended by Implementation Plan)
- A [Clerk](https://clerk.com/) account for authentication
- A [Supabase](https://supabase.com/) account for database
- A [Stripe](https://stripe.com/) account (specifically for Stripe Connect)
- A [Twilio](https://www.twilio.com/) account for SMS (optional, if implementing SMS features)
- Project documentation (like `implementation_plan.md`) available for reference.

## Getting Started

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <repository-url>
   cd altarflowdev # Or your project directory name
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Install Development Dependencies** (if needed, e.g., after cloning)
   ```bash
   npm install @faker-js/faker --save-dev
   ```

4. **Environment Variables Setup**
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in the environment variables in `.env` for services like Clerk, Supabase, Stripe, Twilio as you integrate them (see Configuration section below - *Note: Integration pending*).

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.** (Currently redirects to `/dashboard`).

## Configuration (Integration Pending)

Configuration details for Clerk, Supabase, Stripe Connect, and Twilio will be required during backend integration (Phase 3 & 4).

### Clerk Setup (Future)
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Go to API Keys
4. Obtain `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for `.env`.

### Supabase Setup (Future)
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Go to Project Settings > API
4. Obtain `Project URL` and `anon` public key for `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
5. Obtain the **Database Connection String** (Pooler) for Prisma configuration (`DATABASE_URL` in `prisma/.env`).

### Stripe Connect Setup (Future)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Configure Stripe Connect settings.
3. Get your API keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) for `.env`.

### Twilio Setup (Future)
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Obtain Account SID, Auth Token, and a Twilio phone number for `.env`.

## Environment Variables (.env)

```env
# Clerk Authentication (Required Later)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase (Required Later for Data)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Note: DATABASE_URL for Prisma goes in prisma/.env

# Stripe Connect (Required Later for Payments)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio (Required Later for SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## Project Structure

```
altarflowdev/
├── app/                  # Next.js App Router (routes, layouts, pages)
│   ├── (auth)/           # Auth-related routes (sign-in, sign-up)
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── dashboard/    # Specific dashboard page
│   │   ├── donations/    # Donations page
│   │   └── ...           # Other dashboard sections
│   ├── api/              # API Route Handlers (future)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Root page (redirects to /dashboard)
├── components/           # Shared React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout-specific components (e.g., Sidebar)
│   ├── modals/           # Modal dialog components
│   └── ...               # Feature-specific components
├── lib/                  # Libraries, utilities, types
│   ├── mock-data.ts      # Mock data service for UI dev
│   ├── report-generators.ts # Placeholder report functions
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions (e.g., cn)
├── public/               # Static assets
├── styles/               # (Not typically used with App Router/Tailwind)
├── documentation/        # Project documentation (e.g., implementation_plan.md)
├── prisma/               # Prisma ORM schema and config (future)
├── supabase/             # Supabase config/migrations (if not using Prisma)
├── .env                  # Local environment variables (gitignored)
├── .env.example          # Example environment variables
├── next.config.mjs       # Next.js configuration
├── package.json          # Project dependencies
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
