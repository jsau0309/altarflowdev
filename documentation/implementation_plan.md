# Implementation plan

## Phase 1: Environment Setup

1.  **Prevalidation**: Check if the current directory already contains a valid project (e.g., verify package.json or CodeGuide Starter Pro files exist) to avoid reinitialization. *(Project Overview)*
2.  **Install Core Tools**: Ensure Node.js v20.2.1 is installed. If not, install it and verify using `node -v`. *(Tech Stack: Core Tools)*
3.  **Install Next.js 14**: Since the project uses Next.js as the frontend framework, verify that Next.js 14 is installed (this version is optimal with current AI coding tools and LLM models). *(Tech Stack: Frontend)
4.  **Directory Setup**: If not already present, clone the CodeGuide Starter Pro from GitHub into the project directory by clicking "Use Template" on the repository page. *(Project Starter)*
5.  **Cursor IDE Configuration**: Create a `.cursor` directory in the project root if it doesn’t exist. *(IDE: Cursor)
6.  **MCP Setup for Cursor**: Inside `.cursor`, create a file named `mcp.json` if it does not exist, then open it. *(IDE: Cursor)
7.  **Add Supabase MCP Configuration for macOS**: Insert the following JSON configuration into `.cursor/mcp.json` if you are on macOS:

`{ "mcpServers": { "supabase": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-postgres", "<connection-string>"] } } } `*(Tech Stack: Supabase)*

1.  **Alternatively, if on Windows**, use this configuration in the same file:

`{ "mcpServers": { "supabase": { "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"] } } } `*(Tech Stack: Supabase)*

