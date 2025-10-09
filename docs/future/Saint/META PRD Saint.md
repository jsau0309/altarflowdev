Meta-PRD: Saint V1 - AI Church Administrator

1. Purpose of the Meta-PRD
This Meta-PRD defines the architecture, authority, and phased roadmap for building Saint V1, an AI-
powered Church Administrator designed to automate routine church operations and serve as a
conversational AI staff member. This document:

Establishes the overarching product vision and phased development plan.
Defines global naming, placeholder, and replacement rules.
Prevents orphaned and prior-art problems.
Anchors future phase PRDs to transcript-level fidelity, preserving user context and vision.
Each PRD (PRD1, PRD2, etc.) inherits scope, naming, and replacement rules from this Meta-PRD.

2. Chain of Authority

This Meta-PRD governs all subsequent PRDs.
Phase PRDs (e.g. PRD1: Foundations) must:
Implement features strictly within defined scope.
Use consistent placeholder names.
Replace placeholders in later phases per the Replacement Rule.
Preserve nuance, ideas, and exploratory intentions as Contextual Notes.

3. Rules Defined in the Meta-PRD

Naming Rule: Consistent names for all components across phases (e.g., DonationEntryModule,
FormWorkflowEngine ).
Replacement Rule: All placeholder components must be fully replaced in later phases.
Deprecation Comments: Every placeholder must be marked with a replacement note.
Transcript Fidelity Rule: Retain original user ideas and exploratory intentions in all phase PRDs.

4. Product Vision (from Transcript)
Saint evolves from a read-only assistant to a full AI church administrator that performs multi-step
workflows, asks clarifying questions, and executes tasks with minimal supervision.
"Instead of just fetching data and answering questions, Saint performs actual
administrative tasks."

Saint blends natural language processing with backend automation to become a reliable AI team member
for church operations.

5. Phased Roadmap

- PRD1: Foundations (CRUD + Basic Workflows)

Donations: Add, categorize, link to campaigns
Expenses: Capture + categorize
Members: Add + update profiles
Forms: Create + link workflows
Includes stable placeholders for smart logic, follow-up interactions, email, and PDF generation.

- PRD2: Intelligence Layer

Follow-up questioning (contextual clarification)
Task planning via "Claude Code style" workflows
Conversation memory + preference awareness
Replace placeholder: SmartTaskPlanner

- PRD3: Reporting & Automation

Generate PDF reports
Email distribution & scheduling
Automated sequences (e.g., thank yous, notifications)
Replace: ReportGenerator, EmailWorkflowEngine

- PRD4: Advanced Context & Query AI

High-context query resolution
Recall preferences, past interactions
Replace: PersistentContextManager

- Placeholder Index

The following components will appear as placeholders in early PRDs and be replaced in later phases:
SmartTaskPlanner → Replaced in PRD2
EmailWorkflowEngine → Replaced in PRD3
ReportGenerator → Replaced in PRD3
PersistentContextManager → Replaced in PRD4
All must include deprecation comments in the original PRD where introduced.

7. Transcript Fidelity Notes (Carried Across PRDs)

Saint must simulate a conversational team member (e.g., "I'll add the Smith family! A few
questions:")
Interaction follows: User Request → Follow-up → Task List Preview → Approval →
Execution → Updates
Claude-style task planning (e.g., numbered steps with check-ins)
Integrates with AltarFlow backend (Supabase/Prisma) and Resend for email
Uses LangGraph orchestration + persistent memory
These notes must remain visible in each phase PRD until fully implemented.

8. Final Notes
This Meta-PRD anchors all future development of Saint V1. All implementation phases must:

Stay within the scoped features per PRD
Replace all placeholders explicitly
Maintain fidelity to original vision and interaction design
Use this Meta-PRD as the governing authority for all decisions