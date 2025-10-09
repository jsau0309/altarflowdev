PRD1: Foundations - Saint V1

a. Purpose

This phase establishes the foundational administrative capabilities of Saint V1. It introduces concrete CRUD operations and basic workflow automation for core church management needs. This PRD lays the groundwork for Saint to evolve into a full operational agent in later phases.

Goals
	•	Implement all basic data entry and tracking systems: Donations, Expenses, Members, Forms.
	•	Establish reliable task execution logic for simple workflows.
	•	Set up placeholders for intelligent planning and communication components.

Out of Scope
	•	Intelligent follow-up questions
	•	Automated task planning or Claude-style workflows
	•	Report generation (PDF)
	•	Email automation
	•	Multi-turn context memory

b. In-Scope Features

1. Donation Management
	•	Add donations
	•	Create donor profiles
	•	Link donations to fundraising campaigns

2. Expense Tracking
	•	Add and categorize expenses
	•	Upload and OCR receipts
	•	Track budgets by category

3. Member Management
	•	Add members and visitors
	•	Edit member profiles
	•	Schedule follow-ups manually
	•	Update member statuses

4. Forms and Workflow Integration
	•	Create custom intake forms
	•	Generate form links
	•	View and analyze form submissions

c. Out-of-Scope Features
	•	Task planning or breakdown (will be in PRD2)
	•	Smart follow-up questions (PRD2)
	•	PDF reports (PRD3)
	•	Email delivery (PRD3)
	•	Conversation context persistence (PRD4)

d. Placeholders
	•	SmartTaskPlanner
// Placeholder: Replaced in PRD2 for task breakdown and follow-ups
	•	EmailWorkflowEngine
// Placeholder: Replaced in PRD3 for email-based sequences
	•	ReportGenerator
// Placeholder: Replaced in PRD3 for PDF generation
	•	PersistentContextManager
// Placeholder: Replaced in PRD4 for memory/context management

e. User Flow

User: "Add the Smith family who visited last Sunday"
Saint:
✔ Adds family profile to database
✔ Schedules follow-up manually in UI
✔ Logs contact info and visit notes

User: "Enter $250 donation from Janet Lee for youth campaign"
Saint:
✔ Creates donor profile for Janet Lee
✔ Links donation to "Youth Campaign"
✔ Adds donation record and updates total raised

f. Deliverables
	•	Fully working CRUD interface for Donations, Expenses, Members, Forms
	•	Backend integration with AltarFlow Supabase schema
	•	Basic workflows for donation entry, follow-up scheduling, and expense categorization
	•	Working form creation and analytics dashboard
	•	Placeholder stubs for PRD2–PRD4 components

g. Handoff Contract

Next phase (PRD2) will:
	•	Replace SmartTaskPlanner with real follow-up logic and task previews
	•	Introduce conversational task lists and Claude-style breakdowns
	•	Leave ReportGenerator, EmailWorkflowEngine, and PersistentContextManager unchanged but intact
	•	Adhere to the Meta-PRD Replacement Rule for all placeholder components

h. Contextual Notes (Transcript Fidelity)
	•	Ensure Saint mimics human administrative behavior (e.g., “A few questions before I proceed…”)
	•	Workflows must feel natural and speak in church-relevant terminology
	•	Integrations: Supabase (data), Resend (email, in future), LangGraph (workflow engine)
	•	Execution confirmation model: preview before execution, status updates after

i. User Verification Steps
	•	Can a user:
	•	Add a member or visitor and edit their details?
	•	Add a donation and link it to a donor and campaign?
	•	Submit and analyze a form response?
	•	Upload a receipt and see it categorized correctly?
	•	Are the four core systems stable and testable in isolation?
	•	Are placeholder comments clearly marked for PRD2-PRD4 replacement?

This phase is complete when the above systems are functioning and integrated, and users can verify CRUD reliability across all four modules.

j. Suggested Tech Stack

Backend
	•	Language: TypeScript (Node.js)
	•	Database: Supabase (PostgreSQL + Auth)
	•	ORM: Prisma

Frontend
	•	Framework: Next.js (React-based)
	•	State Management: React Context or Zustand
	•	Forms: React Hook Form + Zod (for validation)
	•	Styling: Tailwind CSS

AI Integration
	•	Model Access: Claude Sonnet 4 via API
	•	Orchestration: LangGraph for multi-step workflows
	•	Memory/State: Supabase or Redis for temporary state tracking

Other Integrations
	•	Email (future): Resend
	•	File Processing: UploadThing or similar (for receipts), OCR.space or Tesseract.js
	•	PDF (future): react-pdf or Puppeteer