1.  **Display Connection String Link**: Inform the user to retrieve the connection string from [Supabase MCP documentation](https://supabase.com/docs/guides/getting-started/mcp#connect-to-supabase-using-mcp). *(Tech Stack: Supabase)*
2.  **User Action**: After obtaining the connection string, replace all instances of `<connection-string>` in the configuration file with the actual connection string.
3.  **Validation**: Navigate to the Settings/MCP pane in Cursor and verify that Supabase shows a green active status indicating a successful connection. *(IDE: Cursor)*

## Phase 2: Frontend Development

1.  **Language and Theme Setup**: In the Next.js project, install and configure `react-i18next` for bilingual support (English/Spanish) and set up manual language toggles. Edit `/src/i18n.js` to configure translations. *(Project Overview: Bilingual Interface)*
2.  **Styling Setup**: Install Tailwind CSS and Shadcn UI. Configure Tailwind in `tailwind.config.js` and integrate Shadcn UI components. *(Tech Stack: Frontend, Design & Branding)*
3.  **Global Font Setup**: Import the Inter Google Font in `/pages/_app.js` and add global CSS variables for dark/light mode support. *(Design & Branding)*
4.  **Onboarding/Authentication UI**: Create a login page at `/pages/login.js` including language toggle and dark/light mode switch. *(App Flow: Onboarding/Authentication)*
5.  **Dashboard UI**: Create a dashboard page at `/pages/dashboard.js` featuring navigation, notifications, licensing info, and a staff invitation component. *(App Flow: Dashboard)
6.  **NFC Donation Landing Page**: Create a donation landing page component at `/pages/donate.js` optimized for NFC-triggered access. *(Core Features: NFC-Enabled Donations)*
7.  **Expense Management UI**: Create an expense upload and management page at `/pages/expenses.js` featuring receipt upload, detail input fields (amount, category, date, vendor, description), and approval workflow UI. *(Core Features: Expense Management)
8.  **Member Intake Form**: Build a digital intake form ("Connect Cards") at `/pages/members/new.js` with customizable fields to capture member details including preferences and SMS consent. *(Core Features: Member Management)*
9.  **Financial Reporting UI**: Develop a reporting page at `/pages/reports.js` with interactive charts, data filters, and export options (CSV/PDF). *(Core Features: Financial Reporting)
10. **Validation (Frontend)**: Run the application locally using `npm run dev` and verify that language toggles, theming, and page navigations function as expected.

## Phase 3: Backend Development

1.  **Next.js API Routes Setup**: In the `/pages/api` directory, set up API routes using Next.js API Routes for authentication, donation processing, expense management, member data, and financial reporting. *(Tech Stack: Backend)
2.  **Authentication API**: Create `/pages/api/auth/login.js` to handle login with integration for Supabase / Clerk Auth for role-based access. *(Core Features: Onboarding/Authentication)
3.  **Stripe Connect Integration for Donations**: Create `/pages/api/donations/charge.js` to process NFC-triggered Stripe Connect payments and generate digital receipts. *(Core Features: NFC-Enabled Donations)
4.  **Expense Management API**: Create `/pages/api/expenses/index.js` to handle receipt uploads and expense approval workflows. *(Core Features: Expense Management)
5.  **Member Management API**: Create `/pages/api/members/index.js` for intake form submissions and member profile management. *(Core Features: Member Management)
6.  **Financial Reporting API**: Create `/pages/api/reports/index.js` to fetch and filter reporting data (donation trends, expenses by category, income vs expenses, etc.). *(Core Features: Financial Reporting)
7.  **Database Setup with Supabase**: Configure connection to a PostgreSQL database via Supabase. In the project root, create an `.env.local` file and add the Supabase connection string along with any required credentials. *(Tech Stack: Backend, Supabase)
8.  **Prisma ORM Setup**: Install Prisma ORM, initialize with `npx prisma init`, and configure the database connection in `prisma/.env` using the same Supabase connection string. *(Tech Stack: Backend, Prisma ORM)
9.  **Define Database Schema**: In `prisma/schema.prisma`, define tables for Donations, Expenses, Members, and Reports. For example:

*   Donations: id, donor details, amount, timestamp, and receipt data
*   Expenses: id, amount, category, date, vendor, description, approval status
*   Members: id, personal details, address, membership info, communication preferences, sms_consent
*   Reports: (views can be generated via Prisma queries or as virtual tables) *(Core Features: Data Models)*

1.  **Run Prisma Migrations**: Execute `npx prisma migrate dev --name init` to create the database tables in Supabase. *(Tech Stack: Prisma ORM)*
2.  **Integrate Stripe and Twilio Credentials**: In `.env.local`, add API keys for Stripe Connect and Twilio SMS API. *(Core Features: Payments, SMS)*
3.  **Validation (Backend)**: Use Postman or curl to test each API endpoint (e.g., `curl -X POST http://localhost:3000/api/donations/charge`) and verify correct responses.

## Phase 4: Integration

1.  **Connect Frontend to Authentication API**: In `/src/services/auth.js`, add API calls to `/api/auth/login` for login functionality. *(App Flow: Onboarding/Authentication)*
2.  **Integrate Donation Flow**: On the NFC donation landing page (`/pages/donate.js`), integrate an `axios` call to `/api/donations/charge` to process payments and display digital receipts. *(App Flow: NFC Donation Flow)*
3.  **Connect Expense and Member Forms**: In the expense management and member intake forms, add API calls to `/api/expenses` and `/api/members` respectively to submit form data. *(App Flow: Expense & Member Management)
4.  **Integrate Financial Reporting**: On the reporting page, fetch data from `/api/reports` and render interactive charts and filters. *(App Flow: Financial Reporting)
5.  **Enable Role-Based Access**: In the authentication layer (both UI and API), enforce role restrictions so only Admin users (license purchaser) can invite staff members (up to 3). *(Core Features: User Roles & Permissions)
6.  **Validation (Integration)**: Run end-to-end tests by logging in, making a donation, submitting an expense, new member registration, and generating a report. Verify that the responses and UI updates are correct.

## Phase 5: Deployment

1.  **Deploy Frontend and API**: Deploy the Next.js project to Vercel. Ensure that environment variables (Supabase connection string, Stripe and Twilio keys) are set correctly in the Vercel dashboard. *(Deployment: Vercel)
2.  **Database (Supabase) Configuration**: Verify that the Supabase instance is connected and the PostgreSQL database schema has been created as per the Prisma migration. *(Tech Stack: Supabase)
3.  **Configure Webhooks**: Set up necessary webhooks with Stripe (and optionally Twilio) to automate payment processing and SMS notifications. *(Core Features: Payments, SMS)
4.  **Validation (Deployment)**: Once deployed, perform a full end-to-end test of the live application (authentication, donation flow, expense submission, member management, reporting) to ensure that all services work as expected.

*Note: Always check your project directory structure before running initialization steps to avoid redundancy. Additionally, verify each connection and integration through local tests before deployment.*
